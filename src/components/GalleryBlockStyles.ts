const THUMB_WIDTH = 250;
const MAX_COLUMNS = 5;
const GRID_GAP = 12;

/**
 * The grid fits as many thumbnail columns as the available width allows, from {@link MAX_COLUMNS} down to a single column, so a
 * narrow viewport never produces a horizontal scroll bar. A column is at least the thumbnail width, unless the container itself is
 * narrower, in which case the single column shrinks with it.
 */
export const GALLERY_GRID_STYLE = {
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fill, minmax(min(${THUMB_WIDTH}px, 100%), 1fr))`,
    gap: GRID_GAP,
    width: '100%',
    maxWidth: MAX_COLUMNS * THUMB_WIDTH + (MAX_COLUMNS - 1) * GRID_GAP,
    minWidth: 0,
} as const;
