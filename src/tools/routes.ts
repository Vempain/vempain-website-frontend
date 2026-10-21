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
