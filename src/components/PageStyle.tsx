import {sanitizePageStyle} from '../tools/pageStyle';

interface PageStyleProps {
    css: string | null | undefined;
}

/**
 * The custom CSS of the shown page (`page_style`, written in the admin editor and published with the page). It is applied to the whole
 * document while the page is shown and removed with it, so a page can both style its own canvas (`.vps-page-canvas`) and override the
 * site's default style, for example the `:root` variables of `App.css`. Nothing is rendered without CSS.
 */
export function PageStyle({css}: PageStyleProps) {
    const style = sanitizePageStyle(css);
    if (!style) {
        return null;
    }
    return <style data-testid="page-style">{style}</style>;
}
