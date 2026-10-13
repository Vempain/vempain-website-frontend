import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals';
import {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {AuthProvider, useAuth} from '../../context';
import {authenticationAPI, onSessionExpired} from '../../services';

function Consumer() {
    const auth = useAuth();
    return (
            <div>
                <button id="login" onClick={() => void auth.login('alice', 'wrong').then((result) => {
                    document.getElementById('result')!.textContent = JSON.stringify(result);
                })}/>
                <span id="result"/>
                <span id="state">{String(auth.isAuthenticated)}</span>
            </div>
    );
}

describe('AuthProvider', () => {
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
        jest.mocked(onSessionExpired).mockReset();
        jest.mocked(onSessionExpired).mockImplementation(() => () => undefined);
    });

    it('reports a failed login with the backend error and stays signed out', async () => {
        jest.mocked(authenticationAPI.isAuthenticated).mockReturnValue(false);
        jest.mocked(authenticationAPI.login).mockResolvedValue({error: 'Invalid credentials', status: 401});
        act(() => root.render(<AuthProvider><Consumer/></AuthProvider>));
        act(() => (container.querySelector('#login') as HTMLButtonElement).click());
        await act(async () => {
            await new Promise((resolve) => window.setTimeout(resolve, 5));
        });
        expect(container.querySelector('#result')?.textContent).toBe(JSON.stringify({success: false, error: 'Invalid credentials'}));
        expect(container.querySelector('#state')?.textContent).toBe('false');
    });

    it('ignores session expiry while signed out and unsubscribes on unmount', () => {
        let expire: (() => void) | undefined;
        const unsubscribe = jest.fn();
        jest.mocked(onSessionExpired).mockImplementation((callback: () => void) => {
            expire = callback;
            return unsubscribe;
        });
        jest.mocked(authenticationAPI.isAuthenticated).mockReturnValue(false);
        act(() => root.render(<AuthProvider><Consumer/></AuthProvider>));
        expect(onSessionExpired).toHaveBeenCalledTimes(1);

        act(() => expire?.());
        expect(container.querySelector('#state')?.textContent).toBe('false');
        expect(document.body.querySelector('.ant-message')).toBeNull();

        act(() => root.unmount());
        root = createRoot(container);
        expect(unsubscribe).toHaveBeenCalledTimes(1);
    });
});
