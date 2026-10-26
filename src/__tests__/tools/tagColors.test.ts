import {describe, expect, it} from '@jest/globals';
import {TAG_COLORS, tagColor} from '../../tools/tagColors';

describe('tagColor', () => {
    it('is stable for a name regardless of case and spacing', () => {
        expect(tagColor('Travel')).toBe(tagColor(' travel '));
        expect(TAG_COLORS).toContain(tagColor('travel'));
        expect(tagColor('')).toBe(TAG_COLORS[0]);
        expect(tagColor(null)).toBe(TAG_COLORS[0]);
    });

    it('spreads different names over the palette', () => {
        const colors = new Set(['travel', 'finland', 'archive', 'family', 'nature', 'city', 'winter', 'summer'].map(tagColor));
        expect(colors.size).toBeGreaterThan(2);
    });
});
