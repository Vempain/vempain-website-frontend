import {describe, expect, it} from '@jest/globals';
import {deepMerge} from '../../tools/deepMerge';

describe('deepMerge', () => {
    it('merges nested objects recursively and keeps untouched branches', () => {
        const base = {
            token: {colorPrimary: '#001122', fontSize: 14},
            components: {Layout: {headerBg: '#ffffff', footerBg: '#eeeeee'}},
        };

        const merged = deepMerge(base, {
            token: {colorPrimary: '#ff0000'},
            components: {Layout: {headerBg: '#000000'}},
        });

        expect(merged).toEqual({
            token: {colorPrimary: '#ff0000', fontSize: 14},
            components: {Layout: {headerBg: '#000000', footerBg: '#eeeeee'}},
        });
    });

    it('does not mutate the base or the nested base objects', () => {
        const nested = {colorPrimary: '#001122'};
        const base = {token: nested};

        const merged = deepMerge(base, {token: {colorPrimary: '#ff0000'}});

        expect(nested.colorPrimary).toBe('#001122');
        expect(base.token).toBe(nested);
        expect(merged.token).not.toBe(nested);
    });

    it('replaces arrays instead of merging them', () => {
        expect(deepMerge({sizes: [1, 2, 3]}, {sizes: [9]})).toEqual({sizes: [9]});
        expect(deepMerge({sizes: {a: 1}}, {sizes: [9]})).toEqual({sizes: [9]});
        expect(deepMerge({sizes: [1, 2]}, {sizes: {a: 1}})).toEqual({sizes: {a: 1}});
    });

    it('replaces primitives, null and undefined overrides', () => {
        expect(deepMerge({a: 1, b: 'x'}, {a: 2})).toEqual({a: 2, b: 'x'});
        expect(deepMerge({a: {b: 1}}, {a: null})).toEqual({a: null});
        expect(deepMerge({a: null}, {a: {b: 1}})).toEqual({a: {b: 1}});

        const overridden = deepMerge({a: {b: 1}}, {a: undefined});
        expect(Object.hasOwn(overridden, 'a')).toBe(true);
        expect(overridden.a).toBeUndefined();
    });

    it('adds keys that are missing from the base', () => {
        expect(deepMerge({a: 1}, {b: {c: 2}})).toEqual({a: 1, b: {c: 2}});
    });

    it('returns a copy of the base when the override is empty', () => {
        const base = {a: 1};
        const merged = deepMerge(base, {});

        expect(merged).toEqual(base);
        expect(merged).not.toBe(base);
    });
});
