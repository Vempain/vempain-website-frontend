import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals';
import {act, type ReactElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {MemoryRouter, Route, Routes} from 'react-router-dom';
import {GalleriesRoute} from '../../pages/GalleriesRoute';
import {SearchRoute} from '../../pages/SearchRoute';
import {AuthProvider} from '../../context';
import {galleryAPI, subjectSearchAPI} from '../../services';

class ResizeObserverMock {
    observe() {
    }

    unobserve() {
    }

    disconnect() {
    }
}

Object.defineProperty(globalThis, 'ResizeObserver', {value: ResizeObserverMock});

describe('GalleriesRoute and SearchRoute', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        jest.clearAllMocks();
        jest.mocked(galleryAPI.getGalleryFiles).mockResolvedValue({
            content: [], page: 0, size: 25, total_elements: 0, total_pages: 0, first: true, last: true, empty: true,
        });
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
    });

    function render(ui: ReactElement, entry = '/') {
        act(() => root.unmount());
        root = createRoot(container);
        act(() => root.render(<MemoryRouter initialEntries={[entry]}><AuthProvider>{ui}</AuthProvider></MemoryRouter>));
    }

    async function settle() {
        await act(async () => {
            await new Promise((resolve) => window.setTimeout(resolve, 5));
        });
    }

    it('shows the empty state when the gallery list has no data or fails', async () => {
        jest.mocked(galleryAPI.getPublicGalleries).mockResolvedValue({data: undefined});
        render(<GalleriesRoute/>);
        await settle();
        expect(container.textContent).toContain('No galleries');

        jest.mocked(galleryAPI.getPublicGalleries).mockRejectedValue(new Error('offline'));
        render(<GalleriesRoute/>);
        await settle();
        expect(container.textContent).toContain('No galleries');
        expect(container.querySelector('.ant-spin')).toBeNull();
    });

    it('lists galleries with their names, descriptions and files', async () => {
        jest.mocked(galleryAPI.getPublicGalleries).mockResolvedValue({
            data: [
                {id: 1, gallery_id: 11, shortname: 'Trip', description: 'Summer trip', subjects: []},
                {id: 2, gallery_id: 12, shortname: null, description: null, subjects: []},
            ],
        });
        render(<GalleriesRoute/>);
        await settle();
        // The gallery loaders mount with the list and fetch their first page on a timer of their own.
        await settle();
        const links = Array.from(container.querySelectorAll('a')).map((link) => [link.textContent, link.getAttribute('href')]);
        expect(links).toEqual([['Trip', '/galleries/11'], ['Gallery #12', '/galleries/12']]);
        expect(container.textContent).toContain('Summer trip');
        expect(container.textContent).toContain('No description available');
        expect(galleryAPI.getGalleryFiles).toHaveBeenCalledWith(11, {page: 0, size: 25});
        expect(galleryAPI.getGalleryFiles).toHaveBeenCalledWith(12, {page: 0, size: 25});
    });

    it('ignores a gallery list that arrives after unmounting', async () => {
        let resolveGalleries: (value: { data: never[] }) => void = () => undefined;
        jest.mocked(galleryAPI.getPublicGalleries).mockReturnValue(new Promise((resolve) => {
            resolveGalleries = resolve;
        }));
        render(<GalleriesRoute/>);
        expect(container.querySelector('.ant-spin')).not.toBeNull();
        act(() => root.unmount());
        root = createRoot(container);
        await act(async () => {
            resolveGalleries({data: []});
            await Promise.resolve();
        });
        expect(container.textContent).toBe('');

        let rejectGalleries: (reason: Error) => void = () => undefined;
        jest.mocked(galleryAPI.getPublicGalleries).mockReturnValue(new Promise((_resolve, reject) => {
            rejectGalleries = reject;
        }));
        render(<GalleriesRoute/>);
        act(() => root.unmount());
        root = createRoot(container);
        await act(async () => {
            rejectGalleries(new Error('late'));
            await Promise.resolve();
        });
        expect(container.textContent).toBe('');
    });

    it('searches nothing without a subjects parameter and parses a mixed list', async () => {
        render(<Routes><Route path="/search" element={<SearchRoute/>}/></Routes>, '/search');
        await settle();
        expect(subjectSearchAPI.searchByIds).not.toHaveBeenCalled();
        expect(container.textContent).toContain('Ei hakutuloksia');

        render(<Routes><Route path="/search" element={<SearchRoute/>}/></Routes>, '/search?subjects=%203%2C-1%2C2.5%2C7');
        await settle();
        expect(subjectSearchAPI.searchByIds).toHaveBeenCalledWith({subject_ids: [3, 7], page: 0, size: 25});
    });
});
