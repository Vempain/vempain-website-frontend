import type {DirectoryNode} from "../models";

function trimSlashes(value: string) {
    return value.replace(/^\/+|\/+$/g, '');
}

/**
 * The path segment of a navigation tree node: a key without a slash is the segment itself, otherwise the node's `name`, else the
 * last part of the key. The `title` is never used here: it is the header of the page, shown as the label, not a part of its path.
 */
function toPathSegment(node: DirectoryNode) {
    if (!node.key.includes('/')) {
        return node.key
    }
    const name = (node as { name?: unknown }).name
    if (typeof name === 'string' && name.trim()) {
        return name.trim()
    }

    const parts = trimSlashes(node.key).split('/')
    return parts[parts.length - 1]
}

export {trimSlashes, toPathSegment};