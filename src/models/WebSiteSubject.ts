export interface WebSiteSubject {
    id: number;
    subject: string | null;
    subject_de: string | null;
    subject_en: string | null;
    subject_es: string | null;
    subject_fi: string | null;
    subject_se: string | null;
    /** Nick of the admin user who created the resource on the site; null for rows published before the audit trail existed */
    creator?: string | null;
    created?: string | null;
    /** Nick of the admin user who last changed the resource on the site; null when never changed */
    modifier?: string | null;
    modified?: string | null;
}