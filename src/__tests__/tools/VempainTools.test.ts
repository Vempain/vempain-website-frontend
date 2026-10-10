import {describe, expect, it} from '@jest/globals';
import type {DirectoryNode} from '../../models';
import {toPathSegment, trimSlashes} from '../../tools/VempainTools';

describe('trimSlashes', () => {
    it('removes leading and trailing slashes', () => {
        expect(trimSlashes('/travel/2024/')).toBe('travel/2024');
        expect(trimSlashes('///travel///')).toBe('travel');
        expect(trimSlashes('travel/2024')).toBe('travel/2024');
    });

    it('keeps inner slashes and handles slash only values', () => {
        expect(trimSlashes('a//b')).toBe('a//b');
        expect(trimSlashes('/')).toBe('');
        expect(trimSlashes('')).toBe('');
    });
});

describe('toPathSegment', () => {
    it('returns the key when it holds no slash', () => {
        const node: DirectoryNode = {key: 'travel', title: 'Matkat'};

        expect(toPathSegment(node)).toBe('travel');
    });

    it('prefers the trimmed title for nested keys', () => {
        const node: DirectoryNode = {key: 'travel/2024', title: '  2024  '};

        expect(toPathSegment(node)).toBe('2024');
    });

    it('falls back to the last key part when the title is blank or not a string', () => {
        expect(toPathSegment({key: 'travel/2024/summer', title: '   '})).toBe('summer');
        expect(toPathSegment({key: 'travel/2024/summer', title: ''})).toBe('summer');
        expect(toPathSegment({key: 'travel/2024/summer'} as unknown as DirectoryNode)).toBe('summer');
        expect(toPathSegment({key: 'travel/2024', title: 7} as unknown as DirectoryNode)).toBe('2024');
    });
});
