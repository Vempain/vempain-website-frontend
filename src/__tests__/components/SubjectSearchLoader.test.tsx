import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals';
import {act, type ReactElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import {SubjectSearchLoader} from '../../components/SubjectSearchLoader';
import {AuthProvider} from '../../context';
import {subjectSearchAPI} from '../../services';
import type {SubjectSearchResponse, WebSiteFile} from '../../models';

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

const emptyPage = <T, >() => ({content: [] as T[], page: 0, size: 25, total_elements: 0, total_pages: 0, first: true, last: true, empty: true});

const filesPage = (content: WebSiteFile[], page: number, last: boolean): SubjectSearchResponse => ({
    pages: emptyPage(), galleries: emptyPage(),
    files: {content, page, size: 2, total_elements: 4, total_pages: 2, first: page === 0, last, empty: content.length === 0},
});

describe('SubjectSearchLoader', () => {
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

    function remount() {
        act(() => root.unmount());
        root = createRoot(container);
    }

    async function settle() {
        await act(async () => {
            await new Promise((resolve) => window.setTimeout(resolve, 5));
        });
    }

    function moreButton(): HTMLButtonElement | undefined {
        return Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('Lataa lisää'));
    }

    it('shows the spinner while the search runs', async () => {
        jest.mocked(subjectSearchAPI.searchByIds).mockReturnValue(new Promise(() => undefined));
        render(<SubjectSearchLoader subjectIdList={[1]}/>);
        await settle();
        expect(container.querySelector('.ant-spin')).not.toBeNull();
        expect(container.textContent).not.toContain('Ei hakutuloksia');
    });

    it('shows no results when the search answers with nothing or fails', async () => {
        jest.mocked(subjectSearchAPI.searchByIds).mockResolvedValueOnce(null as never);
        render(<SubjectSearchLoader subjectIdList={[1]}/>);
        await settle();
        expect(container.textContent).toContain('Ei hakutuloksia');

        jest.mocked(subjectSearchAPI.searchByIds).mockRejectedValueOnce(new Error('offline'));
        remount();
        render(<SubjectSearchLoader subjectIdList={[2]}/>);
        await settle();
        expect(consoleError).toHaveBeenCalledWith('Subject search failed:', expect.any(Error));
        expect(container.textContent).toContain('Ei hakutuloksia');
    });

    it('ignores results that arrive after unmounting', async () => {
        let resolveSearch: (value: SubjectSearchResponse) => void = () => undefined;
        jest.mocked(subjectSearchAPI.searchByIds).mockReturnValueOnce(new Promise((resolve) => {
            resolveSearch = resolve;
        }));
        render(<SubjectSearchLoader subjectIdList={[3]}/>);
        await settle();
        remount();
        await act(async () => {
            resolveSearch(filesPage([file(1)], 0, true));
            await Promise.resolve();
        });
        expect(container.querySelector('[data-testid="gallery-grid"]')).toBeNull();
    });

    it('loads further file pages, stops at a missing page and survives a failing one', async () => {
        jest.mocked(subjectSearchAPI.searchByIds)
                .mockResolvedValueOnce(filesPage([file(1), file(2)], 0, false))
                .mockResolvedValueOnce(filesPage([file(3), file(4)], 1, false))
                .mockRejectedValueOnce(new Error('offline'))
                .mockResolvedValueOnce({pages: emptyPage(), galleries: emptyPage()} as never);
        render(<SubjectSearchLoader subjectIdList={[4]}/>);
        await settle();
        expect(container.querySelectorAll('[data-testid="gallery-grid"] img')).toHaveLength(2);

        act(() => moreButton()!.click());
        await settle();
        expect(subjectSearchAPI.searchByIds).toHaveBeenLastCalledWith({subject_ids: [4], page: 1, size: 2});
        expect(container.querySelectorAll('[data-testid="gallery-grid"] img')).toHaveLength(4);

        act(() => moreButton()!.click());
        await settle();
        expect(consoleError).toHaveBeenCalledWith('Error fetching additional files:', expect.any(Error));
        expect(container.querySelectorAll('[data-testid="gallery-grid"] img')).toHaveLength(4);

        act(() => moreButton()!.click());
        await settle();
        expect(container.querySelectorAll('[data-testid="gallery-grid"] img')).toHaveLength(4);
        expect(moreButton()).toBeUndefined();
    });
});
