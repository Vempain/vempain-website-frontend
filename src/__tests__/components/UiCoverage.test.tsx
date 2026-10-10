import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals';
import {act, type ReactElement, type ReactNode} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import {GalleryBlock} from '../../components/GalleryBlock';
import {GalleryLoader} from '../../components/GalleryLoader';
import {LocationBadge} from '../../components/LocationBadge';
import LocationMap from '../../components/LocationMap';
import {LocationModal} from '../../components/LocationModal';
import {PageCardsGrid} from '../../components/PageCardsGrid';
import PageView from '../../components/PageView';
import {ShowSubjects} from '../../components/ShowSubjects';
import {SideBar} from '../../components/SideBar';
import {TopBar} from '../../components/TopBar';
import {AuthProvider, ThemeProvider, useAuth, useTheme} from '../../context';
import {authenticationAPI, fileAPI, galleryAPI, onSessionExpired, pageAPI, themeAPI} from '../../services';
import {mockMapInstance} from '../../../__mocks__/reactLeafletMock';
import type {WebSiteFile, WebSitePage, WebSiteSubject} from '../../models';

const services = {authenticationAPI, fileAPI, galleryAPI, pageAPI, themeAPI};

class ResizeObserverMock {
    observe() {
    }

    unobserve() {
    }

    disconnect() {
    }
}

Object.defineProperty(globalThis, 'ResizeObserver', {value: ResizeObserverMock});

const subject = (id: number, name: string): WebSiteSubject => ({
    id, subject: name, subject_de: null, subject_en: null, subject_es: null, subject_fi: null, subject_se: null,
});

const file: WebSiteFile = {
    id: 1,
    file_id: 1,
    acl_id: null,
    file_path: 'images/test.jpg',
    mimetype: 'image/jpeg',
    original_date_time: '2020-01-02T03:04:05Z',
    comment: 'A comment',
    rights_holder: 'Owner',
    rights_terms: 'Terms',
    rights_url: 'https://example.test/rights',
    creator_name: 'Creator',
    creator_email: 'creator@example.test',
    creator_country: 'Finland',
    creator_url: 'https://example.test',
    metadata: JSON.stringify({
        Model: 'Camera',
        PixelXDimension: 4000,
        PixelYDimension: 3000,
        ISO: 100,
        FNumber: 2.8,
        FocalLength: 50,
        ExposureTime: '1/100',
        BitsPerSample: 8,
    }),
    subjects: [subject(1, 'nature')],
    location: {
        id: 4,
        latitude: 60,
        latitude_ref: 'N',
        longitude: 25,
        longitude_ref: 'E',
        altitude: 10,
        direction: 90,
        satellite_count: 5,
        country: 'Finland',
        city: 'Helsinki',
        street: 'Main Street',
        sub_location: 'Park',
    },
};

function Harness({children}: { children: ReactNode }) {
    return <BrowserRouter>{children}</BrowserRouter>;
}

