import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals';
import {act, type ReactElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import App from '../App';
import {AuthProvider, ThemeProvider} from '../context';
import {authenticationAPI, pageAPI, webSiteConfigurationAPI} from '../services';

class ResizeObserverMock {
    observe() {
    }

    unobserve() {
    }

    disconnect() {
    }
}

Object.defineProperty(globalThis, 'ResizeObserver', {value: ResizeObserverMock});

describe('App', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        jest.clearAllMocks();
        jest.mocked(pageAPI.getPublicPageDirectories).mockResolvedValue({
            data: [{name: 'docs'}],
        });
        jest.mocked(pageAPI.getDirectoryTree).mockResolvedValue({data: []});
        jest.mocked(webSiteConfigurationAPI.getAll).mockResolvedValue({
            data: {'site.name': 'Configured', 'site.description': 'Configured description'},
        });
        jest.mocked(authenticationAPI.login).mockResolvedValue({data: {token: 'token'}});
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
    });

    function render(ui: ReactElement) {
        act(() => root.render(<MemoryRouter initialEntries={['/']}><AuthProvider><ThemeProvider>{ui}</ThemeProvider></AuthProvider></MemoryRouter>));
    }

    async function settle() {
        await act(async () => {
            await new Promise((resolve) => window.setTimeout(resolve, 5));
        });
    }

    it('loads shell data, redirects the root route, opens search, and searches by subjects', async () => {
        render(<App/>);
        await settle();
        expect(container.textContent).toContain('docs');
        expect(container.textContent).toContain('Configured');

        act(() => (container.querySelector('[aria-label="Search"]') as HTMLButtonElement).dispatchEvent(new MouseEvent('click', {
            bubbles: true,
            cancelable: true
        })));
        expect(document.body.textContent).toContain('Etsi');
    });

    it('opens login and handles both failed and successful submissions', async () => {
        jest.mocked(authenticationAPI.login).mockResolvedValueOnce({error: 'Invalid credentials'});
        render(<App/>);
        await settle();
        act(() => (Array.from(container.querySelectorAll('a')).find((link) => link.textContent === 'Login') as HTMLAnchorElement).dispatchEvent(new MouseEvent('click', {
            bubbles: true,
            cancelable: true
        })));
        expect(document.body.textContent).toContain('Kirjaudu sisään');
        const inputs = document.body.querySelectorAll('input');
        act(() => {
            (inputs[0] as HTMLInputElement).value = 'user';
            inputs[0].dispatchEvent(new Event('input', {bubbles: true}));
            (inputs[1] as HTMLInputElement).value = 'bad';
            inputs[1].dispatchEvent(new Event('input', {bubbles: true}));
        });
        act(() => (document.body.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', {bubbles: true, cancelable: true})));
        await settle();
        expect(authenticationAPI.login).toHaveBeenCalledWith('', '');

        act(() => (document.body.querySelector('[aria-label="Close"]') as HTMLButtonElement)?.dispatchEvent(new MouseEvent('click', {
            bubbles: true,
            cancelable: true
        })));
        act(() => (Array.from(container.querySelectorAll('a')).find((link) => link.textContent === 'Login') as HTMLAnchorElement).dispatchEvent(new MouseEvent('click', {
            bubbles: true,
            cancelable: true
        })));
        act(() => (document.body.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', {bubbles: true, cancelable: true})));
        await settle();
        expect(authenticationAPI.login).toHaveBeenCalledTimes(2);
    });
});
