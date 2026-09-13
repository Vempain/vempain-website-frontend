import type {RendererGalleryFile, RendererPageApi} from '@vempain/vempain-rt-renderer';

interface GalleryAPI {
    getGalleryFiles(galleryId: number, params: { page?: number; size?: number }): Promise<{
        content: RendererGalleryFile[];
        page: number;
        total_pages: number;
    }>;
}

export function withGalleryMediaAPI<T extends object>(pageAPI: T, galleryAPI: GalleryAPI): T & Required<Pick<RendererPageApi, 'getPublicGalleryFiles'>> {
    return Object.assign(pageAPI, {
        getPublicGalleryFiles: async (galleryId: number, params?: { page?: number; size?: number }) => ({
            data: await galleryAPI.getGalleryFiles(galleryId, {
                page: params?.page,
                size: params?.size,
            }),
        }),
    });
}
