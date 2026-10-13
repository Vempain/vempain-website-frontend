import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals';
import {act, type ReactElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import LocationMap from '../../components/LocationMap';
import {LocationModal} from '../../components/LocationModal';
import type {WebSiteLocation} from '../../models';

class ResizeObserverMock {
    observe() {
    }

    unobserve() {
    }

    disconnect() {
    }
}

Object.defineProperty(globalThis, 'ResizeObserver', {value: ResizeObserverMock});

/** Only the coordinates, a state and a sub-location are known: every optional detail line has to cope with the missing values. */
const sparseLocation: WebSiteLocation = {
    id: 9, latitude: 61.5, latitude_ref: 'N', longitude: 23.75, longitude_ref: 'E', altitude: null, direction: null, satellite_count: null,
    country: null, state: 'Pirkanmaa', city: null, street: null, sub_location: 'Harbour',
};

const bareLocation: WebSiteLocation = {
    id: 10, latitude: 61.5, latitude_ref: 'N', longitude: 23.75, longitude_ref: 'E',
};

describe('location views with sparse data', () => {
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
    });

    function render(ui: ReactElement) {
        act(() => root.render(ui));
    }

    it('maps only the known details', () => {
        render(<LocationMap location={sparseLocation}/>);
        expect(container.textContent).not.toContain('Altitude');
        expect(container.textContent).not.toContain('Direction');
        expect(container.textContent).not.toContain('Satellites');
        expect(container.textContent).toContain('Pirkanmaa');
        expect(container.textContent).toContain('Harbour');
        expect(container.querySelector('[data-testid="marker"]')?.getAttribute('data-position')).toBe('61.5,23.75');

        render(<LocationMap location={bareLocation}/>);
        expect(container.textContent).not.toContain('Pirkanmaa');
        expect(container.textContent).not.toContain('Harbour');
        expect(container.querySelector('[data-testid="map-container"]')).not.toBeNull();
    });

    it('describes a sparse location in the modal and closes through the cancel control', async () => {
        const onClose = jest.fn();
        render(<LocationModal open location={sparseLocation} onClose={onClose}/>);
        await act(async () => Promise.resolve());
        const modal = document.body.querySelector('.ant-modal') as HTMLElement;
        expect(modal.textContent).toContain('Pirkanmaa');
        expect(modal.textContent).toContain('Harbour');
        expect(modal.textContent).not.toContain('Altitude');
        expect(modal.textContent).not.toContain('Direction');
        expect(modal.textContent).not.toContain('Satellites');

        render(<LocationModal open location={bareLocation} onClose={onClose}/>);
        await act(async () => Promise.resolve());
        expect(document.body.textContent).not.toContain('Harbour');
        expect(document.body.querySelector('[data-testid="map-container"]')).not.toBeNull();
    });
});
