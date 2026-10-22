import type {WebSiteSubject} from "./WebSiteSubject";
import type {WebSiteLocation} from "./WebSiteLocation";

export interface WebSiteFile {
    id: number;
    file_id: number;
    acl_id: number | null;
    comment?: string | null;
    file_path: string;
    thumbnail_path?: string | null;
    mimetype: string;
    original_date_time: string | null;
    rights_holder?: string | null;
    rights_terms?: string | null;
    rights_url?: string | null;
    creator_name?: string | null;
    creator_email?: string | null;
    creator_country?: string | null;
    creator_url?: string | null;
    location?: WebSiteLocation | null;
    location_id?: number | null;
    width?: number | null;
    height?: number | null;
    length?: number | null;
    pages?: number | null;
    metadata?: string | null;
    subjects: WebSiteSubject[];
    /** Nick of the admin user who created the resource on the site; null for rows published before the audit trail existed */
    creator?: string | null;
    created?: string | null;
    /** Nick of the admin user who last changed the resource on the site; null when never changed */
    modifier?: string | null;
    modified?: string | null;
}
