import type {WebSiteSubject} from "./WebSiteSubject";

export interface WebSiteGallery {
    id: number;
    gallery_id: number;
    shortname: string | null;
    description: string | null;
    acl_id?: number | null;
    subjects: WebSiteSubject[];
    /** Nick of the admin user who created the gallery; null for rows published before the site named users by nick */
    creator?: string | null;
    created?: string | null;
    /** Nick of the admin user who last changed the gallery; null when never changed */
    modifier?: string | null;
    modified?: string | null;
}
