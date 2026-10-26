import {Button, Card, Empty, Image, Spin, Tooltip, Typography} from "antd";
import dayjs from "dayjs";
import {ShowSubjects} from "./ShowSubjects";
import {fileAPI} from "../services";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import type {MetadataEntry, WebSiteFile, WebSiteLocation, WebSiteSubject} from "../models";
import {MetadataOverlay, type MetadataOverlayPage} from "./MetadataOverlay";
import {cameraMetadataEntries} from "../tools";
import {LocationBadge} from "./LocationBadge";
import {LocationModal} from "./LocationModal";
import {GALLERY_GRID_STYLE} from "./GalleryBlockStyles";

const THUMB_WIDTH = 250;
const THUMB_HEIGHT = 166;
const THUMB_TOOLTIP_MAX_WIDTH = 500;
const THUMB_TOOLTIP_MAX_HEIGHT = 400;
const DISPLAY_DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

/** Thumbnails fill their grid cell and keep the thumbnail aspect ratio instead of a fixed pixel size. */
const THUMBNAIL_FRAME_STYLE = {
    width: '100%',
    aspectRatio: `${THUMB_WIDTH} / ${THUMB_HEIGHT}`,
    overflow: 'hidden',
    borderRadius: 4,
    background: '#000',
    cursor: 'pointer',
};

/**
 * The Ant Design image wrapper (`.ant-image`) is an inline box without a height of its own; it has to fill the frame, otherwise the image's
 * `height: 100%` resolves to its natural height and `object-fit` has nothing to fit into: a tall thumbnail would show only its top and a wide one
 * would leave the bottom of the frame empty.
 */
const THUMBNAIL_WRAPPER_STYLE = {
    display: 'block',
    width: '100%',
    height: '100%',
};

/** The thumbnail fills the frame on its narrower dimension and is cropped to the centre on the wider one, never squeezed. */
const THUMBNAIL_IMAGE_STYLE = {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
    objectPosition: 'center' as const,
    display: 'block',
};

interface GalleryBlockProps {
    title: string;
    siteFileList: (WebSiteFile[]);
    totalFiles: number;
    gallerySubjects?: WebSiteSubject[];
    hasMore: boolean;
    fetchMoreFiles: () => Promise<WebSiteFile[]>;
    isAuthenticated?: boolean;
}

