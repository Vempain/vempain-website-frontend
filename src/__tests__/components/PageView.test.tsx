import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals';
import {act, type ReactElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import PageView from '../../components/PageView';
import type {WebSitePage} from '../../models';

class ResizeObserverMock {
    observe() {
    }

    unobserve() {
    }

    disconnect() {
    }
}

Object.defineProperty(globalThis, 'ResizeObserver', {value: ResizeObserverMock});

const subject = {id: 1, subject: 'tag', subject_de: null, subject_en: null, subject_es: null, subject_fi: null, subject_se: null};

const pages: WebSitePage[] = [
    {
        id: 1, page_id: 1, title: 'Tagged', file_path: 'docs/tagged', header: 'First header', body: '', page_style: null, secure: false,
        acl_id: 7, creator: 'alice', created: null, subjects: [subject],
    },
    {
        id: 2, page_id: 2, title: 'Plain', path: 'docs/plain', header: 'Second header', body: '', page_style: null, secure: false,
        acl_id: null, creator: 'bob', created: null, subjects: undefined as unknown as WebSitePage['subjects'],
    },
    {
        id: 3, page_id: 3, title: 'Pathless', header: '', body: '', page_style: null, secure: false,
        acl_id: null, creator: 'carol', created: null, subjects: [],
    },
];

/** React only notices a value change that goes through the native setter. */
function typeInto(input: HTMLInputElement, value: string) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    act(() => {
        setter?.call(input, value);
        input.dispatchEvent(new Event('input', {bubbles: true}));
    });
}

describe('PageView page list', () => {
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
        act(() => root.render(<MemoryRouter>{ui}</MemoryRouter>));
    }

    it('lists the pages with their links, subjects and access warnings and forwards the search and paging callbacks', () => {
        const onSearchInputChange = jest.fn<(value: string) => void>();
        const onSearchSubmit = jest.fn<() => void>();
        const onPageChange = jest.fn<(page: number) => void>();
        render(<PageView pageContent={null} pages={pages} pagination={{page: 1, size: 1, total_elements: 3}} searchInput="docs"
                         onSearchInputChange={onSearchInputChange} onSearchSubmit={onSearchSubmit} onPageChange={onPageChange}/>);

        expect(container.textContent).toContain('Viimeisimmät sivut');
        const links = Array.from(container.querySelectorAll('.card a')).map((link) => link.getAttribute('href'));
        expect(links).toEqual(['/pages/docs/tagged', '/pages/docs/plain', '/pages/index']);
        expect(container.textContent).toContain('tag');
        expect(container.textContent).toContain('Pääsy rajoitettu');
        expect(container.textContent).toContain('docs/plain');

        const search = container.querySelector('input') as HTMLInputElement;
        expect(search.value).toBe('docs');
        typeInto(search, 'guides');
        expect(onSearchInputChange).toHaveBeenCalledWith('guides');
        act(() => search.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true})));
        act(() => (container.querySelector('.ant-input-search-btn') as HTMLButtonElement).click());
        expect(onSearchSubmit).toHaveBeenCalled();

        act(() => (container.querySelector('.ant-pagination-item-3 a') as HTMLElement).click());
        expect(onPageChange).toHaveBeenCalledWith(2);
    });

    it('tolerates a list without callbacks', () => {
        render(<PageView pageContent={null} pages={pages.slice(0, 1)} pagination={{page: 0, size: 1, total_elements: 3}} searchInput=""/>);
        const search = container.querySelector('input') as HTMLInputElement;
        expect(() => typeInto(search, 'x')).not.toThrow();
        expect(() => act(() => (container.querySelector('.ant-input-search-btn') as HTMLButtonElement).click())).not.toThrow();
        expect(() => act(() => (container.querySelector('.ant-pagination-item-2 a') as HTMLElement).click())).not.toThrow();
        expect(container.textContent).toContain('Tagged');
    });

    it('shows the tags next to the title in their own colors and opens the subject search from them', () => {
        const second = {...subject, id: 2, subject: 'finland'};
        render(<PageView pageContent={{...pages[0], subjects: [subject, second]}} pages={[]} pagination={{page: 0, size: 12, total_elements: 0}}
                         searchInput=""/>);

        const row = container.querySelector('.page-title-row') as HTMLElement;
        expect(row.textContent).toContain('Tagged');
        const tags = Array.from(row.querySelectorAll('.ant-tag'));
        expect(tags.map((tag) => tag.textContent)).toEqual(['tag', 'finland']);
        expect(tags[0].className).toMatch(/ant-tag-(magenta|red|volcano|orange|gold|lime|green|cyan|blue|geekblue|purple)/);
        expect(container.querySelector('.subjects-list')).toBeNull();

        act(() => (container.querySelector('[data-testid="page-tag-2"]') as HTMLElement).click());
        expect(container.textContent).toContain('Tagged');
    });

    it('renders a page without a creation date and without galleries', () => {
        render(<PageView pageContent={{...pages[2], title: 'Detail', body: 'plain body'}} pages={[]} pagination={{page: 0, size: 12, total_elements: 0}}
                         searchInput=""/>);
        expect(container.textContent).toContain('Detail');
        expect(container.textContent).toContain('plain body');
        expect(container.textContent).not.toContain('Julkaistu');
        expect(container.querySelector('[data-testid="page-body-gallery"]')).toBeNull();
    });
});
