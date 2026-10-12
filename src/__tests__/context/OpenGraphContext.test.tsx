import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals';
import {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {MemoryRouter, useNavigate} from 'react-router-dom';
import {OpenGraphProvider, useOpenGraph} from '../../context';
import {fileAPI} from '../../services';

function Probe() {
    const {setRouteOpenGraph} = useOpenGraph();
    const navigate = useNavigate();
    return (
            <div>
                <button id="set" onClick={() => setRouteOpenGraph({
                    type: 'article', site_name: '', title: 'Page', description: null, path: '/pages/a', image_path: 'trips/x.jpg',
                    image_mimetype: 'image/jpeg', image_width: 10, image_height: 20, published: '2024-05-15T12:00:00', modified: null,
                })}/>
                <button id="clear" onClick={() => setRouteOpenGraph(null)}/>
                <button id="go" onClick={() => navigate('/pages/b')}/>
            </div>
    );
}

function tag(selector: string): string | null {
    const element = document.head.querySelector(selector);
    return element?.getAttribute(element.tagName === 'LINK' ? 'href' : 'content') ?? null;
}

describe('OpenGraphProvider', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        document.head.innerHTML = '';
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        jest.mocked(fileAPI.getFileUrl).mockImplementation((path: string) => `/file/${path}`);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        jest.mocked(fileAPI.getFileUrl).mockReset();
    });

    function click(id: string) {
        act(() => (container.querySelector(`#${id}`) as HTMLButtonElement).dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true})));
    }

    it('applies site level tags, route metadata, and drops the metadata when the route changes', () => {
        act(() => root.render(
                <MemoryRouter initialEntries={['/pages/a']}>
                    <OpenGraphProvider siteName="My Site" siteDescription="About the site"><Probe/></OpenGraphProvider>
                </MemoryRouter>
        ));

        expect(document.title).toBe('My Site');
        expect(tag('meta[property="og:type"]')).toBe('website');
        expect(tag('meta[property="og:url"]')).toBe(`${window.location.origin}/pages/a`);
        expect(tag('link[rel="canonical"]')).toBe(`${window.location.origin}/pages/a`);
        expect(tag('meta[property="og:description"]')).toBe('About the site');
        expect(tag('meta[property="og:image"]')).toBeNull();

        click('set');
        expect(document.title).toBe('Page | My Site');
        expect(tag('meta[property="og:type"]')).toBe('article');
        expect(tag('meta[property="og:site_name"]')).toBe('My Site');
        expect(tag('meta[property="og:description"]')).toBe('About the site');
        expect(tag('meta[property="og:image"]')).toBe(`${window.location.origin}/file/trips/x.jpg`);
        expect(tag('meta[property="article:published_time"]')).toBe('2024-05-15T12:00:00');
        expect(document.head.querySelectorAll('meta[property="og:title"]')).toHaveLength(1);

        click('go');
        expect(document.title).toBe('My Site');
        expect(tag('meta[property="og:url"]')).toBe(`${window.location.origin}/pages/b`);
        expect(tag('meta[property="og:image"]')).toBeNull();

        click('set');
        expect(document.title).toBe('Page | My Site');
        click('clear');
        expect(document.title).toBe('My Site');
        expect(tag('meta[property="og:url"]')).toBe(`${window.location.origin}/pages/b`);
    });

    it('re-applies the tags when the site texts arrive later', () => {
        act(() => root.render(
                <MemoryRouter initialEntries={['/galleries']}>
                    <OpenGraphProvider siteName="Vempain" siteDescription={null}><Probe/></OpenGraphProvider>
                </MemoryRouter>
        ));
        expect(document.title).toBe('Vempain');
        expect(tag('meta[property="og:description"]')).toBeNull();

        act(() => root.render(
                <MemoryRouter initialEntries={['/galleries']}>
                    <OpenGraphProvider siteName="Configured" siteDescription="Configured description"><Probe/></OpenGraphProvider>
                </MemoryRouter>
        ));
        expect(document.title).toBe('Configured');
        expect(tag('meta[property="og:description"]')).toBe('Configured description');
    });

    it('is a no-op without a provider', () => {
        act(() => root.render(<MemoryRouter initialEntries={['/pages/a']}><Probe/></MemoryRouter>));

        expect(() => click('set')).not.toThrow();
        expect(document.head.querySelector('meta[property="og:title"]')).toBeNull();
    });
});
