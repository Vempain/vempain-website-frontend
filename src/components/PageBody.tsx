import {type MouseEvent, type ReactNode, useCallback} from 'react';
import {useNavigate} from 'react-router-dom';
import {PageBodyRenderer} from '@vempain/vempain-rt-renderer';
import {internalRouteFromHref} from '../tools';

interface PageBodyProps {
    body: string;
    pageTitle?: string;
    renderGallery?: (galleryId: number, index: number) => ReactNode;
}

/**
 * Renders a page body and follows its internal links with the router. The body is stored HTML from the admin editor, whose link dialog
 * writes root-relative hrefs (`/pages/<path>` for pages, `/file/<path>` for files), so without this a page link would reload the whole
 * application. Only a plain left click on a link the application serves itself (`internalRouteFromHref`) is taken over; a click with a
 * modifier key, a link that opens elsewhere (`target`), a download, a file, an external site or an in-page anchor stays with the browser.
 */
export function PageBody({body, pageTitle, renderGallery}: PageBodyProps) {
    const navigate = useNavigate();

    const handleClick = useCallback((event: MouseEvent<HTMLDivElement>) => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
            return;
        }
        const anchor = (event.target as Element).closest('a[href]');
        if (!(anchor instanceof HTMLAnchorElement) || !event.currentTarget.contains(anchor)) {
            return;
        }
        if ((anchor.target && anchor.target !== '_self') || anchor.hasAttribute('download')) {
            return;
        }
        // anchor.href is the browser-resolved absolute URL, so relative hrefs are resolved against the current page as they would be when followed
        const route = internalRouteFromHref(anchor.href);
        if (!route) {
            return;
        }
        event.preventDefault();
        navigate(route);
    }, [navigate]);

    return (
            <div className="page-body" data-testid="page-body-links" onClick={handleClick}>
                <PageBodyRenderer body={body} pageTitle={pageTitle} renderGallery={renderGallery}/>
            </div>
    );
}
