import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals';
import {act, type ReactElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import {GalleryLoader} from '../../components/GalleryLoader';
import {AuthProvider} from '../../context';
import {galleryAPI} from '../../services';
import type {WebSiteFile} from '../../models';

class ResizeObserverMock {
    observe() {
    }

    unobserve() {
    }

    disconnect() {
    }
}

Object.defineProperty(globalThis, 'ResizeObserver', {value: ResizeObserverMock});

const file = (id: number): WebSiteFile => ({
    id, file_id: id, acl_id: null, file_path: `images/${id}.jpg`, mimetype: 'image/jpeg', original_date_time: null, subjects: [],
});

const pageOf = (content: WebSiteFile[], page: number, last: boolean) => ({
    content, page, size: 2, total_elements: 4, total_pages: 2, first: page === 0, last, empty: content.length === 0,
});

describe('GalleryLoader', () => {
    let container: HTMLDivElement;
    let root: Root;
    let consoleError: ReturnType<typeof jest.spyOn>;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        jest.clearAllMocks();
        consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        consoleError.mockRestore();
    });

    function render(ui: ReactElement) {
        act(() => root.render(<MemoryRouter><AuthProvider>{ui}</AuthProvider></MemoryRouter>));
    }

    async function settle() {
        await act(async () => {
            await new Promise((resolve) => window.setTimeout(resolve, 5));
        });
    }

    function moreButton(): HTMLButtonElement | undefined {
        return Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('Lataa lisää'));
    }

    it('appends the next page and hides the button after the last page', async () => {
        jest.mocked(galleryAPI.getGalleryFiles)
                .mockResolvedValueOnce(pageOf([file(1), file(2)], 0, false))
                .mockResolvedValueOnce(pageOf([file(3), file(4)], 1, true));
        render(<GalleryLoader galleryId={3} title="Trip"/>);
        await settle();
        expect(container.textContent).toContain('Trip');
        expect(container.querySelectorAll('[data-testid="gallery-grid"] img')).toHaveLength(2);

        act(() => moreButton()!.click());
        await settle();
        expect(galleryAPI.getGalleryFiles).toHaveBeenLastCalledWith(3, {page: 1, size: 2});
        expect(container.querySelectorAll('[data-testid="gallery-grid"] img')).toHaveLength(4);
        expect(moreButton()).toBeUndefined();
    });

    it('keeps the loaded files when the next page is missing or fails', async () => {
        jest.mocked(galleryAPI.getGalleryFiles)
                .mockResolvedValueOnce(pageOf([file(1), file(2)], 0, false))
                .mockResolvedValueOnce(undefined as never)
                .mockRejectedValueOnce(new Error('offline'));
        render(<GalleryLoader galleryId={3}/>);
        await settle();

        act(() => moreButton()!.click());
        await settle();
        expect(container.querySelectorAll('[data-testid="gallery-grid"] img')).toHaveLength(2);
        expect(moreButton()).toBeDefined();

        act(() => moreButton()!.click());
        await settle();
        expect(consoleError).toHaveBeenCalledWith('Error fetching updates to gallery files:', expect.any(Error));
        expect(container.querySelectorAll('[data-testid="gallery-grid"] img')).toHaveLength(2);
        expect(container.querySelector('.ant-spin-blur')).toBeNull();
    });

    it('shows the empty state when the first page is missing or fails to load', async () => {
        jest.mocked(galleryAPI.getGalleryFiles).mockResolvedValueOnce(undefined as never);
        render(<GalleryLoader galleryId={5}/>);
        await settle();
        expect(container.textContent).toContain('Gallery #5');
        expect(container.textContent).toContain('No images');
        expect(container.querySelector('.ant-spin-blur')).toBeNull();

        jest.mocked(galleryAPI.getGalleryFiles).mockRejectedValueOnce(new Error('offline'));
        act(() => root.unmount());
        root = createRoot(container);
        render(<GalleryLoader galleryId={6}/>);
        await settle();
        expect(consoleError).toHaveBeenCalledWith('Error fetching gallery files:', expect.any(Error));
        expect(container.textContent).toContain('No images');
    });

    it('ignores a first page that arrives after unmounting', async () => {
        let resolveFiles: (value: ReturnType<typeof pageOf>) => void = () => undefined;
        jest.mocked(galleryAPI.getGalleryFiles).mockReturnValueOnce(new Promise((resolve) => {
            resolveFiles = resolve;
        }));
        render(<GalleryLoader galleryId={7}/>);
        await settle();
        expect(galleryAPI.getGalleryFiles).toHaveBeenCalledTimes(1);
        act(() => root.unmount());
        root = createRoot(container);
        await act(async () => {
            resolveFiles(pageOf([file(1)], 0, true));
            await Promise.resolve();
        });
        expect(container.querySelectorAll('[data-testid="gallery-grid"] img')).toHaveLength(0);
    });
});
