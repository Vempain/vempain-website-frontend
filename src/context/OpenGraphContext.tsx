import {type ReactNode, useCallback, useEffect, useMemo, useState} from 'react';
import {useLocation} from 'react-router-dom';
import type {OpenGraph} from '../models';
import {fileAPI} from '../services';
import {applyHeadData, buildHeadData, siteOpenGraph} from '../tools';
import {OpenGraphContext} from './OpenGraphContextInstance';

interface OpenGraphProviderProps {
    siteName: string;
    siteDescription: string | null;
    children: ReactNode;
}

interface RouteOpenGraph {
    /** The route the metadata belongs to; metadata of another route is ignored. */
    pathname: string;
    meta: OpenGraph | null;
}

/**
 * Keeps the document title and the Open Graph, Twitter card, description and canonical tags of the `<head>` in step with the current
 * route. Routes publish their metadata through {@link OpenGraphContext}; until they do, and for routes that never do, the site level
 * metadata is used. URLs are built from the origin the page was loaded from, so the same build works on any host name.
 */
export function OpenGraphProvider({siteName, siteDescription, children}: OpenGraphProviderProps) {
    const {pathname} = useLocation();
    const [routeOpenGraph, setRouteOpenGraphState] = useState<RouteOpenGraph | null>(null);

    const setRouteOpenGraph = useCallback((meta: OpenGraph | null) => {
        setRouteOpenGraphState({pathname, meta});
    }, [pathname]);

    const routeMeta = routeOpenGraph !== null && routeOpenGraph.pathname === pathname ? routeOpenGraph.meta : null;

    useEffect(() => {
        const meta = routeMeta === null
                ? siteOpenGraph(siteName, siteDescription, pathname)
                : {...routeMeta, site_name: routeMeta.site_name || siteName, description: routeMeta.description ?? siteDescription};
        applyHeadData(document, buildHeadData(meta, window.location.origin, (path) => fileAPI.getFileUrl(path)));
    }, [routeMeta, siteName, siteDescription, pathname]);

    const value = useMemo(() => ({setRouteOpenGraph}), [setRouteOpenGraph]);

    return <OpenGraphContext.Provider value={value}>{children}</OpenGraphContext.Provider>;
}
