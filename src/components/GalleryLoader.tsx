import {useCallback, useEffect, useRef, useState} from 'react';
import type {WebSiteFile} from '../models';
import {galleryAPI} from '../services';
import {Spin} from "antd";
import {GalleryBlock} from "./GalleryBlock";
import {useAuth} from "../context/AuthContextInstance";

interface GalleryLoaderProps {
    galleryId: number;
    title?: string;
}

export function GalleryLoader({galleryId, title}: GalleryLoaderProps) {
    const {isAuthenticated} = useAuth();

    const [loading, setLoading] = useState(true);
    const [webSiteFileList, setWebSiteFileList] = useState<WebSiteFile[]>([]);
    const [currentPage, setCurrentPage] = useState<number>(0);
    const [currentSize, setCurrentSize] = useState<number>(25);
    const [totalElements, setTotalElements] = useState<number>(0);
    const [lastPageFetched, setLastPageFetched] = useState<boolean>(false);
    /** The request for the next page while it is on its way; whoever asks again meanwhile gets this same promise instead of a second request. */
    const nextPageRequestRef = useRef<Promise<WebSiteFile[]> | null>(null);
    /** Grows when the gallery changes, so a next-page response of the previous gallery is dropped instead of appended. */
    const galleryGenerationRef = useRef(0);

    // Reset and fetch first page when gallery changes
    useEffect(() => {
        let active = true;
        galleryGenerationRef.current += 1;
        nextPageRequestRef.current = null;
        const timerId = window.setTimeout(() => {
            setLoading(true);
            setWebSiteFileList([]);
            setCurrentPage(0);
            setLastPageFetched(false);
            setTotalElements(0);

            galleryAPI.getGalleryFiles(galleryId, {page: 0, size: currentSize})
                    .then((pagedData) => {
                        if (!active || !pagedData) {
                            return;
                        }
                        setWebSiteFileList(pagedData.content);
                        setCurrentPage(pagedData.page);
                        setCurrentSize(pagedData.size);
                        setTotalElements(pagedData.total_elements);
                        setLastPageFetched(pagedData.last);
                    })
                    .catch((error) => {
                        console.error('Error fetching gallery files:', error);
                    })
                    .finally(() => {
                        if (active) {
                            setLoading(false);
                        }
                    });
        }, 0);

        return () => {
            active = false;
            window.clearTimeout(timerId);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [galleryId]);

    /**
     * Loads the page after the last loaded one and appends it. The returned promise settles only when the page has arrived (or failed), which is what
     * GalleryBlock's one-request-at-a-time guard relies on; while it is pending, every further call shares it, so a page is never requested twice.
     */
    const fetchNextPagedData = useCallback((): Promise<WebSiteFile[]> => {
        if (lastPageFetched) {
            return Promise.resolve(webSiteFileList);
        }
        if (nextPageRequestRef.current) {
            return nextPageRequestRef.current;
        }

        const generation = galleryGenerationRef.current;
        setLoading(true);
        const request = galleryAPI.getGalleryFiles(galleryId, {page: currentPage + 1, size: currentSize})
                .then((pagedData) => {
                    if (!pagedData || generation !== galleryGenerationRef.current) {
                        return webSiteFileList;
                    }
                    const combined = [...webSiteFileList, ...pagedData.content];
                    setWebSiteFileList(combined);
                    setCurrentPage(pagedData.page);
                    setCurrentSize(pagedData.size);
                    setTotalElements(pagedData.total_elements);
                    setLastPageFetched(pagedData.last);
                    return combined;
                })
                .catch((error: unknown) => {
                    console.error('Error fetching updates to gallery files:', error);
                    return webSiteFileList;
                })
                .finally(() => {
                    if (nextPageRequestRef.current === request) {
                        nextPageRequestRef.current = null;
                    }
                    if (generation === galleryGenerationRef.current) {
                        setLoading(false);
                    }
                });
        nextPageRequestRef.current = request;
        return request;
    }, [currentPage, currentSize, galleryId, lastPageFetched, webSiteFileList]);

    return (
            <Spin spinning={loading}>
                <GalleryBlock
                        title={title ?? `Gallery #${galleryId}`}
                        siteFileList={webSiteFileList}
                        totalFiles={totalElements}
                        hasMore={!lastPageFetched}
                        fetchMoreFiles={fetchNextPagedData}
                        isAuthenticated={isAuthenticated}
                />
            </Spin>
    );
}
