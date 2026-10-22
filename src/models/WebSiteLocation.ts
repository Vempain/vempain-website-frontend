export interface WebSiteLocation {
    id: number;
    latitude: number;
    latitude_ref: string;
    longitude: number;
    longitude_ref: string;
    altitude?: number | null;
    direction?: number | null;
    satellite_count?: number | null;
    country?: string | null;
    state?: string | null;
    city?: string | null;
    street?: string | null;
    sub_location?: string | null;
    /** Nick of the admin user who created the resource on the site; null for rows published before the audit trail existed */
    creator?: string | null;
    created?: string | null;
    /** Nick of the admin user who last changed the resource on the site; null when never changed */
    modifier?: string | null;
    modified?: string | null;
}
