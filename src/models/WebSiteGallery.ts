import type {WebSiteSubject} from "./WebSiteSubject";

export interface WebSiteGallery {
    id: number;
    gallery_id: number;
    shortname: string | null;
    description: string | null;
    acl_id?: number | null;
    subjects: WebSiteSubject[];
}
