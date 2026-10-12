import {Empty, Typography} from 'antd';
import {useEffect, useMemo} from 'react';
import {useParams} from 'react-router-dom';
import {GalleryLoader} from '../components';
import {useOpenGraph} from '../context';

const {Title} = Typography;

export function GalleryRoute() {
    const {galleryId} = useParams();
    const {setRouteOpenGraph} = useOpenGraph();
    const numericGalleryId = useMemo(() => {
        const parsed = Number(galleryId);
        return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
    }, [galleryId]);

    // The gallery name and its first image are only known to the backend, which serves them to link-preview crawlers; the browser
    // tab and the in-app metadata use the gallery number, as the page itself does.
    useEffect(() => {
        if (numericGalleryId) {
            setRouteOpenGraph({
                type: 'website',
                site_name: '',
                title: `Gallery #${numericGalleryId}`,
                description: null,
                path: `/galleries/${numericGalleryId}`,
                image_path: null,
                image_mimetype: null,
                image_width: null,
                image_height: null,
                published: null,
                modified: null,
            });
        }
    }, [numericGalleryId, setRouteOpenGraph]);

    if (!numericGalleryId) {
        return <Empty description="Invalid gallery"/>;
    }
    return (
            <div className="content-section">
                <Title level={3}>Gallery #{numericGalleryId}</Title>
                <GalleryLoader galleryId={numericGalleryId}/>
            </div>
    );
}