describe('UI components', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        jest.clearAllMocks();
        mockMapInstance.reset();
        jest.mocked(services.authenticationAPI.isAuthenticated).mockReturnValue(false);
        jest.mocked(services.themeAPI.getDefaultStyle).mockResolvedValue({});
        jest.mocked(services.galleryAPI.getGalleryFiles).mockResolvedValue({
            content: [], page: 0, size: 25, total_elements: 0, total_pages: 0, first: true, last: true, empty: true,
        });
        jest.mocked(services.pageAPI.getDirectoryTree).mockResolvedValue({data: []});
        jest.mocked(services.fileAPI.getFileUrl).mockImplementation((value: string) => `/file/${value}`);
        jest.mocked(services.fileAPI.getFileThumbUrl).mockImplementation((value: string) => `${value}?thumb`);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
    });

    function render(ui: ReactElement) {
        act(() => root.render(<Harness>{ui}</Harness>));
    }

    it('renders subject labels, fallbacks, and navigates on click', () => {
        render(<ShowSubjects subjects={[
            subject(1, 'primary'),
            {id: 2, subject: null, subject_en: 'English', subject_fi: null, subject_se: null, subject_de: null, subject_es: null},
            {id: 3, subject: null, subject_en: null, subject_fi: null, subject_se: null, subject_de: null, subject_es: null},
        ]}/>);
        expect(container.textContent).toContain('primary');
        expect(container.textContent).toContain('English');
        expect(container.textContent).toContain('Subject #3');
        act(() => (container.querySelectorAll('.ant-tag')[0] as HTMLElement).click());
        expect(window.location.pathname).toBe('/search');
        expect(window.location.search).toBe('?subjects=1');
        render(<ShowSubjects/>);
        expect(container.textContent).toBe('');
    });

    it('renders page cards and published date fallbacks', () => {
        render(<PageCardsGrid items={[
            {id: 1, title: 'One', filePath: 'one', summary: 'Summary', published: '2020-01-01T00:00:00Z'},
            {id: 2, title: 'Two', filePath: 'two', summary: null, published: 'not-a-date'},
            {id: 3, title: 'Three', filePath: 'three'},
        ]}/>);
        expect(container.textContent).toContain('Summary');
        expect(container.textContent).toContain('not-a-date');
        expect(container.textContent).toContain('-');
        render(<PageCardsGrid items={[]}/>);
        expect(container.textContent).toBe('');
    });

    it('renders location badge states and map metadata', () => {
        render(<LocationBadge visible={false}/>);
        expect(container.textContent).toBe('');
        render(<LocationBadge visible onClick={jest.fn()}/>);
        expect(container.querySelector('[aria-label="Has location"]')).not.toBeNull();
        act(() => (container.querySelector('[aria-label="Has location"]') as HTMLElement).click());
        render(<LocationMap location={file.location!}/>);
        expect(container.querySelector('[data-testid="map-container"]')).not.toBeNull();
        expect(container.textContent).toContain('Altitude: 10 m');
        expect(container.textContent).toContain('Direction: 90° (?)');
        expect(container.textContent).toContain('Finland, Helsinki');
        expect(mockMapInstance.setViewCalls).toHaveLength(1);
    });

    it('renders and controls the location modal', async () => {
        const onClose = jest.fn();
        render(<LocationModal open location={file.location!} onClose={onClose}/>);
        expect(document.body.textContent).toContain('Location');
        expect(document.body.textContent).toContain('Altitude: 10 m');
        act(() => (document.body.querySelector('[aria-label="Fullscreen"]') as HTMLButtonElement).click());
        expect(document.body.querySelector('[aria-label="Restore"]')).not.toBeNull();
        act(() => (document.body.querySelector('[aria-label="Close"]') as HTMLButtonElement).click());
        expect(onClose).toHaveBeenCalled();
        await act(async () => Promise.resolve());
        render(<LocationModal open={false} location={file.location!} onClose={onClose}/>);
    });

    it('loads a gallery and covers empty, fetch-more, preview, metadata, and location paths', async () => {
        const fetchMore = jest.fn<() => Promise<WebSiteFile[]>>().mockResolvedValue([]);
        render(<GalleryBlock title="Gallery" siteFileList={[]} totalFiles={0} hasMore={false} fetchMoreFiles={fetchMore}/>);
        expect(container.textContent).toContain('No images');
        render(<GalleryBlock title="Gallery" siteFileList={[file]} totalFiles={2} hasMore fetchMoreFiles={fetchMore} isAuthenticated/>);
        expect(container.querySelector('[data-testid="gallery-grid"]')).not.toBeNull();
        expect(container.textContent).toContain('Gallery');
        act(() => (container.querySelector('button') as HTMLButtonElement).click());
        expect(fetchMore).toHaveBeenCalled();
        act(() => (container.querySelector('[data-testid="gallery-grid"] div[style*="position"]') as HTMLElement).click());
        await act(async () => Promise.resolve());
    });

    it('loads gallery pages through GalleryLoader', async () => {
        jest.mocked(services.galleryAPI.getGalleryFiles).mockResolvedValue({
            content: [file], page: 0, size: 1, total_elements: 1, total_pages: 1, first: true, last: true, empty: false,
        });
        render(<AuthProvider><GalleryLoader galleryId={7}/></AuthProvider>);
        await act(async () => {
            await new Promise((resolve) => window.setTimeout(resolve, 5));
        });
        expect(services.galleryAPI.getGalleryFiles).toHaveBeenCalledWith(7, {page: 0, size: 25});
        expect(container.textContent).toContain('Gallery #7');
    });

    it('fetches additional gallery pages and handles service failures', async () => {
        jest.mocked(services.galleryAPI.getGalleryFiles)
                .mockResolvedValueOnce({content: [file], page: 0, size: 1, total_elements: 2, total_pages: 2, first: true, last: false, empty: false})
                .mockRejectedValueOnce(new Error('failed'));
        render(<AuthProvider><GalleryLoader galleryId={8}/></AuthProvider>);
        await act(async () => new Promise((resolve) => window.setTimeout(resolve, 5)));
        const more = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('Lataa lisää')) as HTMLButtonElement;
        if (more) {
            await act(async () => more.click());
        }
        expect(services.galleryAPI.getGalleryFiles).toHaveBeenCalledWith(8, {page: 1, size: 1});
    });

    it('renders page details and page list states', () => {
        const page = {
            id: 1, page_id: 1, title: 'Page', header: 'Header', body: 'gallery 4',
            page_style: null, secure: false, acl_id: null, creator: 'Author', created: '2020-01-01',
            subjects: [subject(1, 'tag')],
        } satisfies WebSitePage;
        render(<AuthProvider><PageView pageContent={page} pages={[]} pagination={{page: 0, size: 10, total_elements: 0}}
                                       searchInput="" onSearchInputChange={jest.fn()} onSearchSubmit={jest.fn()} onPageChange={jest.fn()}/></AuthProvider>);
        expect(container.textContent).toContain('Page');
        expect(container.textContent).toContain('Author');
        render(<PageView pageContent={null} pages={[page]} pagination={{page: 0, size: 10, total_elements: 1}}
                         searchInput="x" onSearchInputChange={jest.fn()} onSearchSubmit={jest.fn()} onPageChange={jest.fn()} pageStatus={401}/>);
        expect(container.textContent).toContain('Kirjaudu');
        render(<PageView pageContent={null} pages={[]} pagination={{page: 0, size: 10, total_elements: 0}}
                         searchInput="" onSearchInputChange={jest.fn()} onSearchSubmit={jest.fn()} onPageChange={jest.fn()} pageStatus={403}/>);
        expect(container.textContent).toContain('Pääsy kielletty');
        render(<PageView pageContent={null} pages={[]} pagination={{page: 0, size: 10, total_elements: 0}}
                         searchInput="" onSearchInputChange={jest.fn()} onSearchSubmit={jest.fn()} onPageChange={jest.fn()} pageError="Failed"/>);
        expect(container.textContent).toContain('Failed');
    });

    it('renders top bar auth and directory actions', () => {
        const onDirectoryClick = jest.fn();
        const onShowSearch = jest.fn();

        function AuthTopBar() {
            return <TopBar selectedDirectory="docs" directories={[{name: 'docs'}]} onDirectoryClick={onDirectoryClick} onShowSearch={onShowSearch}/>;
        }

        render(<AuthProvider><AuthTopBar/></AuthProvider>);
        expect(container.textContent).toContain('docs');
        expect(container.textContent).toContain('Login');
        act(() => (container.querySelector('a') as HTMLAnchorElement).click());
        expect(onDirectoryClick).toHaveBeenCalledWith('docs');
        act(() => (container.querySelector('[aria-label="Search"]') as HTMLButtonElement).click());
        expect(onShowSearch).toHaveBeenCalled();
    });

    it('renders sidebar and responds to directory data', async () => {
        jest.mocked(services.pageAPI.getDirectoryTree).mockResolvedValue({
            data: [{
                title: 'Docs', key: 'docs', is_leaf: false, children: [
                    {title: 'Index', key: 'index', is_leaf: true},
                    {title: 'Child', key: 'child', is_leaf: true},
                ]
            }],
        });
        render(<SideBar siteName="Site" siteDescription="Description" selectedDirectory="docs" onPagePathSelect={jest.fn(() => undefined)}/>);
        await act(async () => {
            await new Promise((resolve) => window.setTimeout(resolve, 5));
        });
        expect(container.textContent).toContain('Site');
        act(() => (container.querySelector('[aria-label="Collapse sidebar"]') as HTMLButtonElement).click());
        expect(container.querySelector('[aria-label="Expand sidebar"]')).not.toBeNull();
    });

    it('handles sidebar missing selections, errors, and responsive changes', async () => {
        jest.mocked(services.pageAPI.getDirectoryTree).mockRejectedValue(new Error('failed'));
        render(<SideBar siteName="Site" siteDescription="Description" selectedDirectory={null} onPagePathSelect={jest.fn(() => undefined)}/>);
        expect(container.textContent).toContain('Site');
        render(<SideBar siteName="Site" siteDescription="Description" selectedDirectory="docs" onPagePathSelect={jest.fn(() => undefined)}/>);
        await act(async () => new Promise((resolve) => window.setTimeout(resolve, 5)));
        expect(services.pageAPI.getDirectoryTree).toHaveBeenCalledWith('docs');
    });

    it('exercises authentication and theme provider actions', async () => {
        jest.mocked(services.authenticationAPI.isAuthenticated).mockReturnValue(true);
        jest.mocked(services.authenticationAPI.login).mockResolvedValue({data: {token: 'token'}});

        function Consumer() {
            const auth = useAuth();
            const theme = useTheme();
            return <div>
                <button onClick={() => void auth.login('u', 'p')}>login</button>
                <button onClick={auth.logout}>logout</button>
                <button onClick={auth.showLogin}>show</button>
                <button onClick={auth.hideLogin}>hide</button>
                <button onClick={() => theme.setDefaultStyle({color: {primary: '#fff'}})}>default</button>
                <button onClick={() => theme.applyPageStyle({color: {background: '#000'}})}>page</button>
                <button onClick={theme.resetToDefault}>reset</button>
                <span>{String(auth.loginVisible)}{String(auth.isAuthenticated)}{String(Boolean(theme.antdTheme.token))}</span>
            </div>;
        }

        render(<AuthProvider><ThemeProvider><Consumer/></ThemeProvider></AuthProvider>);
        act(() => (container.querySelector('button') as HTMLButtonElement).click());
        await act(async () => Promise.resolve());
        expect(services.authenticationAPI.login).toHaveBeenCalledWith('u', 'p');
        Array.from(container.querySelectorAll('button')).slice(1, 7).forEach((button) => act(() => (button as HTMLButtonElement).click()));
        expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe('#fff');
    });

    it('responds to session expiration for authenticated users', () => {
        let expire: (() => void) | undefined;
        jest.mocked(onSessionExpired).mockImplementation((callback: () => void) => {
            expire = callback;
            return jest.fn();
        });
        jest.mocked(services.authenticationAPI.isAuthenticated).mockReturnValue(true);
        render(<AuthProvider>
            <div>authenticated</div>
        </AuthProvider>);
        act(() => expire?.());
        expect(document.body.textContent).toContain('authenticated');
    });
});