export function GalleryBlock({title, siteFileList, totalFiles, gallerySubjects, hasMore, fetchMoreFiles, isAuthenticated}: GalleryBlockProps) {
    const [previewVisible, setPreviewVisible] = useState<boolean>(false);
    const [previewIndex, setPreviewIndex] = useState<number>(0);
    const [showMetadata, setShowMetadata] = useState<boolean>(false);
    const [locationModalOpen, setLocationModalOpen] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState<WebSiteLocation | null>(null);
    const prefetchingRef = useRef(false);
    const loadingMoreRef = useRef(false);
    const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

    const handlePreviewVisibleChange = (visible: boolean) => {
        setPreviewVisible(visible);
        if (!visible) {
            setShowMetadata(false);
        }
    };

    const handlePreviewChange = (index: number) => {
        setPreviewIndex(index);
        setShowMetadata(false);
    };

    const stableFetchMore = useCallback(() => fetchMoreFiles(), [fetchMoreFiles]);

    /** Loads the next batch once; a batch that is already on its way is not requested again. Errors are left to the caller's own handling. */
    const loadMore = useCallback(() => {
        if (!hasMore || loadingMoreRef.current) {
            return;
        }
        loadingMoreRef.current = true;
        stableFetchMore()
                .catch(() => { /* the button stays for a retry */
                })
                .finally(() => {
                    loadingMoreRef.current = false;
                });
    }, [hasMore, stableFetchMore]);

    // Memos
    const activeFile = useMemo(() => previewVisible ? siteFileList[previewIndex] ?? null : null, [siteFileList, previewIndex, previewVisible]);

    const metadataEntries = useMemo<MetadataEntry[]>(() => {
        if (!activeFile) {
            return [];
        }

        const rawEntries = [
            {label: 'Kommentti', value: activeFile.comment},
            {
                label: 'Kuvausaika',
                value: activeFile.original_date_time
                        ? dayjs(activeFile.original_date_time).format(DISPLAY_DATE_TIME_FORMAT)
                        : "",
            },
            {label: 'Oikeuksien haltija', value: activeFile.rights_holder},
            {label: 'Käyttöehdot', value: activeFile.rights_terms},
            {label: 'Oikeuksien verkko-osoite', value: activeFile.rights_url},
            {label: 'Tekijä', value: activeFile.creator_name},
            {label: 'Tekijän sähköposti', value: activeFile.creator_email},
            {label: 'Tekijän maa', value: activeFile.creator_country},
            {label: 'Tekijän verkko-osoite', value: activeFile.creator_url},
        ];

        return rawEntries.flatMap((entry) => {
            const normalized = entry.value?.toString().trim();
            if (!normalized) {
                return [];
            }
            return [{label: entry.label, value: normalized}];
        });
    }, [activeFile]);

    // Overlay pages: general details (with the subjects) and the camera specific values from the image metadata
    const overlayPages = useMemo<MetadataOverlayPage[]>(() => {
        if (!activeFile) {
            return [];
        }
        return [
            {key: 'details', title: 'Lisätiedot', entries: metadataEntries, subjects: activeFile.subjects ?? []},
            {key: 'camera', title: 'Kamera', entries: cameraMetadataEntries(activeFile.metadata)},
        ].filter((page) => page.entries.length > 0 || (page.subjects?.length ?? 0) > 0);
    }, [activeFile, metadataEntries]);
    const hasOverlayContent = overlayPages.length > 0;

    // Prefetch next page when near the end of the current set
    useEffect(() => {
        if (!previewVisible || !hasMore) return;
        if (prefetchingRef.current) return;
        if (previewIndex < siteFileList.length - 2) return;

        prefetchingRef.current = true;
        stableFetchMore()
                .catch(() => { /* ignore errors */
                })
                .finally(() => {
                    prefetchingRef.current = false;
                });
    }, [previewVisible, previewIndex, siteFileList.length, hasMore, stableFetchMore]);

    // Load the next batch when the end of the grid scrolls into view; the button below the grid stays as the fallback
    useEffect(() => {
        const sentinel = loadMoreSentinelRef.current;
        if (!sentinel || !hasMore || typeof IntersectionObserver === 'undefined') {
            return;
        }
        const observer = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
                loadMore();
            }
        }, {rootMargin: '200px 0px'});
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [hasMore, loadMore, siteFileList.length]);

    return (
            <Card size="small" className="gallery-embed">
                {title && <Typography.Text strong>{title}</Typography.Text>}
                <ShowSubjects subjects={gallerySubjects}/>
                <div style={{marginTop: 8}}>
                    {siteFileList.length === 0 && <Spin/>}
                    {siteFileList.length === 0 && (
                            <Empty description="No images"/>
                    )}
                    {siteFileList.length > 0 && (
                            <Image.PreviewGroup
                                    preview={{
                                        open: previewVisible,
                                        onOpenChange: handlePreviewVisibleChange,
                                        current: previewIndex,
                                        onChange: handlePreviewChange,
                                        movable: true,
                                        countRender: (current, total) => `${current + 1} / ${totalFiles ?? total}`,
                                        actionsRender: (original) => (
                                                <>
                                                    {hasOverlayContent && (
                                                            <Button
                                                                    size="small"
                                                                    type="primary"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setShowMetadata((prev) => !prev);
                                                                    }}
                                                                    style={{marginRight: 8}}
                                                            >
                                                                {showMetadata ? 'Piilota lisätiedot' : 'Näytä lisätiedot'}
                                                            </Button>
                                                    )}
                                                    {original}
                                                </>
                                        ),
                                    }}
                            >
                                <div style={GALLERY_GRID_STYLE} data-testid="gallery-grid">
                                    {siteFileList.map((siteFile, idx) => {
                                        const filePath = siteFile.file_path;
                                        if (!filePath) {
                                            return null;
                                        }
                                        const imagePath = fileAPI.getFileUrl(filePath);
                                        const thumbPath = fileAPI.getFileThumbUrl(imagePath);
                                        const hasLocation = Boolean(isAuthenticated) && siteFile.location != null;

                                        return (
                                                <Tooltip
                                                        key={`galleryfile-${siteFile.id}`}
                                                        placement="top"
                                                        styles={{container: {padding: 0, background: '#000'}}}
                                                        title={
                                                            <img
                                                                    src={thumbPath}
                                                                    alt={filePath}
                                                                    style={{
                                                                        maxWidth: THUMB_TOOLTIP_MAX_WIDTH,
                                                                        maxHeight: THUMB_TOOLTIP_MAX_HEIGHT,
                                                                        display: 'block',
                                                                    }}
                                                            />
                                                        }
                                                >
                                                    <div
                                                            style={{...THUMBNAIL_FRAME_STYLE, position: 'relative'}}
                                                            onClick={() => {
                                                                setPreviewIndex(idx);
                                                                setPreviewVisible(true);
                                                            }}
                                                    >
                                                        <LocationBadge
                                                                visible={hasLocation}
                                                                onClick={
                                                                    hasLocation
                                                                            ? () => {
                                                                                setSelectedLocation(siteFile.location!);
                                                                                setLocationModalOpen(true);
                                                                            }
                                                                            : undefined
                                                                }
                                                        />
                                                        <Image
                                                                src={thumbPath}
                                                                alt={filePath}
                                                                styles={{root: THUMBNAIL_WRAPPER_STYLE, image: THUMBNAIL_IMAGE_STYLE}}
                                                                preview={{src: imagePath}}
                                                        />
                                                    </div>
                                                </Tooltip>
                                        );
                                    })}
                                </div>
                            </Image.PreviewGroup>
                    )}
                    {siteFileList.length > 0 && hasMore && (
                            <div style={{display: 'flex', justifyContent: 'center', marginTop: 16}}>
                                <div ref={loadMoreSentinelRef} data-testid="gallery-load-more-sentinel" aria-hidden="true"
                                     style={{position: 'absolute', width: 1, height: 1}}/>
                                <Button type="primary" onClick={loadMore} disabled={!hasMore}>
                                    Lataa lisää
                                </Button>
                            </div>
                    )}
                </div>
                {previewVisible && showMetadata && hasOverlayContent && (
                        <MetadataOverlay pages={overlayPages}/>
                )}
                {selectedLocation && (
                        <LocationModal
                                key={selectedLocation.id}
                                open={locationModalOpen}
                                location={selectedLocation}
                                onClose={() => {
                                    setLocationModalOpen(false);
                                    setSelectedLocation(null);
                                }}
                        />
                )}
            </Card>
    );
}
