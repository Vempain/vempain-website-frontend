import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals';
import {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {MemoryRouter, useLocation} from 'react-router-dom';
import App from '../App';
import {AuthProvider, ThemeProvider} from '../context';
import {authenticationAPI, pageAPI, subjectSearchAPI, webSiteConfigurationAPI} from '../services';

/*
 * The real `SideBar` only forwards tree selections made with trusted mouse events, which jsdom cannot produce; it has its own test
 * (`components/SideBar.test.tsx`). Here it is a stub that calls back with a page path, which is all `App` needs for its navigation.
 */
jest.mock('../components/SideBar', () => ({
    SideBar: ({selectedDirectory, onPagePathSelect}: { selectedDirectory: string | null; onPagePathSelect: (path: string) => void }) => (
            <div data-testid="sidebar-stub" data-directory={selectedDirectory ?? ''}>
                <button data-testid="select-page" onClick={() => onPagePathSelect('docs/child')}/>
            </div>
    ),
}));

class ResizeObserverMock {
    observe() {
    }

    unobserve() {
    }

    disconnect() {
    }
}

Object.defineProperty(globalThis, 'ResizeObserver', {value: ResizeObserverMock});

const subject = (id: number, name: string) => ({
    id, subject: name, subject_de: null, subject_en: null, subject_es: null, subject_fi: null, subject_se: null,
});

function LocationProbe() {
    const location = useLocation();
    return <div data-testid="location">{location.pathname}{location.search}</div>;
}

/** React only notices a value change that goes through the native setter, so `input.value = ...` alone is ignored. */
function typeInto(input: HTMLInputElement, value: string) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    act(() => {
        setter?.call(input, value);
        input.dispatchEvent(new Event('input', {bubbles: true}));
    });
}

function click(element: Element | null | undefined) {
    expect(element).toBeTruthy();
    act(() => (element as HTMLElement).dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true})));
}

