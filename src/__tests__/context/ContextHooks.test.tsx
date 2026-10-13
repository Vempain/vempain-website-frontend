import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals';
import {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {useAuth} from '../../context/AuthContextInstance';
import {useTheme} from '../../context/ThemeContextInstance';
import {useOpenGraph} from '../../context/OpenGraphContextInstance';

function AuthConsumer() {
    useAuth();
    return null;
}

function ThemeConsumer() {
    useTheme();
    return null;
}

function OpenGraphConsumer() {
    const {setRouteOpenGraph} = useOpenGraph();
    setRouteOpenGraph(null);
    return <div>open graph without provider</div>;
}

describe('context hooks outside their providers', () => {
    let container: HTMLDivElement;
    let root: Root;
    let consoleError: ReturnType<typeof jest.spyOn>;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        consoleError.mockRestore();
    });

    it('useAuth throws without AuthProvider', () => {
        expect(() => act(() => root.render(<AuthConsumer/>))).toThrow('useAuth must be used within AuthProvider');
    });

    it('useTheme throws without ThemeProvider', () => {
        expect(() => act(() => root.render(<ThemeConsumer/>))).toThrow('useTheme must be used within ThemeProvider');
    });

    it('useOpenGraph falls back to a no-op without OpenGraphProvider', () => {
        expect(() => act(() => root.render(<OpenGraphConsumer/>))).not.toThrow();
        expect(container.textContent).toBe('open graph without provider');
    });
});
