/**
 * Encode server-provided path values for use below a fixed API path.
 * Dot-segments, control characters, and backslashes are rejected.
 */
export function encodeApiPath(value: string): string {
    if (!value || value.includes('\\') || [...value].some((character) => character.charCodeAt(0) < 0x20)) {
        return '';
    }

    const segments = value.split('/').filter(Boolean);
    if (segments.some((segment) => segment === '.' || segment === '..')) {
        return '';
    }

    return segments.map((segment) => encodeURIComponent(segment)).join('/');
}
