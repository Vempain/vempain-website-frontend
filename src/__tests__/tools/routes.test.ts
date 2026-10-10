import {describe, expect, it} from '@jest/globals';
import {toBackendPagePath, toDirectoryIndexFrontendPath, toFrontendPagePath, topDirectoryFromPagesPath} from '../../tools/routes';

describe('toFrontendPagePath', () => {
    it('prefixes the trimmed backend file path with the pages route', () => {
        expect(toFrontendPagePath('travel/2024/index')).toBe('/pages/travel/2024/index');
        expect(toFrontendPagePath('/travel/2024/')).toBe('/pages/travel/2024');
    });

    it('falls back to the index page for empty and slash only paths', () => {
        expect(toFrontendPagePath('')).toBe('/pages/index');
        expect(toFrontendPagePath('/')).toBe('/pages/index');
        expect(toFrontendPagePath('///')).toBe('/pages/index');
    });
});

describe('toBackendPagePath', () => {
    it('trims the slashes and decodes the route path', () => {
        expect(toBackendPagePath('/travel/2024/index')).toBe('travel/2024/index');
        expect(toBackendPagePath('travel/kes%C3%A4%202024')).toBe('travel/kesä 2024');
    });

    it('falls back to index for empty and slash only paths', () => {
        expect(toBackendPagePath('')).toBe('index');
        expect(toBackendPagePath('/')).toBe('index');
    });

    it('round trips with toFrontendPagePath', () => {
        const frontend = toFrontendPagePath('travel/2024/index');

        expect(toBackendPagePath(frontend.replace('/pages/', ''))).toBe('travel/2024/index');
    });
});

describe('toDirectoryIndexFrontendPath', () => {
    it('appends the index page to a directory', () => {
        expect(toDirectoryIndexFrontendPath('travel')).toBe('/pages/travel/index');
        expect(toDirectoryIndexFrontendPath('/travel/2024/')).toBe('/pages/travel/2024/index');
    });

    it('does not duplicate an index that is already present', () => {
        expect(toDirectoryIndexFrontendPath('travel/index')).toBe('/pages/travel/index');
        expect(toDirectoryIndexFrontendPath('/travel/index/')).toBe('/pages/travel/index');
    });
});

describe('topDirectoryFromPagesPath', () => {
    it('returns the first directory below the pages route', () => {
        expect(topDirectoryFromPagesPath('/pages/travel/2024/index')).toBe('travel');
        expect(topDirectoryFromPagesPath('pages/travel')).toBe('travel');
        expect(topDirectoryFromPagesPath('/pages/travel/')).toBe('travel');
    });

    it('treats the root index page as no directory', () => {
        expect(topDirectoryFromPagesPath('/pages/index')).toBeNull();
    });

    it('returns null for paths outside the pages route', () => {
        expect(topDirectoryFromPagesPath('/galleries/12')).toBeNull();
        expect(topDirectoryFromPagesPath('/pages')).toBeNull();
        expect(topDirectoryFromPagesPath('/')).toBeNull();
    });

    it('returns null when the first segment below pages is empty', () => {
        expect(topDirectoryFromPagesPath('/pages//travel')).toBeNull();
    });
});
