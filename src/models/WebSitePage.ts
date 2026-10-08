import type {WebSiteSubject} from "./WebSiteSubject";
import type {PageEmbed} from "./PageEmbed.ts";

export interface WebSitePage {
    id: number;
    page_id: number;
    title: string;
    path?: string;
    file_path?: string;
    header: string;
    body: string;
    /** Raw page specific style text as published by the admin backend */
    page_style: string | null;
    secure: boolean;
    acl_id: number | null;
    creator: string;
    created?: string | null;
    modifier?: string | null;
    modified?: string | null;
    published?: string | null;
    embeds?: PageEmbed[];
    subjects?: WebSiteSubject[];
}
