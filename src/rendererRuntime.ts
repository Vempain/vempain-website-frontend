import type {RendererRuntime} from '@vempain/vempain-rt-renderer';
import {fileAPI, galleryAPI, pageAPI} from './services';
import {withGalleryMediaAPI} from './rendererGalleryAdapter';
import {toFrontendPagePath} from './tools';

const rendererPageAPI = withGalleryMediaAPI(pageAPI, galleryAPI);

export const rendererRuntime: RendererRuntime = {
    pageAPI: rendererPageAPI,
    fileAPI,
    routes: {
        toFrontendPagePath,
    },
};
