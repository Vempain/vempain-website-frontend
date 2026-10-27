/**
 * Class of the element the page content is rendered into: the hook a page's own CSS (`page_style`, written in the admin editor, whose
 * canvas carries the same class) uses to style the canvas. Keep it identical to `PAGE_CANVAS_CLASS` of `@vempain/vempain-rt-editor`.
 */
export const PAGE_CANVAS_CLASS = 'vps-page-canvas';

/**
 * The custom CSS of a page as it may be placed into a style element: trimmed, empty for none, and with every `</style` sequence
 * neutralised (`<\/style`, which CSS reads as the same characters) so the text can never close the element it is written into.
 */
export function sanitizePageStyle(css: string | null | undefined): string {
    const trimmed = (css ?? '').trim();
    return trimmed.replace(/<\/(style)/gi, '<\\/$1');
}
