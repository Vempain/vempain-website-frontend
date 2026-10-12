import type {OpenGraph, WebSitePage} from '../models';
import {toFrontendPagePath} from './routes';

/** Marks the head elements this module manages, so that they are replaced as a whole on every route change. */
export const OPEN_GRAPH_ATTRIBUTE = 'data-vempain-open-graph';

export interface HeadTag {
    element: 'meta' | 'link';
    /** The attribute that identifies the tag: `{property: 'og:title'}`, `{name: 'description'}` or `{rel: 'canonical'}`. */
    key: Record<string, string>;
    /** `content` of a meta tag, `href` of a link */
    value: string;
}

export interface HeadData {
    title: string;
    tags: HeadTag[];
}

/** Site level metadata, used for routes that have no metadata of their own. */
export function siteOpenGraph(siteName: string, siteDescription: string | null, path: string): OpenGraph {
    return {
        type: 'website',
        site_name: siteName,
        title: siteName,
        description: siteDescription,
        path,
        image_path: null,
        image_mimetype: null,
        image_width: null,
        image_height: null,
        published: null,
        modified: null,
    };
}

/**
 * Metadata derived from a page that arrived without `open_graph` (an older backend). The site name is left empty and the description
 * null when the page has no header; the provider fills both in from the site configuration.
 */
export function pageOpenGraph(page: WebSitePage): OpenGraph {
    return {
        type: 'article',
        site_name: '',
        title: page.title,
        description: page.header?.trim() ? page.header : null,
        path: toFrontendPagePath(page.file_path ?? page.path ?? 'index'),
        image_path: null,
        image_mimetype: null,
        image_width: null,
        image_height: null,
        published: page.published ?? null,
        modified: page.modified ?? null,
    };
}

/**
 * Builds the document title and the head tags of a route.
 *
 * @param meta    metadata of the route
 * @param origin  scheme and host the site is served from, e.g. `window.location.origin`
 * @param fileUrl turns a published file path into the URL it is served from (`fileAPI.getFileUrl`); an empty result means no image
 */
export function buildHeadData(meta: OpenGraph, origin: string, fileUrl: (path: string) => string): HeadData {
    const title = meta.title && meta.site_name && meta.title !== meta.site_name ? `${meta.title} | ${meta.site_name}` : meta.title || meta.site_name;
    const url = absoluteUrl(meta.path, origin) ?? origin + meta.path;
    const image = meta.image_path ? absoluteUrl(fileUrl(meta.image_path), origin) : null;
    const tags: HeadTag[] = [];
    const add = (attribute: 'name' | 'property', name: string, value: string | number | null | undefined) => {
        if (value !== null && value !== undefined && value !== '') {
            tags.push({element: 'meta', key: {[attribute]: name}, value: String(value)});
        }
    };

    add('name', 'description', meta.description);
    tags.push({element: 'link', key: {rel: 'canonical'}, value: url});
    add('property', 'og:type', meta.type);
    add('property', 'og:site_name', meta.site_name);
    add('property', 'og:title', meta.title || meta.site_name);
    add('property', 'og:description', meta.description);
    add('property', 'og:url', url);
    if (image) {
        add('property', 'og:image', image);
        add('property', 'og:image:type', meta.image_mimetype);
        add('property', 'og:image:width', meta.image_width);
        add('property', 'og:image:height', meta.image_height);
        add('property', 'og:image:alt', meta.title);
    }
    if (meta.type === 'article') {
        add('property', 'article:published_time', meta.published);
        add('property', 'article:modified_time', meta.modified);
    }
    add('name', 'twitter:card', image ? 'summary_large_image' : 'summary');
    add('name', 'twitter:title', meta.title || meta.site_name);
    add('name', 'twitter:description', meta.description);
    add('name', 'twitter:image', image);

    return {title, tags};
}

/** Sets the document title and replaces the managed head tags. Attributes are set through the DOM, never through HTML text. */
export function applyHeadData(doc: Document, head: HeadData): void {
    doc.title = head.title;
    doc.head.querySelectorAll(`[${OPEN_GRAPH_ATTRIBUTE}]`).forEach((element) => element.remove());
    for (const tag of head.tags) {
        const element = doc.createElement(tag.element);
        const [[name, id]] = Object.entries(tag.key);
        element.setAttribute(name, id);
        element.setAttribute(tag.element === 'link' ? 'href' : 'content', tag.value);
        element.setAttribute(OPEN_GRAPH_ATTRIBUTE, '');
        doc.head.appendChild(element);
    }
}

function absoluteUrl(value: string, origin: string): string | null {
    if (!value) {
        return null;
    }
    try {
        return new URL(value, origin).href;
    } catch {
        return null;
    }
}
