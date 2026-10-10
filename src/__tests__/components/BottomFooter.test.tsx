import {afterEach, beforeEach, describe, expect, it} from '@jest/globals';
import {act, type ReactElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {BottomFooter} from '../../components/BottomFooter';
import buildInfo from '../../buildInfo.json';

const env = (globalThis as unknown as { __VITE_ENV__: Record<string, string | undefined> }).__VITE_ENV__;

describe('BottomFooter', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        delete env.VITE_APP_POWERED_BY_TEXT;
        delete env.VITE_APP_POWERED_BY_URL;
        delete env.VITE_APP_POWERED_BY_LABEL;
        delete env.VITE_APP_VEMPAIN_COPYRIGHT_FOOTER;
    });

    function render(ui: ReactElement) {
        act(() => root.render(ui));
    }

    it('shows the copyright, the build info and the default powered-by link', () => {
        env.VITE_APP_VEMPAIN_COPYRIGHT_FOOTER = '© Vempain 2026';

        render(<BottomFooter/>);

        expect(container.textContent).toContain('© Vempain 2026');
        expect(container.textContent).toContain(`v${buildInfo.version} built: ${buildInfo.buildTime}`);
        expect(container.textContent).toContain('Powered by');

        const link = container.querySelector('a') as HTMLAnchorElement;
        expect(link.href).toBe('https://vempain.poltsi.fi/');
        expect(link.textContent).toBe('Vempain System');
        expect(link.rel).toBe('noopener noreferrer');
    });

    it('uses the configured powered-by link only when text, url and label are all set', () => {
        env.VITE_APP_POWERED_BY_TEXT = 'Running on';
        env.VITE_APP_POWERED_BY_URL = 'https://example.org/';

        render(<BottomFooter/>);

        expect(container.textContent).toContain('Powered by');
        expect((container.querySelector('a') as HTMLAnchorElement).href).toBe('https://vempain.poltsi.fi/');

        env.VITE_APP_POWERED_BY_LABEL = 'Example';
        render(<BottomFooter/>);

        expect(container.textContent).toContain('Running on');
        const link = container.querySelector('a') as HTMLAnchorElement;
        expect(link.href).toBe('https://example.org/');
        expect(link.textContent).toBe('Example');
    });
});
