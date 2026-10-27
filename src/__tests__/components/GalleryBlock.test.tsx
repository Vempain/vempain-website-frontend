import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals';
import {act, type ReactElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import {GalleryBlock} from '../../components/GalleryBlock';
import {fileAPI} from '../../services';
import type {WebSiteFile, WebSiteLocation} from '../../models';

class ResizeObserverMock {
    observe() {
    }

    unobserve() {
    }

    disconnect() {
    }
}

Object.defineProperty(globalThis, 'ResizeObserver', {value: ResizeObserverMock});

const location: WebSiteLocation = {
    id: 4, latitude: 60, latitude_ref: 'N', longitude: 25, longitude_ref: 'E', altitude: 10, direction: 90, satellite_count: 5,
    country: 'Finland', city: 'Helsinki', street: 'Main Street', sub_location: 'Park',
};

const fileWithDetails: WebSiteFile = {
    id: 1, file_id: 1, acl_id: null, file_path: 'images/one.jpg', mimetype: 'image/jpeg', original_date_time: '2020-01-02T03:04:05Z',
    comment: 'A comment', rights_holder: 'Owner', creator_name: 'Creator', metadata: JSON.stringify({Model: 'Camera', ISO: 100}),
    subjects: [], location,
};

/** Blank and missing values are dropped from the details page; without camera metadata the overlay has no content. */
const fileWithoutDetails: WebSiteFile = {
    id: 2, file_id: 2, acl_id: null, file_path: 'images/two.jpg', mimetype: 'image/jpeg', original_date_time: null,
    comment: '   ', rights_holder: '', subjects: [], location: null,
};

const fileWithoutPath: WebSiteFile = {
    id: 3, file_id: 3, acl_id: null, file_path: '', mimetype: 'image/jpeg', original_date_time: null, subjects: [],
};

function click(element: Element | null) {
    expect(element).not.toBeNull();
    act(() => (element as HTMLElement).click());
}

function findButton(scope: ParentNode, text: string): HTMLButtonElement | undefined {
    return Array.from(scope.querySelectorAll('button')).find((button) => button.textContent?.includes(text));
}

describe('GalleryBlock', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        jest.clearAllMocks();
        jest.mocked(fileAPI.getFileUrl).mockImplementation((value: string) => `/file/${value}`);
        jest.mocked(fileAPI.getFileThumbUrl).mockImplementation((value: string) => `${value}?thumb`);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        document.body.querySelectorAll('.ant-image-preview-root, .ant-modal-root').forEach((node) => node.parentElement?.remove());
    });

    function render(ui: ReactElement) {
        act(() => root.render(<MemoryRouter>{ui}</MemoryRouter>));
    }

    async function settle() {
        await act(async () => {
            await new Promise((resolve) => window.setTimeout(resolve, 5));
        });
    }

    it('fills the frame with the centre of the thumbnail on both axes', () => {
        const files = [fileWithDetails, fileWithoutDetails];
        render(<GalleryBlock title="Trip" siteFileList={files} totalFiles={files.length} hasMore={false} fetchMoreFiles={async () => []}/>);

        const frame = container.querySelector('[data-testid="gallery-grid"] div[style*="position"]') as HTMLElement;
        expect(frame.style.aspectRatio).toBe('250 / 166');
        expect(frame.style.overflow).toBe('hidden');
        // the Ant Design wrapper must span the frame, otherwise object-fit has no box to fit into
        const wrapper = frame.querySelector('.ant-image') as HTMLElement;
        expect(wrapper.style.width).toBe('100%');
        expect(wrapper.style.height).toBe('100%');
        expect(wrapper.style.display).toBe('block');
        const image = wrapper.querySelector('img') as HTMLImageElement;
        expect(image.style.width).toBe('100%');
        expect(image.style.height).toBe('100%');
        expect(image.style.objectFit).toBe('cover');
        expect(image.style.objectPosition).toBe('center');
    });

    it('skips files without a path and builds thumbnail URLs through the file service', () => {
        render(<GalleryBlock title="" siteFileList={[fileWithDetails, fileWithoutPath]} totalFiles={2} hasMore={false}
                             fetchMoreFiles={jest.fn<() => Promise<WebSiteFile[]>>()}/>);
        const images = container.querySelectorAll('[data-testid="gallery-grid"] img');
        expect(images).toHaveLength(1);
        expect(images[0].getAttribute('src')).toBe('/file/images/one.jpg?thumb');
        expect(fileAPI.getFileUrl).toHaveBeenCalledWith('images/one.jpg');
        expect(fileAPI.getFileUrl).not.toHaveBeenCalledWith('');
        expect(container.querySelector('.ant-typography')).toBeNull();
        expect(findButton(container, 'Lataa lisää')).toBeUndefined();
    });

    it('opens the preview, toggles the metadata overlay, pages through images and closes again', async () => {
        const fetchMore = jest.fn<() => Promise<WebSiteFile[]>>().mockResolvedValue([]);
        render(<GalleryBlock title="Gallery" siteFileList={[fileWithDetails, fileWithoutDetails]} totalFiles={2} hasMore={false}
                             fetchMoreFiles={fetchMore}/>);

        click(container.querySelectorAll('[data-testid="gallery-grid"] div[style*="position"]')[0]);
        await settle();
        expect(document.body.querySelector('.ant-image-preview')).not.toBeNull();
        expect(document.body.textContent).toContain('/ 2');

        click(findButton(document.body, 'Näytä lisätiedot') ?? null);
        await settle();
        expect(document.body.textContent).toContain('A comment');
        expect(document.body.textContent).toContain('Piilota lisätiedot');

        // Moving to the next image hides the overlay again and that image has no metadata at all.
        click(document.body.querySelector('.ant-image-preview-switch-next'));
        await settle();
        expect(document.body.textContent).not.toContain('A comment');
        expect(findButton(document.body, 'lisätiedot')).toBeUndefined();

        click(document.body.querySelector('.ant-image-preview-close'));
        await settle();
        expect(document.body.querySelector('.ant-image-preview[aria-hidden="false"]')).toBeNull();
        expect(fetchMore).not.toHaveBeenCalled();
    });

    it('prefetches the next page when the preview reaches the end of the loaded files', async () => {
        const fetchMore = jest.fn<() => Promise<WebSiteFile[]>>().mockRejectedValue(new Error('offline'));
        render(<GalleryBlock title="Gallery" siteFileList={[fileWithDetails, fileWithoutDetails]} totalFiles={5} hasMore
                             fetchMoreFiles={fetchMore}/>);

        click(container.querySelectorAll('[data-testid="gallery-grid"] div[style*="position"]')[1]);
        await settle();
        expect(fetchMore).toHaveBeenCalledTimes(1);
        expect(document.body.textContent).toContain('/ 5');
    });

    it('loads the next batch when the end of the grid scrolls into view and keeps the button as a fallback', async () => {
        const observers: { callback: IntersectionObserverCallback; observed: Element[]; disconnected: boolean }[] = [];

        class IntersectionObserverMock {
            callback: IntersectionObserverCallback;
            observed: Element[] = [];
            disconnected = false;

            constructor(callback: IntersectionObserverCallback) {
                this.callback = callback;
                observers.push(this as unknown as typeof observers[number]);
            }

            observe(element: Element) {
                this.observed.push(element);
            }

            disconnect() {
                this.disconnected = true;
            }
        }

        Object.defineProperty(globalThis, 'IntersectionObserver', {value: IntersectionObserverMock, configurable: true});
        try {
            let resolveFetch: (files: WebSiteFile[]) => void = () => undefined;
            const fetchMore = jest.fn<() => Promise<WebSiteFile[]>>(() => new Promise((resolve) => {
                resolveFetch = resolve;
            }));
            render(<GalleryBlock title="Gallery" siteFileList={[fileWithDetails, fileWithoutDetails]} totalFiles={5} hasMore
                                 fetchMoreFiles={fetchMore}/>);

            const sentinel = container.querySelector('[data-testid="gallery-load-more-sentinel"]');
            expect(sentinel).not.toBeNull();
            expect(observers).toHaveLength(1);
            expect(observers[0].observed).toEqual([sentinel]);

            // the sentinel scrolls into view: one load, and a second notification while it is loading is ignored
            const intersect = (isIntersecting: boolean) => act(() => observers[0].callback(
                    [{isIntersecting} as IntersectionObserverEntry], observers[0] as unknown as IntersectionObserver));
            intersect(false);
            expect(fetchMore).not.toHaveBeenCalled();
            intersect(true);
            intersect(true);
            expect(fetchMore).toHaveBeenCalledTimes(1);
            await act(async () => {
                resolveFetch([]);
                await settle();
            });
            intersect(true);
            expect(fetchMore).toHaveBeenCalledTimes(2);

            // the button is still there and works
            const button = findButton(container, 'Lataa lisää');
            expect(button).toBeDefined();
            await act(async () => {
                resolveFetch([]);
                await settle();
            });
            click(button ?? null);
            expect(fetchMore).toHaveBeenCalledTimes(3);
        } finally {
            Object.defineProperty(globalThis, 'IntersectionObserver', {value: undefined, configurable: true});
        }
    });

    it('does not prefetch from the preview while a scroll load of the next batch is still on its way', async () => {
        const observers: { callback: IntersectionObserverCallback }[] = [];

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
        try {
            let resolveFetch: (files: WebSiteFile[]) => void = () => undefined;
            const fetchMore = jest.fn<() => Promise<WebSiteFile[]>>(() => new Promise((resolve) => {
                resolveFetch = resolve;
            }));
            render(<GalleryBlock title="Gallery" siteFileList={[fileWithDetails, fileWithoutDetails]} totalFiles={5} hasMore
                                 fetchMoreFiles={fetchMore}/>);
            act(() => observers[0].callback([{isIntersecting: true} as IntersectionObserverEntry], observers[0] as unknown as IntersectionObserver));
            expect(fetchMore).toHaveBeenCalledTimes(1);

            // the preview opens on the last loaded image, which would normally prefetch the next batch
            click(container.querySelectorAll('[data-testid="gallery-grid"] div[style*="position"]')[1]);
            await settle();
            expect(document.body.querySelector('.ant-image-preview')).not.toBeNull();
            expect(fetchMore).toHaveBeenCalledTimes(1);

            await act(async () => {
                resolveFetch([]);
                await settle();
            });
            act(() => observers[observers.length - 1].callback(
                    [{isIntersecting: true} as IntersectionObserverEntry], observers[observers.length - 1] as unknown as IntersectionObserver));
            expect(fetchMore).toHaveBeenCalledTimes(2);
        } finally {
            Object.defineProperty(globalThis, 'IntersectionObserver', {value: undefined, configurable: true});
        }
    });

    it('shows the hover preview in a tooltip box that grows with the image and is bounded by the viewport', async () => {
        render(<GalleryBlock title="Gallery" siteFileList={[fileWithDetails]} totalFiles={1} hasMore={false}
                             fetchMoreFiles={jest.fn<() => Promise<WebSiteFile[]>>()}/>);
        const frame = container.querySelector('[data-testid="gallery-grid"] div[style*="position"]');
        act(() => {
            frame?.dispatchEvent(new MouseEvent('mouseover', {bubbles: true}));
        });
        await act(async () => {
            await new Promise((resolve) => window.setTimeout(resolve, 200));
        });

        const tooltip = document.body.querySelector<HTMLElement>('.ant-tooltip');
        expect(tooltip).not.toBeNull();
        // the box must not be capped narrower than the image, otherwise the placement engine cannot keep the image on screen
        expect(tooltip?.style.maxWidth).toBe('none');
        const preview = tooltip?.querySelector('img');
        expect(preview?.getAttribute('src')).toBe(fileAPI.getFileThumbUrl(fileAPI.getFileUrl('images/one.jpg')));
        expect(preview?.style.maxWidth).toBe('min(500px, calc(100vw - 32px))');
        expect(preview?.style.maxHeight).toBe('min(400px, calc(100vh - 32px))');
        expect(preview?.style.width).toBe('auto');
        expect(preview?.style.height).toBe('auto');
    });

    it('does not prefetch while the preview is far from the end of the loaded files', async () => {
        const fetchMore = jest.fn<() => Promise<WebSiteFile[]>>().mockResolvedValue([]);
        const files = [fileWithDetails, fileWithoutDetails, {...fileWithoutDetails, id: 3, file_path: 'images/three.jpg'}];
        render(<GalleryBlock title="Gallery" siteFileList={files} totalFiles={9} hasMore fetchMoreFiles={fetchMore}/>);
        click(container.querySelectorAll('[data-testid="gallery-grid"] div[style*="position"]')[0]);
        await settle();
        expect(document.body.querySelector('.ant-image-preview')).not.toBeNull();
        expect(fetchMore).not.toHaveBeenCalled();
    });

    it('opens the location modal from the badge for authenticated viewers and closes it', async () => {
        render(<GalleryBlock title="Gallery" siteFileList={[fileWithDetails, fileWithoutDetails]} totalFiles={2} hasMore={false}
                             fetchMoreFiles={jest.fn<() => Promise<WebSiteFile[]>>()} isAuthenticated/>);
        expect(container.querySelectorAll('[aria-label="Has location"]')).toHaveLength(1);

        click(container.querySelector('[aria-label="Has location"]'));
        await settle();
        expect(document.body.textContent).toContain('Altitude: 10 m');
        expect(document.body.querySelector('.ant-image-preview')).toBeNull();

        click(document.body.querySelector('.ant-modal [aria-label="Close"]'));
        await settle();
        expect(container.querySelector('.ant-modal-root')).toBeNull();
    });

    it('opens the preview from the image itself and shows the subjects of a file without other details', async () => {
        const fileWithSubjectsOnly: WebSiteFile = {
            ...fileWithoutDetails, id: 5, comment: null, rights_holder: null,
            subjects: [{id: 1, subject: 'harbour', subject_de: null, subject_en: null, subject_es: null, subject_fi: null, subject_se: null}],
        };
        // A file whose subjects the backend left out entirely.
        const fileWithoutSubjects = {...fileWithDetails, subjects: undefined} as unknown as WebSiteFile;
        render(<GalleryBlock title="Gallery" siteFileList={[fileWithoutSubjects, fileWithSubjectsOnly]} totalFiles={2}
                             hasMore={false} fetchMoreFiles={jest.fn<() => Promise<WebSiteFile[]>>()}/>);
        click(container.querySelectorAll('[data-testid="gallery-grid"] img')[1]);
        await settle();
        expect(document.body.querySelector('.ant-image-preview')).not.toBeNull();
        click(findButton(document.body, 'Näytä lisätiedot') ?? null);
        await settle();
        expect(document.body.textContent).toContain('harbour');

        click(document.body.querySelector('.ant-image-preview-switch-prev'));
        await settle();
        expect(document.body.textContent).not.toContain('harbour');
    });

    it('hides the location badge for anonymous viewers', () => {
        render(<GalleryBlock title="Gallery" siteFileList={[fileWithDetails]} totalFiles={1} hasMore={false}
                             fetchMoreFiles={jest.fn<() => Promise<WebSiteFile[]>>()}/>);
        expect(container.querySelector('[aria-label="Has location"]')).toBeNull();
    });
});
