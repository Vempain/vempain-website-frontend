import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals';
import {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {ThemeProvider, useTheme} from '../../context';
import {themeAPI} from '../../services';
import type {WebSiteStyle} from '../../models';

const defaultStyle: WebSiteStyle = {
    color: {primary: '#111111', background: '#000000', text: '#eeeeee', textMuted: '#999999', border: '#333333', surface: '#222222'},
    fontFamily: 'serif',
    spacing_unit: 8,
    nested: {deep: {value: 'x'}},
    list: ['ignored'],
    missing: null,
};

const pageStyle: WebSiteStyle = {
    color: {primary: '#ff0000', secondary: '#00ff00', primaryHover: '#0000ff', link: '#abcdef', success: '#0f0', warning: '#ff0', danger: '#f00'},
};

function Consumer() {
    const theme = useTheme();
    const token = theme.antdTheme.token ?? {};
    return (
            <div>
                <button id="page" onClick={() => theme.applyPageStyle(pageStyle)}/>
                <button id="clear" onClick={() => theme.applyPageStyle(null)}/>
                <button id="reset" onClick={theme.resetToDefault}/>
                <button id="default" onClick={() => theme.setDefaultStyle(defaultStyle)}/>
                <span id="primary">{String(token.colorPrimary ?? '')}</span>
                <span id="link">{String(token.colorLink ?? '')}</span>
                <span id="text">{String(token.colorText ?? '')}</span>
                <span id="active">{theme.activeStyle === theme.defaultStyle ? 'default' : 'page'}</span>
            </div>
    );
}

describe('ThemeProvider', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        jest.clearAllMocks();
        document.documentElement.removeAttribute('style');
        delete document.documentElement.dataset.vempainStyleVars;
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
    });

    function text(id: string): string {
        return container.querySelector(`#${id}`)?.textContent ?? '';
    }

    function click(id: string) {
        act(() => (container.querySelector(`#${id}`) as HTMLButtonElement).click());
    }

    async function settle() {
        await act(async () => {
            await new Promise((resolve) => window.setTimeout(resolve, 5));
        });
    }

    it('loads the default style, exposes it as CSS variables and antd tokens, and merges page styles over it', async () => {
        jest.mocked(themeAPI.getDefaultStyle).mockResolvedValue({data: defaultStyle});
        act(() => root.render(<ThemeProvider><Consumer/></ThemeProvider>));
        await settle();

        const rootStyle = document.documentElement.style;
        expect(rootStyle.getPropertyValue('--color-primary')).toBe('#111111');
        expect(rootStyle.getPropertyValue('--color-text-muted')).toBe('#999999');
        expect(rootStyle.getPropertyValue('--spacing-unit')).toBe('8');
        expect(rootStyle.getPropertyValue('--nested-deep-value')).toBe('x');
        expect(rootStyle.getPropertyValue('--missing')).toBe('');
        expect(text('primary')).toBe('#111111');
        expect(text('text')).toBe('#eeeeee');
        expect(text('active')).toBe('default');

        click('page');
        expect(text('primary')).toBe('#ff0000');
        expect(text('link')).toBe('#abcdef');
        expect(text('text')).toBe('#eeeeee');
        expect(text('active')).toBe('page');
        expect(rootStyle.getPropertyValue('--color-primary')).toBe('#ff0000');
        expect(rootStyle.getPropertyValue('--font-family')).toBe('serif');

        click('clear');
        expect(text('primary')).toBe('#111111');
        expect(text('active')).toBe('default');

        click('page');
        click('reset');
        expect(text('primary')).toBe('#111111');
        expect(rootStyle.getPropertyValue('--color-link')).toBe('');
    });

    it('applies a page style on its own when no default style is available', async () => {
        jest.mocked(themeAPI.getDefaultStyle).mockResolvedValue({error: 'missing'});
        act(() => root.render(<ThemeProvider><Consumer/></ThemeProvider>));
        await settle();
        expect(text('primary')).toBe('');
        expect(document.documentElement.dataset.vempainStyleVars).toBe('');

        click('page');
        expect(text('primary')).toBe('#ff0000');
        expect(text('active')).toBe('page');

        click('clear');
        expect(text('primary')).toBe('');
        expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe('');

        click('default');
        expect(text('primary')).toBe('#111111');
        expect(text('active')).toBe('default');
    });

    it('maps no antd tokens from a style whose colour section is not an object', async () => {
        jest.mocked(themeAPI.getDefaultStyle).mockResolvedValue({data: {color: 'red'}});
        act(() => root.render(<ThemeProvider><Consumer/></ThemeProvider>));
        await settle();
        expect(text('primary')).toBe('');
        expect(text('text')).toBe('');
        expect(document.documentElement.style.getPropertyValue('--color')).toBe('red');
    });

    it('ignores a default style that arrives after unmounting', async () => {
        let resolveStyle: (value: { data: WebSiteStyle }) => void = () => undefined;
        jest.mocked(themeAPI.getDefaultStyle).mockReturnValue(new Promise((resolve) => {
            resolveStyle = resolve;
        }));
        act(() => root.render(<ThemeProvider><Consumer/></ThemeProvider>));
        act(() => root.unmount());
        root = createRoot(container);
        await act(async () => {
            resolveStyle({data: defaultStyle});
            await Promise.resolve();
        });
        expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe('');
    });
});
