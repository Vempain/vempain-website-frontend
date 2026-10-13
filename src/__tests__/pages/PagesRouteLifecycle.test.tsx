import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals';
import {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {MemoryRouter, Route, Routes} from 'react-router-dom';
import {PagesRoute} from '../../pages/PagesRoute';
import {pageAPI} from '../../services';
import type {ApiResponse, WebSitePage} from '../../models';

class ResizeObserverMock {
    observe() {
    }

    unobserve() {
    }

    disconnect() {
    }
}

Object.defineProperty(globalThis, 'ResizeObserver', {value: ResizeObserverMock});

const page: WebSitePage = {
    id: 1, page_id: 1, title: 'Late page', file_path: 'docs/late', header: 'Header', body: 'body', page_style: null, secure: false,
    acl_id: null, creator: 'alice', created: null, subjects: [],
};

type PageResponse = ApiResponse<WebSitePage>;
type PagesResponse = Awaited<ReturnType<typeof pageAPI.getPublicPages>>;

function deferred<T>() {
    let resolve: (value: T) => void = () => undefined;
    let reject: (reason: Error) => void = () => undefined;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return {promise, resolve, reject};
}

describe('PagesRoute lifecycle', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        jest.clearAllMocks();
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
    });

    function render(entry: string) {
        act(() => root.render(
                <MemoryRouter initialEntries={[entry]}><Routes><Route path="/pages/*" element={<PagesRoute/>}/></Routes></MemoryRouter>
        ));
    }

    function remount() {
        act(() => root.unmount());
        root = createRoot(container);
    }

    async function flush() {
        await act(async () => {
            await new Promise((resolve) => window.setTimeout(resolve, 5));
        });
    }

    it('ignores a page that arrives after unmounting', async () => {
        const content = deferred<PageResponse>();
        jest.mocked(pageAPI.getPageContent).mockReturnValue(content.promise);
        render('/pages/docs/late');
        expect(container.querySelector('.ant-spin')).not.toBeNull();
        remount();
        await act(async () => {
            content.resolve({data: page});
            await Promise.resolve();
        });
        expect(container.textContent).toBe('');
    });

    it('ignores a directory listing that arrives after unmounting', async () => {
        const listing = deferred<PagesResponse>();
        jest.mocked(pageAPI.getPageContent).mockResolvedValue({status: 404});
        jest.mocked(pageAPI.getPublicPages).mockReturnValue(listing.promise);
        render('/pages/docs/index');
        await flush();
        expect(pageAPI.getPublicPages).toHaveBeenCalledWith({directory: 'docs', page: 0, size: 12});
        remount();
        await act(async () => {
            listing.resolve({data: {content: [page], page: 0, size: 12, total_elements: 1, total_pages: 1, first: true, last: true, empty: false}});
            await Promise.resolve();
        });
        expect(container.textContent).toBe('');
    });

    it('ignores a failure that arrives after unmounting', async () => {
        const content = deferred<PageResponse>();
        jest.mocked(pageAPI.getPageContent).mockReturnValue(content.promise);
        render('/pages/docs/late');
        remount();
        await act(async () => {
            content.reject(new Error('late failure'));
            await Promise.resolve();
        });
        expect(container.textContent).toBe('');
    });

    it('treats an empty page path as the index page', async () => {
        jest.mocked(pageAPI.getPageContent).mockResolvedValue({data: {...page, title: 'Front page'}});
        render('/pages/');
        await flush();
        expect(pageAPI.getPageContent).toHaveBeenCalledWith('index');
        expect(container.textContent).toContain('Front page');
    });

    it('lists fallback pages without a path under the index and reports a missing directory listing as not found', async () => {
        jest.mocked(pageAPI.getPageContent).mockResolvedValue({status: 404});
        jest.mocked(pageAPI.getPublicPages).mockResolvedValue({
            data: {
                content: [{...page, file_path: undefined, path: undefined, published: '2024-05-01T10:00:00'}],
                page: 0, size: 12, total_elements: 1, total_pages: 1, first: true, last: true, empty: false,
            },
        });
        render('/pages/docs/index');
        await flush();
        expect(container.textContent).toContain('Latest Pages');
        expect(container.querySelector('a')?.getAttribute('href')).toBe('/pages/index');

        jest.mocked(pageAPI.getPublicPages).mockResolvedValue({data: undefined});
        remount();
        render('/pages/docs/index');
        await flush();
        expect(container.textContent).toContain('Page not found');
    });

    it('shows the backend error for a failed request with a status and a generic one for an unknown rejection', async () => {
        jest.mocked(pageAPI.getPageContent).mockResolvedValue({error: 'Backend exploded', status: 500});
        render('/pages/docs/broken');
        await flush();
        expect(container.textContent).toContain('Backend exploded');

        jest.mocked(pageAPI.getPageContent).mockRejectedValue('not an error object');
        remount();
        render('/pages/docs/broken');
        await flush();
        expect(container.textContent).toContain('Failed to load page');
    });
});
