/** Node of the page navigation tree (`GET /public/page-directories/{directory}/tree`, backend `DirectoryNodeResponse`) */
export interface DirectoryNode {
    /** Label shown in the sidebar: the header of the page, for a directory the header of its index page, else the path segment */
    title: string;
    /** Full page path for a page, path segment for a directory */
    key: string;
    /** Path segment of the node; absent in answers of a backend older than the header titles */
    name?: string;
    is_leaf?: boolean;
    children?: DirectoryNode[];
}
