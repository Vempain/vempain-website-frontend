import {jest} from '@jest/globals';

/**
 * Stand-in for `src/services` in the Jest environment. The real service modules read `import.meta.env`, which the CommonJS test compiler
 * rejects, so every relative `.../services` import is redirected here through `moduleNameMapper`.
 *
 * All members are `jest.fn()` with harmless defaults; a test that needs different data either overrides the member with
 * `jest.mocked(...)` or replaces the whole module with a `jest.mock('../../services', () => ({...}))` factory.
 */

const emptyPage = () => ({
    content: [],
    page: 0,
    size: 0,
    total_elements: 0,
    total_pages: 0,
    first: true,
    last: true,
});

export const fileAPI = {
    getFileUrl: jest.fn((filePath: string): string => filePath),
    getFileThumbUrl: jest.fn((filePath: string): string => filePath),
};

export const galleryAPI = {
    getPublicGalleries: jest.fn(() => Promise.resolve({data: []})),
    getGalleryFiles: jest.fn(() => Promise.resolve(emptyPage())),
};

export const pageAPI = {
    getPublicPages: jest.fn(() => Promise.resolve({data: emptyPage()})),
    getPublicPageDirectories: jest.fn(() => Promise.resolve({data: []})),
    getDirectoryTree: jest.fn(() => Promise.resolve({data: []})),
    getPageContent: jest.fn(() => Promise.resolve({data: null})),
};

export const subjectSearchAPI = {
    autocomplete: jest.fn(() => Promise.resolve({data: []})),
    searchByIds: jest.fn(() => Promise.resolve({subjects: [], pages: [], galleries: [], files: []})),
};

export const themeAPI = {
    getDefaultStyle: jest.fn(() => Promise.resolve({data: null})),
};

export const authenticationAPI = {
    login: jest.fn(() => Promise.resolve({data: {token: 'test-token'}})),
    logout: jest.fn(() => Promise.resolve({data: null})),
    isAuthenticated: jest.fn(() => false),
};

export const webSiteConfigurationAPI = {
    getAll: jest.fn(() => Promise.resolve({data: {}})),
};

export const onSessionExpired = jest.fn(() => () => {
});
