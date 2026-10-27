import {Col, Input, Pagination, Row, Typography} from 'antd';
import {useMemo} from 'react';
import {Link as RouterLink} from 'react-router-dom';
import {GalleryLoader, PageTags, ShowSubjects} from './index';
import {PageBody} from './PageBody';
import {PageStyle} from './PageStyle';
import {PAGE_CANVAS_CLASS} from '../tools/pageStyle';
import type {WebSitePage} from '../models';
import {toFrontendPagePath} from '../tools';
import dayjs from "dayjs";

const {Title, Paragraph} = Typography;

/** Default for the page-list callbacks: a page detail view (`PagesRoute`) never renders the list, so it does not need to supply them. */
const NOOP = () => undefined;

interface PageViewProps {
    pageContent: WebSitePage | null;
    pages: WebSitePage[];
    pagination: { page: number; size: number; total_elements: number };
    searchInput: string;
    onSearchInputChange?: (value: string) => void;
    onSearchSubmit?: () => void;
    onPageChange?: (pageNumber: number) => void;
    pageError?: string | null;
    pageStatus?: number | null;
}

function PageView({
                      pageContent,
                      pages,
                      pagination,
                      searchInput,
                      onSearchInputChange = NOOP,
                      onSearchSubmit = NOOP,
                      onPageChange = NOOP,
                      pageError,
                      pageStatus,
                  }: PageViewProps) {
    function renderPageDetail() {
        if (!pageContent) {
            return null;
        }

        return (
                <div className={`content-section page-detail ${PAGE_CANVAS_CLASS}`} data-testid="page-canvas">
                    <PageStyle css={pageContent.page_style}/>
                    <div className="page-title-row" style={{display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12}}>
                        <Title level={2} style={{marginBottom: 0}}>{pageContent.title}</Title>
                        <PageTags subjects={pageContent.subjects}/>
                    </div>
                    {pageContent.created && (
                            <Paragraph type={"secondary"}>
                                Julkaistu {dayjs(pageContent.created).format("YYYY-MM-DD hh:mm")} - {pageContent.creator}
                            </Paragraph>
                    )}
                    <PageBody
                            body={pageContent.body}
                            pageTitle={pageContent.title}
                            renderGallery={(galleryId: number, index: number) => (
                                    <GalleryLoader key={`gallery-${galleryId}-${index}`} galleryId={galleryId}/>
                            )}
                    />
                </div>
        );
    }

    const pageList = useMemo(() => (
            <div className="content-section">
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <Title level={3}>Sivut</Title>
                    <Input.Search
                            placeholder="Search pages"
                            value={searchInput}
                            onChange={(e) => onSearchInputChange(e.target.value)}
                            onSearch={onSearchSubmit}
                            style={{maxWidth: 300}}
                    />
                </div>
                <Paragraph>Viimeisimmät sivut</Paragraph>
                <Row gutter={[16, 16]} className="card-grid">
                    {pages.map((page) => (
                            <Col key={page.id} xs={24} sm={12} lg={8} xl={6} className="card-column">
                                <div className="card">
                                    <Title level={4}>
                                        <RouterLink to={toFrontendPagePath(page.file_path ?? page.path ?? 'index')}>
                                            {page.title}
                                        </RouterLink>
                                    </Title>
                                    <Paragraph type="secondary">{page.file_path ?? page.path ?? ''}</Paragraph>
                                    <Paragraph ellipsis={{rows: 3}}>{page.header}</Paragraph>
                                    {page.subjects && <ShowSubjects subjects={page.subjects}/>}
                                    {page.acl_id && <Paragraph type="warning">Pääsy rajoitettu</Paragraph>}
                                </div>
                            </Col>
                    ))}
                </Row>
                <Pagination
                        current={pagination.page + 1}
                        pageSize={pagination.size}
                        total={pagination.total_elements}
                        onChange={(pageNumber) => onPageChange(pageNumber - 1)}
                        pageSizeOptions={[10, 20, 30, 40, 50]}
                        showSizeChanger={false}
                />
            </div>
    ), [pages, pagination.page, pagination.size, pagination.total_elements, searchInput, onSearchInputChange, onSearchSubmit, onPageChange]);

    if (pageContent) {
        return renderPageDetail();
    }

    if (pageStatus === 401) {
        return <div className="content-section"><Paragraph type="warning">Kirjaudu nähdäksesi tämän sivun.</Paragraph></div>;
    }
    if (pageStatus === 403) {
        return <div className="content-section"><Paragraph type="danger">Pääsy kielletty.</Paragraph></div>;
    }
    if (pageError) {
        return <div className="content-section"><Paragraph type="danger">{pageError}</Paragraph></div>;
    }

    return pageList;
}

export default PageView;
