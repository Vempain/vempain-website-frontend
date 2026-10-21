import {describe, expect, it} from '@jest/globals';
import * as components from '../components';
import * as context from '../context';
import * as tools from '../tools';

/*
 * The barrels compile to one getter per re-export under CommonJS, so every export has to be read once for the barrel to count as
 * covered; reading them also pins the public surface of each module.
 */
function values(module: Record<string, unknown>): Record<string, string> {
    return Object.fromEntries(Object.keys(module).sort().map((name) => [name, typeof module[name]]));
}

describe('module barrels', () => {
    it('components re-exports every component and the gallery grid style', () => {
        expect(values(components as unknown as Record<string, unknown>)).toEqual({
            BottomFooter: 'function',
            GALLERY_GRID_STYLE: 'object',
            GalleryBlock: 'function',
            GalleryLoader: 'function',
            LocationBadge: 'function',
            LocationModal: 'function',
            MetadataOverlay: 'function',
            PageView: 'function',
            ShowSubjects: 'function',
            SideBar: 'function',
            SubjectSearchLoader: 'function',
            TopBar: 'function',
        });
    });

    it('context re-exports the providers and hooks', () => {
        expect(values(context as unknown as Record<string, unknown>)).toEqual({
            AuthProvider: 'function',
            OpenGraphProvider: 'function',
            ThemeProvider: 'function',
            useAuth: 'function',
            useOpenGraph: 'function',
            useTheme: 'function',
        });
    });

    it('tools re-exports the path, geo, metadata and open graph helpers', () => {
        expect(values(tools as unknown as Record<string, unknown>)).toEqual({
            DEFAULT_PAGE_PATH: 'string',
            OPEN_GRAPH_ATTRIBUTE: 'string',
            TRACEPARENT_PATTERN: 'object',
            applyHeadData: 'function',
            buildHeadData: 'function',
            cameraMetadata: 'function',
            cameraMetadataEntries: 'function',
            createTraceContext: 'function',
            currentTraceId: 'function',
            deepMerge: 'function',
            nextTraceparent: 'function',
            pageOpenGraph: 'function',
            parseCoordinate: 'function',
            parseFileMetadata: 'function',
            randomHexId: 'function',
            siteOpenGraph: 'function',
            toBackendPagePath: 'function',
            toCompass16: 'function',
            toDirectoryIndexFrontendPath: 'function',
            toFrontendPagePath: 'function',
            toPathSegment: 'function',
            topDirectoryFromPagesPath: 'function',
            trimSlashes: 'function',
        });
    });
});
