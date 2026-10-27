import {trimSlashes} from './VempainTools';

/** Backend path of the front page: the fallback route and the site name link in the sidebar lead to it */
export const DEFAULT_PAGE_PATH = 'index';

export function toFrontendPagePath(filePath: string): string {
    const normalized = trimSlashes(filePath || 'index') || 'index';
    return `/pages/${normalized}`;
}

export function toBackendPagePath(routePath: string): string {
    const normalized = trimSlashes(routePath || 'index') || 'index';
    return decodeURIComponent(normalized);
}

export function toDirectoryIndexFrontendPath(directory: string): string {
    const normalized = trimSlashes(directory);
    const withIndex = normalized.endsWith('/index') ? normalized : `${normalized}/index`;
    return `/pages/${withIndex}`;
}

/**
 * The router path for an anchor href that this single-page application serves itself, or null when the browser should follow the link.
 * Page bodies written in the admin editor link to published pages as `/pages/<path>` (and to files as `/file/<path>`, which the website
 * backend streams); the page links, the gallery routes and the search are followed with the router so the site does not reload.
 * `href` is resolved against `origin`, so a root-relative path, a relative path and an absolute URL of this site all count, while
 * another site, a `/file/...` or `/api/...` path, a `mailto:` or an in-page `#anchor` return null.
 */
export function internalRouteFromHref(href: string | null | undefined, origin: string = window.location.origin): string | null {
    if (!href) {
        return null;
    }

    let url: URL;
    try {
        url = new URL(href, origin);
    } catch {
        return null;
    }

    if (url.origin !== origin) {
        return null;
    }

    const pathname = url.pathname;
    const isSpaRoute = pathname.startsWith('/pages/')
        || pathname === '/galleries' || pathname.startsWith('/galleries/')
        || pathname === '/search';
    if (!isSpaRoute) {
        return null;
    }

    return pathname + url.search + url.hash;
}

export function topDirectoryFromPagesPath(pathname: string): string | null {
    const normalized = trimSlashes(pathname);
    if (!normalized.startsWith('pages/')) {
        return null;
    }

    const rest = normalized.slice('pages/'.length);
    // Treat /pages/index as the root page, not as a top-level directory.
    if (rest === 'index') {
        return null;
    }

    const first = rest.split('/')[0];
    return first || null;
}
