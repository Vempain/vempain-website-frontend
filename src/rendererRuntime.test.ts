import {afterEach, describe, expect, it, jest} from '@jest/globals';
import {withGalleryMediaAPI} from './rendererGalleryAdapter';

describe('renderer runtime', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('provides gallery media to carousel heroes', async () => {
        const galleryResponse = {
            content: [{
                id: 42,
                file_path: '/image/hero.jpg',
                mimetype: 'image/jpeg',
            }],
            page: 0,
            size: 100,
            total_elements: 1,
            total_pages: 1,
            last: true,
        };
        const getGalleryFiles = jest.fn((galleryId: number, params: { page?: number; size?: number }) => {
            expect(galleryId).toBe(1084);
            expect(params).toEqual({page: 0, size: 100});
            return Promise.resolve(galleryResponse);
        });
        const pageAPI = withGalleryMediaAPI({}, {getGalleryFiles});

        const response = await pageAPI.getPublicGalleryFiles(1084, {page: 0, size: 100});

        expect(getGalleryFiles).toHaveBeenCalledWith(1084, {page: 0, size: 100});
        expect(response.data?.content).toEqual(galleryResponse.content);
    });
});
