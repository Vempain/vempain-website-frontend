import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals';
import {act, type ReactElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {MemoryRouter, Route, Routes} from 'react-router-dom';
import {GalleriesRoute} from '../../pages/GalleriesRoute';
import {GalleryRoute} from '../../pages/GalleryRoute';
import {PagesRoute} from '../../pages/PagesRoute';
import {SearchRoute} from '../../pages/SearchRoute';
import {SubjectSearchLoader} from '../../components/SubjectSearchLoader';
import {AuthProvider} from '../../context';
import {galleryAPI, pageAPI, subjectSearchAPI} from '../../services';
import type {WebSiteFile, WebSitePage} from '../../models';

const subject = {id: 1, subject: 'tag', subject_de: null, subject_en: null, subject_es: null, subject_fi: null, subject_se: null};
const page: WebSitePage = {
    id: 1, page_id: 1, title: 'Page', path: 'page', file_path: 'page', header: 'Header', body: 'body',
    page_style: null, secure: false, acl_id: null, creator: 'Author', created: null, subjects: [subject],
};
const file: WebSiteFile = {
    id: 1, file_id: 1, acl_id: null, file_path: 'image.jpg', mimetype: 'image/jpeg',
    original_date_time: null, subjects: [subject],
};
const emptyPage = <T, >() => ({
    content: [] as T[], page: 0, size: 25, total_elements: 0, total_pages: 0, first: true, last: true, empty: true,
});

class ResizeObserverMock {
    observe() {
    }

    unobserve() {
    }

    disconnect() {
    }
}

Object.defineProperty(globalThis, 'ResizeObserver', {value: ResizeObserverMock});

describe('route and loader components', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        jest.clearAllMocks();
        jest.mocked(galleryAPI.getPublicGalleries).mockResolvedValue({data: []});
        jest.mocked(galleryAPI.getGalleryFiles).mockResolvedValue({
            content: [], page: 0, size: 25, total_elements: 0, total_pages: 0, first: true, last: true, empty: true,
        });
        jest.mocked(pageAPI.getPageContent).mockResolvedValue({data: page});
        jest.mocked(pageAPI.getPublicPages).mockResolvedValue({
            data: {
                content: [page],
                page: 0,
                size: 12,
                total_elements: 1,
                total_pages: 1,
                first: true,
                last: true,
                empty: false
            }
        });
        jest.mocked(subjectSearchAPI.searchByIds).mockResolvedValue({pages: emptyPage<WebSitePage>(), galleries: emptyPage(), files: emptyPage<WebSiteFile>()});
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
    });

    function render(ui: ReactElement, entries: string[] = ['/']) {
        act(() => root.unmount());
        container.replaceChildren();
        root = createRoot(container);
        act(() => root.render(<MemoryRouter initialEntries={entries}>{ui}</MemoryRouter>));
    }

    async function settle() {
        await act(async () => {
            await new Promise((resolve) => window.setTimeout(resolve, 5));
        });
    }

    it('renders valid and invalid gallery routes', () => {
        render(<AuthProvider><Routes><Route path="/galleries/:galleryId" element={<GalleryRoute/>}/></Routes></AuthProvider>, ['/galleries/nope']);
        expect(container.textContent).toContain('Invalid gallery');
        render(<AuthProvider><Routes><Route path="/galleries/:galleryId" element={<GalleryRoute/>}/></Routes></AuthProvider>, ['/galleries/4']);
        expect(container.textContent).toContain('Gallery #4');
    });

    it('renders galleries loading, empty, and populated states', async () => {
        render(<AuthProvider><GalleriesRoute/></AuthProvider>);
        expect(container.querySelector('.ant-spin')).not.toBeNull();
        await settle();
        expect(container.textContent).toContain('No galleries');
        jest.mocked(galleryAPI.getPublicGalleries).mockResolvedValue({
            data: [{id: 1, gallery_id: 2, shortname: null, description: null, subjects: []}],
        });
        render(<AuthProvider><GalleriesRoute/></AuthProvider>);
        await settle();
        expect(container.textContent).toContain('Gallery #2');
        expect(container.textContent).toContain('No description available');
    });

    it('renders page content, fallback cards, status, errors, and empty states', async () => {
        render(<Routes><Route path="/pages/*" element={<PagesRoute/>}/></Routes>, ['/pages/page']);
        await settle();
        expect(container.textContent).toContain('Page');

        jest.mocked(pageAPI.getPageContent).mockResolvedValue({status: 404});
        render(<Routes><Route path="/pages/*" element={<PagesRoute/>}/></Routes>, ['/pages/docs']);
        await settle();
        expect(container.textContent).toContain('Page not found');

        jest.mocked(pageAPI.getPageContent).mockResolvedValue({status: 404});
        render(<Routes><Route path="/pages/*" element={<PagesRoute/>}/></Routes>, ['/pages/docs/index']);
        await settle();
        expect(container.textContent).toContain('Latest Pages');

        jest.mocked(pageAPI.getPageContent).mockResolvedValue({status: 401});
        render(<Routes><Route path="/pages/*" element={<PagesRoute/>}/></Routes>, ['/pages/private']);
        await settle();
        expect(container.textContent).toContain('Kirjaudu');
        jest.mocked(pageAPI.getPageContent).mockResolvedValue({status: 403});
        render(<Routes><Route path="/pages/*" element={<PagesRoute/>}/></Routes>, ['/pages/private']);
        await settle();
        expect(container.textContent).toContain('Pääsy kielletty');
        jest.mocked(pageAPI.getPageContent).mockRejectedValue(new Error('network'));
        render(<Routes><Route path="/pages/*" element={<PagesRoute/>}/></Routes>, ['/pages/private']);
        await settle();
        expect(container.textContent).toContain('network');
    });

    it('renders subject searches for empty, loading, and sorted result sections', async () => {
        render(<AuthProvider><SubjectSearchLoader subjectIdList={[]}/></AuthProvider>);
        await settle();
        expect(container.textContent).toContain('Ei hakutuloksia');

        jest.mocked(subjectSearchAPI.searchByIds).mockResolvedValue({
            pages: {content: [page], page: 0, size: 1, total_elements: 1, total_pages: 1, first: true, last: true, empty: false},
            galleries: {
                content: [{id: 1, gallery_id: 3, shortname: 'Gallery', description: 'Description', subjects: []}],
                page: 0,
                size: 1,
                total_elements: 1,
                total_pages: 1,
                first: true,
                last: true,
                empty: false
            },
            files: {content: [file], page: 0, size: 1, total_elements: 2, total_pages: 2, first: true, last: false, empty: false},
        });
        render(<AuthProvider><SubjectSearchLoader subjectIdList={[1]}/></AuthProvider>);
        await settle();
        expect(container.textContent).toContain('Pages');
        expect(container.textContent).toContain('Galleries');
        expect(container.textContent).toContain('Files');

        jest.mocked(subjectSearchAPI.searchByIds).mockResolvedValue({pages: emptyPage<WebSitePage>(), galleries: emptyPage(), files: emptyPage<WebSiteFile>()});
        render(<AuthProvider><Routes><Route path="/search" element={<SearchRoute/>}/></Routes></AuthProvider>, ['/search?subjects=1,0,abc']);
        await settle();
        expect(subjectSearchAPI.searchByIds).toHaveBeenLastCalledWith({subject_ids: [1], page: 0, size: 25});
    });

    it('handles missing and paged subject search data', async () => {
        jest.mocked(subjectSearchAPI.searchByIds).mockResolvedValueOnce({} as never);
        render(<AuthProvider><SubjectSearchLoader subjectIdList={[2]}/></AuthProvider>);
        await settle();
        expect(container.textContent).toContain('Ei hakutuloksia');

        jest.mocked(subjectSearchAPI.searchByIds).mockResolvedValueOnce({
            pages: emptyPage<WebSitePage>(), galleries: emptyPage(), files: {
                content: [file], page: 0, size: 1, total_elements: 2, total_pages: 2, first: true, last: false, empty: false,
            },
        });
        render(<AuthProvider><SubjectSearchLoader subjectIdList={[2]}/></AuthProvider>);
        await settle();
        const more = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('Lataa')) as HTMLButtonElement;
        if (more) {
            jest.mocked(subjectSearchAPI.searchByIds).mockResolvedValueOnce({
                pages: emptyPage<WebSitePage>(), galleries: emptyPage(), files: {
                    content: [], page: 1, size: 1, total_elements: 2, total_pages: 2, first: false, last: true, empty: true,
                },
            });
            await act(async () => more.click());
        }
        expect(subjectSearchAPI.searchByIds).toHaveBeenCalled();
    });
});
