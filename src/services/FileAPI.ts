import {AbstractAPI} from './AbstractAPI.ts';
import type {WebSiteFile} from '../models';
import {encodeApiPath} from '../tools/safePaths';

class FileAPI extends AbstractAPI {
    async getFiles() {
        return await this.request<WebSiteFile[]>('/');
    }

    async getPublicFiles() {
        return await this.request<WebSiteFile[]>('/public');
    }

    getFileUrl(filePath: string): string {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
        const safePath = encodeApiPath(filePath);
        return safePath ? `${API_BASE_URL}/file/${safePath}` : '';
    }

    getFileThumbUrl(mainPath: string): string {
        // Replace the last occurrence of '/' with '/.thumb/'
        const lastSlashIndex = mainPath.lastIndexOf('/');
        if (lastSlashIndex < 0 || !mainPath) {
            return '';
        }
        return `${mainPath.substring(0, lastSlashIndex)}/.thumb/${mainPath.substring(lastSlashIndex + 1)}`;
    }
}

export const fileAPI = new FileAPI(import.meta.env.VITE_APP_API_URL, "/files");
