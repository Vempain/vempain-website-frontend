import type {CSSProperties, ReactNode} from 'react';

/**
 * Stand-in for the ESM-only `react-leaflet` package. The components render plain markup that exposes the props `src/components/LocationMap.tsx`
 * passes, and `useMap()` returns `mockMapInstance`, whose calls a test can inspect through `jest.requireMock('react-leaflet')`.
 */

const calls: Array<{ center: [number, number]; zoom: number }> = [];

export const mockMapInstance = {
    setViewCalls: calls,
    invalidateSizeCount: 0,
    setView(center: [number, number], zoom: number) {
        calls.push({center, zoom});
    },
    invalidateSize() {
        mockMapInstance.invalidateSizeCount += 1;
    },
    reset() {
        calls.length = 0;
        mockMapInstance.invalidateSizeCount = 0;
    },
};

export function useMap() {
    return mockMapInstance;
}

export function MapContainer({children, center, zoom, style}: {
    children?: ReactNode;
    center?: [number, number];
    zoom?: number;
    style?: CSSProperties;
    scrollWheelZoom?: boolean;
}) {
    return (
            <div data-testid="map-container" data-center={center?.join(',')} data-zoom={zoom} style={style}>{children}</div>
    );
}

export function TileLayer({url, attribution}: { url?: string; attribution?: string }) {
    return <div data-testid="tile-layer" data-url={url} data-attribution={attribution}/>;
}

export function Marker({children, position}: { children?: ReactNode; position?: [number, number] }) {
    return <div data-testid="marker" data-position={position?.join(',')}>{children}</div>;
}

export function Popup({children}: { children?: ReactNode }) {
    return <div data-testid="popup">{children}</div>;
}
