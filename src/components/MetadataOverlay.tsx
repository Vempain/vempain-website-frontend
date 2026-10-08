import {Button, Descriptions, Typography} from "antd";
import {LeftOutlined, RightOutlined} from "@ant-design/icons";
import {useEffect, useState} from "react";
import {createPortal} from "react-dom";
import type {MetadataEntry, WebSiteSubject} from "../models";
import {ShowSubjects} from "./ShowSubjects";

/** One page of the overlay. A page without entries and subjects is not shown. */
export interface MetadataOverlayPage {
    key: string;
    title: string;
    entries: MetadataEntry[];
    subjects?: WebSiteSubject[];
}

export interface MetadataOverlayProps {
    /** Pages shown as a small carousel; defaults to a single page built from {@code entries} and {@code subjects}. */
    pages?: MetadataOverlayPage[];
    entries?: MetadataEntry[];
    subjects?: WebSiteSubject[];
}

function hasContent(page: MetadataOverlayPage): boolean {
    return page.entries.length > 0 || (page.subjects?.length ?? 0) > 0;
}

export function MetadataOverlay({pages, entries = [], subjects = []}: MetadataOverlayProps) {
    const visiblePages = (pages ?? [{key: 'details', title: 'Lisätiedot', entries, subjects}]).filter(hasContent);
    const [pageIndex, setPageIndex] = useState(0);
    const pageKeys = visiblePages.map((page) => page.key).join('|');

    // Start from the first page whenever the set of pages changes (another image was selected)
    useEffect(() => {
        // The selected page must reset when a different overlay page set is provided.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPageIndex(0);
    }, [pageKeys]);

    if (visiblePages.length === 0) {
        return null;
    }

    const current = visiblePages[Math.min(pageIndex, visiblePages.length - 1)];
    const multiPage = visiblePages.length > 1;
    const previous = () => setPageIndex((index) => (index - 1 + visiblePages.length) % visiblePages.length);
    const next = () => setPageIndex((index) => (index + 1) % visiblePages.length);

    return createPortal(
            <div style={{
                position: 'fixed',
                bottom: 130, // keep clear of preview controls and button
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 2050,
                pointerEvents: 'none',
            }}>
                <div style={{display: 'flex', flexDirection: 'column-reverse', alignItems: 'center', pointerEvents: 'auto'}}>
                    <div
                            role="region"
                            aria-label={current.title}
                            data-testid="metadata-overlay"
                            data-page={current.key}
                            onClick={(event) => event.stopPropagation()}
                            style={{
                                background: 'rgba(0,0,0,0.65)',
                                color: '#fff',
                                padding: 16,
                                borderRadius: 8,
                                backdropFilter: 'blur(6px)',
                                maxHeight: '70vh',
                                overflowY: 'auto',
                                width: 'min(600px, 92vw)',
                            }}
                    >
                        {multiPage && (
                                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8}}>
                                    <Button
                                            size="small"
                                            type="text"
                                            icon={<LeftOutlined/>}
                                            aria-label="Edellinen sivu"
                                            onClick={previous}
                                            style={{color: '#fff'}}
                                    />
                                    <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                                        <Typography.Text strong style={{color: '#fff'}}>{current.title}</Typography.Text>
                                        <div role="tablist" aria-label="Sivut" style={{display: 'flex', gap: 6}}>
                                            {visiblePages.map((page, index) => (
                                                    <button
                                                            key={page.key}
                                                            type="button"
                                                            role="tab"
                                                            aria-selected={index === pageIndex}
                                                            aria-label={page.title}
                                                            onClick={() => setPageIndex(index)}
                                                            style={{
                                                                width: 8,
                                                                height: 8,
                                                                borderRadius: '50%',
                                                                border: 'none',
                                                                padding: 0,
                                                                cursor: 'pointer',
                                                                background: index === pageIndex ? '#fff' : 'rgba(255,255,255,0.4)',
                                                            }}
                                                    />
                                            ))}
                                        </div>
                                        <Typography.Text style={{color: '#d9d9d9', fontSize: 12}}>
                                            {pageIndex + 1} / {visiblePages.length}
                                        </Typography.Text>
                                    </div>
                                    <Button
                                            size="small"
                                            type="text"
                                            icon={<RightOutlined/>}
                                            aria-label="Seuraava sivu"
                                            onClick={next}
                                            style={{color: '#fff'}}
                                    />
                                </div>
                        )}
                        <Descriptions
                                size="small"
                                column={1}
                                styles={{
                                    label: {color: '#d9d9d9'},
                                    content: {color: '#fff'}
                                }}
                        >
                            {current.entries.map((entry) => (
                                    <Descriptions.Item label={entry.label} key={entry.label}>
                                        {entry.value}
                                    </Descriptions.Item>
                            ))}
                        </Descriptions>
                        {current.subjects && current.subjects.length > 0 && (
                                <div style={{marginTop: 12}}>
                                    <ShowSubjects subjects={current.subjects}/>
                                </div>
                        )}
                    </div>
                </div>
            </div>,
            document.body
    );
}
