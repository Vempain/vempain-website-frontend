import {afterEach, beforeEach, describe, expect, it} from '@jest/globals';
import {act, type ReactElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {MemoryRouter, Route, Routes, useLocation} from 'react-router-dom';
import {PageBody} from '../../components/PageBody';

function Location() {
    const location = useLocation();
    return <span data-testid="location">{location.pathname}{location.search}{location.hash}</span>;
}

const body = [
    '<p>Read <a id="page" href="/pages/docs/about">about us</a>, see <a id="gallery" href="/galleries/7">the gallery</a>',
    ' or <a id="search" href="/search?subjects=1">search</a>.</p>',
    '<p>Download <a id="file" href="/file/document/2024/report.pdf">the report</a>, visit <a id="external" href="https://other.example/pages/x">them</a>,',
    ' open <a id="blank" href="/pages/docs/new" target="_blank">in a new tab</a>, save <a id="download" href="/pages/docs/save" download>this</a>',
    ' or jump <a id="hash" href="#top">up</a>. <span id="text">Plain text</span></p>',
].join('');

describe('PageBody', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
    });

    function render(ui: ReactElement) {
        act(() => root.render(
                <MemoryRouter initialEntries={['/pages/index']}>
                    <Location/>
                    <Routes>
                        <Route path="*" element={ui}/>
                    </Routes>
                </MemoryRouter>,
        ));
    }

    function click(id: string, init: MouseEventInit = {}): boolean {
        const element = container.querySelector(`#${id}`);
        if (!element) {
            throw new Error(`No element ${id}`);
        }
        const event = new MouseEvent('click', {bubbles: true, cancelable: true, button: 0, ...init});
        act(() => {
            element.dispatchEvent(event);
        });
        return event.defaultPrevented;
    }

    function location(): string {
        return container.querySelector('[data-testid="location"]')?.textContent ?? '';
    }

    it('follows the page, gallery and search links of the body with the router', () => {
        render(<PageBody body={body} pageTitle="Links"/>);
        expect(container.querySelector('[data-testid="page-body-links"]')).not.toBeNull();

        expect(click('page')).toBe(true);
        expect(location()).toBe('/pages/docs/about');
        expect(click('gallery')).toBe(true);
        expect(location()).toBe('/galleries/7');
        expect(click('search')).toBe(true);
        expect(location()).toBe('/search?subjects=1');
    });

    it('leaves files, other sites, new tabs, downloads, in-page anchors and plain text to the browser', () => {
        render(<PageBody body={body}/>);

        for (const id of ['file', 'external', 'blank', 'download', 'hash', 'text']) {
            expect(click(id)).toBe(false);
        }
        expect(location()).toBe('/pages/index');
    });

    it('leaves a click with a modifier key, another button or an already handled click to the browser', () => {
        render(<PageBody body={body}/>);

        expect(click('page', {ctrlKey: true})).toBe(false);
        expect(click('page', {metaKey: true})).toBe(false);
        expect(click('page', {shiftKey: true})).toBe(false);
        expect(click('page', {altKey: true})).toBe(false);
        expect(click('page', {button: 1})).toBe(false);

        const anchor = container.querySelector('#page');
        const handled = new MouseEvent('click', {bubbles: true, cancelable: true, button: 0});
        handled.preventDefault();
        act(() => {
            anchor?.dispatchEvent(handled);
        });
        expect(location()).toBe('/pages/index');
    });

    it('renders the galleries of the body through the given renderer', () => {
        render(<PageBody body="<p>before</p><!--vps:embed:gallery:3--><p>after</p>"
                         renderGallery={(galleryId, index) => <span key={index} data-testid="gallery">gallery {galleryId}</span>}/>);
        expect(container.querySelector('[data-testid="gallery"]')?.textContent).toBe('gallery 3');
        expect(container.textContent).toContain('before');
        expect(container.textContent).toContain('after');
    });
});
