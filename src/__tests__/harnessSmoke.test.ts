import {describe, expect, it} from '@jest/globals';

describe('harness smoke', () => {
    it('loads every module under test', async () => {
        const components = await import('../components');
        const context = await import('../context');
        const tools = await import('../tools');
        const app = await import('../App');
        const runtime = await import('../rendererRuntime');
        const locationMap = await import('../components/LocationMap');
        const pagesRoute = await import('../pages/PagesRoute');
        const galleriesRoute = await import('../pages/GalleriesRoute');
        const galleryRoute = await import('../pages/GalleryRoute');
        const searchRoute = await import('../pages/SearchRoute');
        const pageCards = await import('../components/PageCardsGrid');

        expect(Object.keys(components).length).toBeGreaterThan(0);
        expect(Object.keys(context).length).toBeGreaterThan(0);
        expect(Object.keys(tools).length).toBeGreaterThan(0);
        expect(app.default).toBeDefined();
        expect(runtime.rendererRuntime).toBeDefined();
        expect(locationMap.default).toBeDefined();
        expect(pagesRoute.PagesRoute).toBeDefined();
        expect(galleriesRoute.GalleriesRoute).toBeDefined();
        expect(galleryRoute.GalleryRoute).toBeDefined();
        expect(searchRoute.SearchRoute).toBeDefined();
        expect(pageCards).toBeDefined();
    });
});
