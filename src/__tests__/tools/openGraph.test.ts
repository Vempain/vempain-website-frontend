import {beforeEach, describe, expect, it} from '@jest/globals';
import type {OpenGraph, WebSitePage} from '../../models';
import {applyHeadData, buildHeadData, OPEN_GRAPH_ATTRIBUTE, pageOpenGraph, siteOpenGraph} from '../../tools/openGraph';

const fileUrl = (path: string) => (path.includes('..') ? '' : `/file/${path}`);

const article: OpenGraph = {
    type: 'article',
    site_name: 'My Site',
    title: 'Summer trip',
    description: 'Photos from the trip',
    path: '/pages/trips/summer',
    image_path: 'trips/summer/beach.jpg',
    image_mimetype: 'image/jpeg',
    image_width: 1400,
    image_height: 933,
    published: '2024-05-15T12:00:00',
    modified: '2024-05-16T09:30:00',
};

function tagValue(head: ReturnType<typeof buildHeadData>, attribute: string, name: string): string | undefined {
    return head.tags.find((tag) => tag.key[attribute] === name)?.value;
}

describe('openGraph tools', () => {
    beforeEach(() => {
        document.head.innerHTML = '';
        document.title = '';
    });

    it('builds the site level metadata of a route', () => {
        const meta = siteOpenGraph('My Site', 'About the site', '/search');

        expect(meta).toMatchObject({type: 'website', site_name: 'My Site', title: 'My Site', description: 'About the site', path: '/search', image_path: null});
    });

    it('derives metadata from a page that arrived without open_graph', () => {
        const page = {
            id: 1, page_id: 1, title: 'Summer trip', file_path: 'trips/summer', header: '  ', body: '', page_style: null, secure: false,
            acl_id: null, creator: 'alice', published: '2024-05-15T12:00:00',
        } as WebSitePage;

        const meta = pageOpenGraph(page);

        expect(meta).toMatchObject({type: 'article', site_name: '', title: 'Summer trip', description: null, path: '/pages/trips/summer', image_path: null});
        expect(meta.published).toBe('2024-05-15T12:00:00');
        expect(meta.modified).toBeNull();
        expect(pageOpenGraph({...page, header: 'Header', file_path: undefined, path: 'trips/other'}).path).toBe('/pages/trips/other');
        expect(pageOpenGraph({...page, header: 'Header'}).description).toBe('Header');
        expect(pageOpenGraph({...page, file_path: undefined, path: undefined}).path).toBe('/pages/index');
    });

    it('builds absolute URLs and the full tag set for an article with an image', () => {
        const head = buildHeadData(article, 'https://site.example', fileUrl);

        expect(head.title).toBe('Summer trip | My Site');
        expect(tagValue(head, 'rel', 'canonical')).toBe('https://site.example/pages/trips/summer');
        expect(tagValue(head, 'name', 'description')).toBe('Photos from the trip');
        expect(tagValue(head, 'property', 'og:type')).toBe('article');
        expect(tagValue(head, 'property', 'og:site_name')).toBe('My Site');
        expect(tagValue(head, 'property', 'og:title')).toBe('Summer trip');
        expect(tagValue(head, 'property', 'og:url')).toBe('https://site.example/pages/trips/summer');
        expect(tagValue(head, 'property', 'og:image')).toBe('https://site.example/file/trips/summer/beach.jpg');
        expect(tagValue(head, 'property', 'og:image:type')).toBe('image/jpeg');
        expect(tagValue(head, 'property', 'og:image:width')).toBe('1400');
        expect(tagValue(head, 'property', 'og:image:height')).toBe('933');
        expect(tagValue(head, 'property', 'og:image:alt')).toBe('Summer trip');
        expect(tagValue(head, 'property', 'article:published_time')).toBe('2024-05-15T12:00:00');
        expect(tagValue(head, 'property', 'article:modified_time')).toBe('2024-05-16T09:30:00');
        expect(tagValue(head, 'name', 'twitter:card')).toBe('summary_large_image');
        expect(tagValue(head, 'name', 'twitter:image')).toBe('https://site.example/file/trips/summer/beach.jpg');
    });

    it('omits the image, description and article tags when there are none', () => {
        const head = buildHeadData(siteOpenGraph('My Site', null, '/galleries'), 'https://site.example', fileUrl);

        expect(head.title).toBe('My Site');
        expect(tagValue(head, 'property', 'og:title')).toBe('My Site');
        expect(tagValue(head, 'property', 'og:url')).toBe('https://site.example/galleries');
        expect(tagValue(head, 'name', 'description')).toBeUndefined();
        expect(tagValue(head, 'property', 'og:image')).toBeUndefined();
        expect(tagValue(head, 'property', 'article:published_time')).toBeUndefined();
        expect(tagValue(head, 'name', 'twitter:card')).toBe('summary');
        expect(tagValue(head, 'name', 'twitter:image')).toBeUndefined();
    });

    it('drops an image whose path the file URL builder rejects and copes with odd paths', () => {
        const rejected = buildHeadData({...article, image_path: '../escape.jpg'}, 'https://site.example', fileUrl);
        expect(tagValue(rejected, 'property', 'og:image')).toBeUndefined();
        expect(tagValue(rejected, 'name', 'twitter:card')).toBe('summary');

        const spaced = buildHeadData({...article, path: '/pages/trips/summer holiday', image_path: null}, 'https://site.example', fileUrl);
        expect(tagValue(spaced, 'property', 'og:url')).toBe('https://site.example/pages/trips/summer%20holiday');

        const untitled = buildHeadData({...article, title: '', image_path: null}, 'https://site.example', fileUrl);
        expect(untitled.title).toBe('My Site');
        expect(tagValue(untitled, 'property', 'og:title')).toBe('My Site');
    });

    it('applies the head data and replaces the managed tags on the next call, leaving other tags alone', () => {
        const foreign = document.createElement('meta');
        foreign.setAttribute('name', 'viewport');
        document.head.appendChild(foreign);

        applyHeadData(document, buildHeadData(article, 'https://site.example', fileUrl));
        expect(document.title).toBe('Summer trip | My Site');
        expect(document.head.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe('https://site.example/file/trips/summer/beach.jpg');
        expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://site.example/pages/trips/summer');
        const managed = document.head.querySelectorAll(`[${OPEN_GRAPH_ATTRIBUTE}]`).length;
        expect(managed).toBeGreaterThan(10);

        applyHeadData(document, buildHeadData(siteOpenGraph('My Site', null, '/galleries'), 'https://site.example', fileUrl));
        expect(document.title).toBe('My Site');
        expect(document.head.querySelector('meta[property="og:image"]')).toBeNull();
        expect(document.head.querySelectorAll('meta[property="og:title"]')).toHaveLength(1);
        expect(document.head.querySelectorAll(`[${OPEN_GRAPH_ATTRIBUTE}]`).length).toBeLessThan(managed);
        expect(document.head.querySelector('meta[name="viewport"]')).not.toBeNull();
    });
});
