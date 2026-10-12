/**
 * Open Graph metadata of a route as delivered by the backend (`OpenGraphResponse`). Paths are site relative: `path` is the frontend route
 * and `image_path` the published file path below `/file`; both become absolute with the origin the site is served from.
 */
export interface OpenGraph {
    /** `article` for a published page, `website` for everything else */
    type: 'article' | 'website';
    site_name: string;
    title: string;
    description: string | null;
    path: string;
    image_path: string | null;
    image_mimetype: string | null;
    image_width: number | null;
    image_height: number | null;
    published: string | null;
    modified: string | null;
}
