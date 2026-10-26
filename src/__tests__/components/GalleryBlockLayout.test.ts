import {describe, expect, it} from '@jest/globals';
import {GALLERY_GRID_STYLE} from '../../components/GalleryBlockStyles';

/**
 * The gallery fills the available width with as many columns as fit, down to a single column on a phone, instead of forcing a
 * horizontal scroll bar; the single column must also shrink below the thumbnail width on very narrow phones, and no upper limit
 * caps the column count on a wide screen.
 */
describe('gallery grid layout', () => {
    it('fits as many columns as the width allows without an upper limit', () => {
        expect(GALLERY_GRID_STYLE.gridTemplateColumns).toBe('repeat(auto-fill, minmax(min(250px, 100%), 1fr))');
        expect('maxWidth' in GALLERY_GRID_STYLE).toBe(false);
        expect(GALLERY_GRID_STYLE.width).toBe('100%');
        expect(GALLERY_GRID_STYLE.minWidth).toBe(0);
    });
});
