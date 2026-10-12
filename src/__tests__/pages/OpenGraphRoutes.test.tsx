import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals';
import {act, type ReactElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {MemoryRouter, Route, Routes} from 'react-router-dom';
import {GalleryRoute} from '../../pages/GalleryRoute';
import {PagesRoute} from '../../pages/PagesRoute';
import {AuthProvider, OpenGraphProvider} from '../../context';
import {galleryAPI, pageAPI} from '../../services';
import type {OpenGraph, WebSitePage} from '../../models';

const openGraph: OpenGraph = {
    type: 'article', site_name: 'My Site', title: 'Summer trip', description: 'Photos from the trip', path: '/pages/trips/summer',
    image_path: 'trips/summer/beach.jpg', image_mimetype: 'image/jpeg', image_width: 1400, image_height: 933,
    published: '2024-05-15T12:00:00', modified: null,
};
const page: WebSitePage = {
    id: 1, page_id: 1, title: 'Summer trip', file_path: 'trips/summer', header: 'Photos from the trip', body: '<p>body</p>', page_style: null,
    secure: false, acl_id: null, creator: 'alice', created: null, subjects: [], open_graph: openGraph,
};

class ResizeObserverMock {
    observe() {
    }

    unobserve() {
    }

    disconnect() {
    }
}

Object.defineProperty(globalThis, 'ResizeObserver', {value: ResizeObserverMock});

function tag(selector: string): string | null {
    return document.head.querySelector(selector)?.getAttribute('content') ?? null;
}

describe('route components publish Open Graph metadata', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        document.head.innerHTML = '';
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        jest.clearAllMocks();
        jest.mocked(galleryAPI.getGalleryFiles).mockResolvedValue({
            content: [], page: 0, size: 25, total_elements: 0, total_pages: 0, first: true, last: true, empty: true,
        });
        jest.mocked(pageAPI.getPublicPages).mockResolvedValue({
            data: {content: [], page: 0, size: 12, total_elements: 0, total_pages: 0, first: true, last: true, empty: true},
        });
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
    });

    function render(ui: ReactElement, entry: string) {
        // A mounted MemoryRouter ignores a changed initialEntries, so every render starts from a fresh root.
        act(() => root.unmount());
        container.replaceChildren();
        root = createRoot(container);
        act(() => root.render(
                <MemoryRouter initialEntries={[entry]}>
                    <OpenGraphProvider siteName="My Site" siteDescription="About the site">
                        <AuthProvider><Routes>{ui}</Routes></AuthProvider>
                    </OpenGraphProvider>
                </MemoryRouter>
        ));
    }

    async function settle() {
        await act(async () => {
            await new Promise((resolve) => window.setTimeout(resolve, 5));
        });
    }

    it('uses the metadata the backend sends with the page', async () => {
        jest.mocked(pageAPI.getPageContent).mockResolvedValue({data: page});
        render(<Route path="/pages/*" element={<PagesRoute/>}/>, '/pages/trips/summer');
        expect(document.title).toBe('My Site');

        await settle();

        expect(document.title).toBe('Summer trip | My Site');
        expect(tag('meta[property="og:type"]')).toBe('article');
        expect(tag('meta[property="og:description"]')).toBe('Photos from the trip');
        expect(tag('meta[property="og:url"]')).toBe(`${window.location.origin}/pages/trips/summer`);
        expect(tag('meta[property="og:image"]')).toBe(`${window.location.origin}/trips/summer/beach.jpg`);
        expect(tag('meta[property="og:image:width"]')).toBe('1400');
    });

    it('derives the metadata from the page when the backend sends none', async () => {
        jest.mocked(pageAPI.getPageContent).mockResolvedValue({data: {...page, open_graph: undefined}});
        render(<Route path="/pages/*" element={<PagesRoute/>}/>, '/pages/trips/summer');
        await settle();

        expect(document.title).toBe('Summer trip | My Site');
        expect(tag('meta[property="og:site_name"]')).toBe('My Site');
        expect(tag('meta[property="og:description"]')).toBe('Photos from the trip');
        expect(tag('meta[property="og:image"]')).toBeNull();
    });

    it('keeps the site level metadata for a page that is not found', async () => {
        jest.mocked(pageAPI.getPageContent).mockResolvedValue({status: 404});
        render(<Route path="/pages/*" element={<PagesRoute/>}/>, '/pages/missing');
        await settle();

        expect(container.textContent).toContain('Page not found');
        expect(document.title).toBe('My Site');
        expect(tag('meta[property="og:type"]')).toBe('website');
        expect(tag('meta[property="og:url"]')).toBe(`${window.location.origin}/pages/missing`);
    });

    it('titles a gallery route by its number and leaves an invalid one at the site level', async () => {
        render(<Route path="/galleries/:galleryId" element={<GalleryRoute/>}/>, '/galleries/4');
        await settle();
        expect(document.title).toBe('Gallery #4 | My Site');
        expect(tag('meta[property="og:url"]')).toBe(`${window.location.origin}/galleries/4`);
        expect(tag('meta[property="og:type"]')).toBe('website');

        render(<Route path="/galleries/:galleryId" element={<GalleryRoute/>}/>, '/galleries/nope');
        await settle();
        expect(document.title).toBe('My Site');
    });
});
