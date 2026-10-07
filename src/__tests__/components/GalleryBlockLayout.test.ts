import {describe, expect, it} from '@jest/globals';
import {GALLERY_GRID_STYLE} from '../../components/GalleryBlockStyles';

/**
 * The gallery must shrink from five columns down to a single column with the available width instead of forcing a horizontal
 * scroll bar; the single column must also shrink below the thumbnail width on very narrow phones.
 */
describe('gallery grid layout', () => {
    it('fits as many columns as the width allows, at most five', () => {
        expect(GALLERY_GRID_STYLE.gridTemplateColumns).toBe('repeat(auto-fill, minmax(min(250px, 100%), 1fr))');
        expect(GALLERY_GRID_STYLE.maxWidth).toBe(5 * 250 + 4 * 12);
        expect(GALLERY_GRID_STYLE.width).toBe('100%');
        expect(GALLERY_GRID_STYLE.minWidth).toBe(0);
    });
});
