import {describe, expect, it} from '@jest/globals';
import {PAGE_CANVAS_CLASS, sanitizePageStyle} from '../../tools/pageStyle';

describe('pageStyle', () => {
    it('names the canvas class the admin editor uses', () => {
        expect(PAGE_CANVAS_CLASS).toBe('vps-page-canvas');
    });

    it('trims the CSS and turns nothing into an empty string', () => {
        expect(sanitizePageStyle('  .a { color: red; }\n')).toBe('.a { color: red; }');
        expect(sanitizePageStyle(null)).toBe('');
        expect(sanitizePageStyle(undefined)).toBe('');
        expect(sanitizePageStyle('   ')).toBe('');
    });

    it('neutralises a closing style tag inside the CSS', () => {
        expect(sanitizePageStyle('.a { content: "</style><script>x()</script>"; }')).toBe('.a { content: "<\\/style><script>x()</script>"; }');
    });
});
