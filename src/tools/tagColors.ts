/** The Ant Design preset tag colors a page tag can take, in the order they are assigned. */
export const TAG_COLORS = ['magenta', 'red', 'volcano', 'orange', 'gold', 'lime', 'green', 'cyan', 'blue', 'geekblue', 'purple'] as const;

export type TagColor = typeof TAG_COLORS[number];

/**
 * A stable color for a tag name: the same name always gets the same color, and different names spread over the palette. Case and surrounding
 * spaces do not change the color.
 */
export function tagColor(name: string | null | undefined): TagColor {
    const normalized = (name ?? '').trim().toLowerCase();
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
        hash = (hash * 31 + normalized.charCodeAt(i)) >>> 0;
    }
    return TAG_COLORS[hash % TAG_COLORS.length];
}
