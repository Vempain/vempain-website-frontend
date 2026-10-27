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

const pageOf = (content: WebSiteFile[], page: number, last: boolean, totalElements = 4) => ({
    content, page, size: 2, total_elements: totalElements, total_pages: Math.ceil(totalElements / 2), first: page === 0, last,
    empty: content.length === 0,
});

type ObserverRecord = { callback: IntersectionObserverCallback };

/** Installs an IntersectionObserver stub that records every observer so a test can fire the sentinel; returns the restore function. */
function installIntersectionObserver(observers: ObserverRecord[]): () => void {
    class IntersectionObserverMock {
        callback: IntersectionObserverCallback;

        constructor(callback: IntersectionObserverCallback) {
            this.callback = callback;
            observers.push(this);
        }

        observe() {
        }

        disconnect() {
        }
    }

    Object.defineProperty(globalThis, 'IntersectionObserver', {value: IntersectionObserverMock, configurable: true});
    return () => Object.defineProperty(globalThis, 'IntersectionObserver', {value: undefined, configurable: true});
}

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

    it('requests a page only once while the scroll sentinel keeps reporting the end of the grid', async () => {
        const observers: ObserverRecord[] = [];
        const restoreObserver = installIntersectionObserver(observers);
        try {
            let resolveSecondPage: (value: ReturnType<typeof pageOf>) => void = () => undefined;
            jest.mocked(galleryAPI.getGalleryFiles)
                    .mockResolvedValueOnce(pageOf([file(1), file(2)], 0, false, 6))
                    .mockReturnValueOnce(new Promise((resolve) => {
                        resolveSecondPage = resolve;
                    }))
                    .mockResolvedValueOnce(pageOf([file(5), file(6)], 2, true, 6));
            render(<GalleryLoader galleryId={3}/>);
            await settle();
            expect(observers.length).toBeGreaterThan(0);

            // the sentinel is reported as visible again and again while the second page is still on its way
            const sentinelVisible = async () => {
                act(() => observers[observers.length - 1].callback(
                        [{isIntersecting: true} as IntersectionObserverEntry], observers[observers.length - 1] as unknown as IntersectionObserver));
                await settle();
            };
            await sentinelVisible();
            await sentinelVisible();
            await sentinelVisible();
            expect(galleryAPI.getGalleryFiles).toHaveBeenCalledTimes(2);
            expect(galleryAPI.getGalleryFiles).toHaveBeenLastCalledWith(3, {page: 1, size: 2});

            await act(async () => {
                resolveSecondPage(pageOf([file(3), file(4)], 1, false, 6));
                await settle();
            });
            const shownIds = () => Array.from(container.querySelectorAll('[data-testid="gallery-grid"] img'))
                    .map((img) => img.getAttribute('src'));
            expect(shownIds()).toHaveLength(4);
            expect(new Set(shownIds()).size).toBe(4);

            // the sentinel is still visible after the second page rendered: the third page is requested, the second never again
            await sentinelVisible();
            expect(galleryAPI.getGalleryFiles).toHaveBeenCalledTimes(3);
            expect(galleryAPI.getGalleryFiles).toHaveBeenLastCalledWith(3, {page: 2, size: 2});
            expect(shownIds()).toHaveLength(6);
            expect(new Set(shownIds()).size).toBe(6);
            expect(moreButton()).toBeUndefined();
        } finally {
            restoreObserver();
        }
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
