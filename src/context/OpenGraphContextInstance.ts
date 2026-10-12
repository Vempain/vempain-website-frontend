import {createContext, useContext} from 'react';
import type {OpenGraph} from '../models';

export interface OpenGraphContextType {
    /**
     * Sets the metadata of the current route once its content is known, or clears it with `null`; the site level metadata is used
     * until then. The value is dropped automatically when the route changes.
     */
    setRouteOpenGraph: (meta: OpenGraph | null) => void;
}

/** The default is a no-op, so that a route component can also be rendered without the provider. */
export const OpenGraphContext = createContext<OpenGraphContextType>({
    setRouteOpenGraph: () => undefined,
});

export function useOpenGraph(): OpenGraphContextType {
    return useContext(OpenGraphContext);
}
