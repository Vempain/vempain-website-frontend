import {TextDecoder, TextEncoder} from 'util';

(globalThis as { TextEncoder?: typeof TextEncoder }).TextEncoder = TextEncoder;
(globalThis as { TextDecoder?: typeof TextDecoder }).TextDecoder = TextDecoder;

// React 19 only treats `act()` as the concurrent test helper when the environment announces itself.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// `jest/tsJestImportMetaTransformer.cjs` rewrites every `import.meta.env` read in the sources to this global.
(globalThis as { __VITE_ENV__?: Record<string, string | undefined> }).__VITE_ENV__ = {
    VITE_API_BASE_URL: '',
    VITE_APP_API_URL: '/api',
};

if (typeof window !== 'undefined' && !window.matchMedia) {
    window.matchMedia = ((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {
        },
        removeListener: () => {
        },
        addEventListener: () => {
        },
        removeEventListener: () => {
        },
        dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
}

