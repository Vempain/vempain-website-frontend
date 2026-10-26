const THUMB_WIDTH = 250;
const GRID_GAP = 12;

/**
 * The grid fits as many thumbnail columns as the available width allows, from one on a narrow phone up to whatever the viewport holds on a wide
 * screen, so the gallery is never capped at a column count and never produces a horizontal scroll bar. A column is at least the thumbnail
 * width, unless the container itself is narrower, in which case the single column shrinks with it.
 */
export const GALLERY_GRID_STYLE = {
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fill, minmax(min(${THUMB_WIDTH}px, 100%), 1fr))`,
    gap: GRID_GAP,
    width: '100%',
    minWidth: 0,
} as const;
