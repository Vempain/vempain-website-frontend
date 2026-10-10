import type {ReactNode} from 'react';

/**
 * Stand-in for the ESM-only `@vempain/vempain-rt-renderer` package. Only the values are mocked; the types still come from the real package,
 * because `moduleNameMapper` is a runtime-only redirection.
 *
 * `PageBodyRenderer` echoes the body and delegates every `<gallery id="..."/>`-ish marker in it to the host through `renderGallery`, which is
 * the contract `src/components/PageView.tsx` relies on.
 */

const GALLERY_MARKER = /gallery[^0-9]{0,20}(\d+)/gi;

interface PageBodyRendererProps {
    body?: string | null;
    pageTitle?: string | null;
    renderGallery?: (galleryId: number, index: number) => ReactNode;
}

export function PageBodyRenderer({body, pageTitle, renderGallery}: PageBodyRendererProps) {
    const galleryIds = Array.from(String(body ?? '').matchAll(GALLERY_MARKER), (match) => Number(match[1]));

    return (
            <div data-testid="page-body" data-page-title={pageTitle ?? ''}>
                <div data-testid="page-body-content">{body}</div>
                {renderGallery && galleryIds.map((galleryId, index) => (
                        <div data-testid="page-body-gallery" key={`${galleryId}-${index}`}>{renderGallery(galleryId, index)}</div>
                ))}
            </div>
    );
}

export function RendererProvider({children}: { children?: ReactNode }) {
    return <>{children}</>;
}
