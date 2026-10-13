import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals';
import {act, type ReactElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {LocationBadge} from '../../components/LocationBadge';
import {TopBar} from '../../components/TopBar';
import {AuthProvider} from '../../context';
import {authenticationAPI} from '../../services';

class ResizeObserverMock {
    observe() {
    }

    unobserve() {
    }

    disconnect() {
    }
}

Object.defineProperty(globalThis, 'ResizeObserver', {value: ResizeObserverMock});

describe('TopBar and LocationBadge', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        jest.clearAllMocks();
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
    });

    function render(ui: ReactElement) {
        act(() => root.render(ui));
    }

    it('offers logout to an authenticated visitor and signs out through the authentication service', () => {
        jest.mocked(authenticationAPI.isAuthenticated).mockReturnValue(true);
        render(<AuthProvider><TopBar selectedDirectory={null} directories={[]} onDirectoryClick={jest.fn()} onShowSearch={jest.fn()}/></AuthProvider>);
        const logout = Array.from(container.querySelectorAll('a')).find((link) => link.textContent === 'Logout') as HTMLAnchorElement;
        expect(logout).toBeDefined();
        expect(container.querySelector('.ant-menu-item-selected')).toBeNull();

        act(() => logout.click());
        expect(authenticationAPI.logout).toHaveBeenCalledTimes(1);
        expect(Array.from(container.querySelectorAll('a')).some((link) => link.textContent === 'Login')).toBe(true);
    });

    it('marks the selected directory', () => {
        jest.mocked(authenticationAPI.isAuthenticated).mockReturnValue(false);
        render(<AuthProvider><TopBar selectedDirectory="docs" directories={[{name: 'docs'}, {name: 'blog'}]} onDirectoryClick={jest.fn()}
                                     onShowSearch={jest.fn()}/></AuthProvider>);
        expect(container.querySelector('.ant-menu-item-selected')?.textContent).toBe('docs');
    });

    it('renders a passive badge that swallows clicks when no handler is given', () => {
        const parentClick = jest.fn();
        render(<div onClick={parentClick}><LocationBadge visible/></div>);
        const badge = container.querySelector('[aria-label="Has location"]') as HTMLElement;
        expect(badge.getAttribute('title')).toBe('Has location');
        expect(badge.style.pointerEvents).toBe('none');
        act(() => badge.click());
        expect(parentClick).toHaveBeenCalledTimes(1);
    });

    it('stops the click from reaching the thumbnail when it opens the location', () => {
        const parentClick = jest.fn();
        const onClick = jest.fn();
        render(<div onClick={parentClick}><LocationBadge visible onClick={onClick}/></div>);
        const badge = container.querySelector('[aria-label="Has location"]') as HTMLElement;
        expect(badge.getAttribute('title')).toBe('Show location');
        act(() => badge.click());
        expect(onClick).toHaveBeenCalledTimes(1);
        expect(parentClick).not.toHaveBeenCalled();
    });
});