describe('App interactions', () => {
    let container: HTMLDivElement;
    let root: Root;
    let consoleError: ReturnType<typeof jest.spyOn>;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        jest.clearAllMocks();
        consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
        jest.mocked(pageAPI.getPublicPageDirectories).mockResolvedValue({data: [{name: 'docs'}]});
        jest.mocked(pageAPI.getPageContent).mockResolvedValue({status: 404});
        jest.mocked(pageAPI.getPublicPages).mockResolvedValue({
            data: {content: [], page: 0, size: 12, total_elements: 0, total_pages: 0, first: true, last: true, empty: true},
        });
        jest.mocked(webSiteConfigurationAPI.getAll).mockResolvedValue({data: {'site.name': 'Configured', 'site.description': 'Described'}});
        jest.mocked(subjectSearchAPI.autocomplete).mockResolvedValue({data: [subject(1, 'nature'), subject(2, 'natural')]});
        jest.mocked(authenticationAPI.isAuthenticated).mockReturnValue(false);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        consoleError.mockRestore();
        document.body.querySelectorAll('.ant-modal-root, .ant-select-dropdown').forEach((node) => node.remove());
    });

    function render(entry = '/') {
        act(() => root.render(
                <MemoryRouter initialEntries={[entry]}>
                    <AuthProvider><ThemeProvider><App/><LocationProbe/></ThemeProvider></AuthProvider>
                </MemoryRouter>
        ));
    }

    async function settle() {
        await act(async () => {
            await new Promise((resolve) => window.setTimeout(resolve, 5));
        });
    }

    function visibleModalWrap(): Element | undefined {
        return Array.from(document.body.querySelectorAll('.ant-modal-wrap')).find((wrap) => !(wrap.getAttribute('style') ?? '').includes('display: none'));
    }

    function location(): string {
        return container.querySelector('[data-testid="location"]')?.textContent ?? '';
    }

    it('navigates to a directory index from the top bar and to a page from the sidebar', async () => {
        render();
        await settle();
        expect(location()).toBe('/pages/index');
        expect(container.querySelector('[data-testid="sidebar-stub"]')?.getAttribute('data-directory')).toBe('');

        click(Array.from(container.querySelectorAll('a')).find((link) => link.textContent === 'docs'));
        await settle();
        expect(location()).toBe('/pages/docs/index');
        expect(container.querySelector('[data-testid="sidebar-stub"]')?.getAttribute('data-directory')).toBe('docs');

        click(container.querySelector('[data-testid="select-page"]'));
        await settle();
        expect(location()).toBe('/pages/docs/child');
        expect(pageAPI.getPageContent).toHaveBeenLastCalledWith('docs/child');
    });

    it('autocompletes subjects from three characters and searches by the chosen ones', async () => {
        render();
        await settle();
        click(container.querySelector('[aria-label="Search"]'));
        await settle();

        const modal = document.body.querySelector('.ant-modal') as HTMLElement;
        expect(modal.textContent).toContain('Etsi tunnisteiden mukaan');
        const searchButton = Array.from(modal.querySelectorAll('button')).find((button) => button.textContent?.includes('Etsi tunnisteiden')) as HTMLButtonElement;
        expect(searchButton.disabled).toBe(true);

        const searchInput = modal.querySelector('input.ant-select-input') as HTMLInputElement;
        typeInto(searchInput, 'na');
        await settle();
        expect(subjectSearchAPI.autocomplete).not.toHaveBeenCalled();

        typeInto(searchInput, 'nat');
        await settle();
        expect(subjectSearchAPI.autocomplete).toHaveBeenCalledWith('nat');
        const option = Array.from(document.body.querySelectorAll('.ant-select-item-option')).find((item) => item.textContent === 'nature');
        click(option);
        await settle();
        expect(modal.textContent).toContain('nature');
        expect(searchButton.disabled).toBe(false);

        click(searchButton);
        await settle();
        expect(location()).toBe('/search?subjects=1');
        expect(subjectSearchAPI.searchByIds).toHaveBeenCalledWith({subject_ids: [1], page: 0, size: 25});
        expect(document.body.querySelector('.ant-modal-wrap')?.getAttribute('style') ?? '').toContain('display: none');
    });

    it('closes the search dialog from its close control', async () => {
        render();
        await settle();
        click(container.querySelector('[aria-label="Search"]'));
        await settle();
        expect(visibleModalWrap()?.textContent).toContain('Tunnisteet');
        click(visibleModalWrap()?.querySelector('button.ant-modal-close'));
        await settle();
        expect(visibleModalWrap()).toBeUndefined();
    });

    it('ignores autocomplete failures and empty answers', async () => {
        jest.mocked(subjectSearchAPI.autocomplete)
                .mockRejectedValueOnce(new Error('offline'))
                .mockResolvedValueOnce({data: undefined});
        render();
        await settle();
        click(container.querySelector('[aria-label="Search"]'));
        await settle();
        const searchInput = document.body.querySelector('.ant-modal input.ant-select-input') as HTMLInputElement;
        typeInto(searchInput, 'fail');
        await settle();
        typeInto(searchInput, 'none');
        await settle();
        expect(subjectSearchAPI.autocomplete).toHaveBeenCalledTimes(2);
        expect(document.body.querySelectorAll('.ant-select-item-option')).toHaveLength(0);
    });

    it('keeps the default site configuration and directories when the backend answers without data or fails', async () => {
        jest.mocked(webSiteConfigurationAPI.getAll).mockResolvedValue({data: undefined});
        jest.mocked(pageAPI.getPublicPageDirectories).mockResolvedValue({data: undefined});
        render('/galleries');
        await settle();
        expect(container.textContent).toContain('Vempain');
        expect(container.querySelectorAll('.ant-menu-item a').length).toBeLessThan(3);

        act(() => root.unmount());
        root = createRoot(container);
        jest.mocked(webSiteConfigurationAPI.getAll).mockRejectedValue(new Error('config offline'));
        jest.mocked(pageAPI.getPublicPageDirectories).mockRejectedValue(new Error('directories offline'));
        render('/galleries');
        await settle();
        expect(container.textContent).toContain('Vempain');
        expect(consoleError).toHaveBeenCalledWith('Failed to load site configuration', expect.any(Error));
        expect(consoleError).toHaveBeenCalledWith('Failed to load page directories', expect.any(Error));
    });

    it('submits the typed credentials, shows the failure and clears it when the dialog is cancelled', async () => {
        jest.mocked(authenticationAPI.login).mockResolvedValueOnce({error: 'Invalid credentials'});
        render();
        await settle();
        click(Array.from(container.querySelectorAll('a')).find((link) => link.textContent === 'Login'));
        await settle();

        const inputs = document.body.querySelectorAll('.ant-modal input');
        typeInto(inputs[0] as HTMLInputElement, 'alice');
        typeInto(inputs[1] as HTMLInputElement, 'secret');
        expect((inputs[0] as HTMLInputElement).value).toBe('alice');
        act(() => (document.body.querySelector('.ant-modal form') as HTMLFormElement).dispatchEvent(new Event('submit', {bubbles: true, cancelable: true})));
        await settle();
        expect(authenticationAPI.login).toHaveBeenCalledWith('alice', 'secret');
        expect(document.body.textContent).toContain('Invalid credentials');

        click(document.body.querySelector('button.ant-modal-close'));
        await settle();
        // The login dialog is destroyed when hidden, so no visible modal wrap remains.
        expect(visibleModalWrap()).toBeUndefined();

        // Reopening starts from a clean form: the error was cleared by the cancel.
        click(Array.from(container.querySelectorAll('a')).find((link) => link.textContent === 'Login'));
        await settle();
        const reopened = visibleModalWrap();
        expect(reopened?.textContent).toContain('Kirjaudu');
        expect(reopened?.textContent).not.toContain('Invalid credentials');
    });
});
