import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals';
import {act, type ReactElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import type {DataNode} from 'antd/es/tree';
import {SideBar} from '../../components/SideBar';
import {pageAPI} from '../../services';
import type {DirectoryNode} from '../../models';

/*
 * `SideBar` only reacts to tree selections whose native event is a trusted `MouseEvent`, and jsdom cannot dispatch trusted events
 * (`isTrusted` is a non-configurable own property of every event). The Tree is therefore replaced by a flat stub that exposes each node
 * as buttons and hands `onSelect` an object inheriting from `MouseEvent.prototype` with the requested `isTrusted` value.
 */
jest.mock('antd', () => {
    const actual = jest.requireActual<typeof import('antd')>('antd');

    type StubNode = DataNode & { fullPath: string; children?: StubNode[] };

    function flatten(nodes: StubNode[] | undefined): StubNode[] {
        return (nodes ?? []).flatMap((node) => [node, ...flatten(node.children)]);
    }

    function Tree({treeData, selectedKeys, onSelect}: {
        treeData?: StubNode[];
        selectedKeys?: React.Key[];
        onSelect?: (keys: React.Key[], info: { node: DataNode; nativeEvent?: Event }) => void;
    }) {
        const select = (node: StubNode, nativeEvent: Event | undefined, keys: React.Key[] = [node.fullPath]) =>
                onSelect?.(keys, {node, nativeEvent});
        return (
                <div data-testid="tree-stub" data-selected={(selectedKeys ?? []).join(',')}>
                    {flatten(treeData).map((node) => (
                            <div key={node.fullPath} data-testid="tree-node" data-key={node.fullPath} data-selectable={String(node.selectable)}>
                                <span>{String(node.title)}</span>
                                <button data-action="trusted" onClick={() => select(node, Object.create(MouseEvent.prototype, {isTrusted: {value: true}}))}/>
                                <button data-action="untrusted" onClick={(event) => select(node, event.nativeEvent)}/>
                                <button data-action="empty" onClick={() => select(node, Object.create(MouseEvent.prototype, {isTrusted: {value: true}}), [])}/>
                            </div>
                    ))}
                </div>
        );
    }

    return {...actual, Tree};
});

class ResizeObserverMock {
    observe() {
    }

    unobserve() {
    }

    disconnect() {
    }
}

Object.defineProperty(globalThis, 'ResizeObserver', {value: ResizeObserverMock});

/** The backend answers with the content of the selected directory: plain keys are segments, keys with a slash are full paths. */
const tree: DirectoryNode[] = [
    {title: 'Index', key: 'index', is_leaf: true},
    {title: 'Child', key: 'child', is_leaf: true},
    {
        title: 'Sub', key: 'sub', is_leaf: false, children: [
            {title: 'Index', key: 'index', is_leaf: true},
            {title: 'Deep', key: 'deep', is_leaf: true},
        ],
    },
    {title: 'Nested', key: 'nested', is_leaf: false, children: [{title: 'Deep', key: 'deep', is_leaf: true}]},
    {title: 'Other', key: '/other/page/', is_leaf: true},
];

type MatchMediaStub = ReturnType<typeof window.matchMedia> & { listeners: Array<(event: MediaQueryListEvent) => void> };

function installMatchMedia(matches: boolean): MatchMediaStub {
    const listeners: MatchMediaStub['listeners'] = [];
    const mediaQuery = {
        matches,
        media: '(max-width: 799px)',
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn((_type: string, listener: (event: MediaQueryListEvent) => void) => {
            listeners.push(listener);
        }),
        removeEventListener: jest.fn((_type: string, listener: (event: MediaQueryListEvent) => void) => {
            listeners.splice(listeners.indexOf(listener), 1);
        }),
        dispatchEvent: jest.fn(() => false),
        listeners,
    } as unknown as MatchMediaStub;
    window.matchMedia = jest.fn(() => mediaQuery) as unknown as typeof window.matchMedia;
    return mediaQuery;
}

describe('SideBar', () => {
    const originalMatchMedia = window.matchMedia;
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        jest.clearAllMocks();
        jest.mocked(pageAPI.getDirectoryTree).mockResolvedValue({data: tree});
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        window.matchMedia = originalMatchMedia;
    });

    function render(ui: ReactElement, entry = '/pages/docs/child') {
        act(() => root.render(<MemoryRouter initialEntries={[entry]}>{ui}</MemoryRouter>));
    }

    async function settle() {
        await act(async () => {
            await new Promise((resolve) => window.setTimeout(resolve, 5));
        });
    }

    function nodeButton(key: string, action: 'trusted' | 'untrusted' | 'empty'): HTMLButtonElement {
        const node = container.querySelector(`[data-testid="tree-node"][data-key="${key}"]`);
        expect(node).not.toBeNull();
        return node!.querySelector(`button[data-action="${action}"]`) as HTMLButtonElement;
    }

    function click(button: HTMLButtonElement) {
        act(() => button.click());
    }

    it('builds the directory tree, folds index pages into their directory and marks the current page', async () => {
        const onPagePathSelect = jest.fn<(path: string) => void>();
        render(<SideBar siteName="Site" siteDescription="About" selectedDirectory="docs" onPagePathSelect={onPagePathSelect}/>);
        await settle();

        expect(pageAPI.getDirectoryTree).toHaveBeenCalledWith('docs');
        const keys = Array.from(container.querySelectorAll('[data-testid="tree-node"]')).map((node) => node.getAttribute('data-key'));
        expect(keys).toEqual(['docs/index', 'docs/child', 'docs/sub', 'docs/sub/deep', 'docs/nested', 'docs/nested/deep', 'other/page']);
        expect(container.querySelector('[data-key="docs/sub"]')?.getAttribute('data-selectable')).toBe('true');
        expect(container.querySelector('[data-key="docs/nested"]')?.getAttribute('data-selectable')).toBe('false');
        expect(container.querySelector('[data-key="docs/child"]')?.getAttribute('data-selectable')).toBe('true');
        expect(container.querySelector('[data-testid="tree-stub"]')?.getAttribute('data-selected')).toBe('docs/child');
    });

    it('selects the directory node for its index page and nothing outside the pages routes', async () => {
        render(<SideBar siteName="Site" siteDescription="About" selectedDirectory="docs" onPagePathSelect={jest.fn<(path: string) => void>()}/>,
                '/pages/docs/sub/index');
        await settle();
        expect(container.querySelector('[data-testid="tree-stub"]')?.getAttribute('data-selected')).toBe('docs/sub');

        act(() => root.unmount());
        root = createRoot(container);
        render(<SideBar siteName="Site" siteDescription="About" selectedDirectory="docs" onPagePathSelect={jest.fn<(path: string) => void>()}/>,
                '/galleries');
        await settle();
        expect(container.querySelector('[data-testid="tree-stub"]')?.getAttribute('data-selected')).toBe('');
    });

    it('navigates only on trusted clicks that lead to another page', async () => {
        const onPagePathSelect = jest.fn<(path: string) => void>();
        render(<SideBar siteName="Site" siteDescription="About" selectedDirectory="docs" onPagePathSelect={onPagePathSelect}/>);
        await settle();

        click(nodeButton('docs/sub', 'untrusted'));
        click(nodeButton('docs/sub', 'empty'));
        expect(onPagePathSelect).not.toHaveBeenCalled();

        // The current page is docs/child: selecting it again is a no-op.
        click(nodeButton('docs/child', 'trusted'));
        expect(onPagePathSelect).not.toHaveBeenCalled();

        // A directory without an index page has no target.
        click(nodeButton('docs/nested', 'trusted'));
        expect(onPagePathSelect).not.toHaveBeenCalled();

        click(nodeButton('docs/sub', 'trusted'));
        expect(onPagePathSelect).toHaveBeenLastCalledWith('docs/sub/index');
        click(nodeButton('docs/nested/deep', 'trusted'));
        expect(onPagePathSelect).toHaveBeenLastCalledWith('docs/nested/deep');
        click(nodeButton('other/page', 'trusted'));
        expect(onPagePathSelect).toHaveBeenLastCalledWith('other/page');
        expect(onPagePathSelect).toHaveBeenCalledTimes(3);
    });

    it('clears the tree when the directory has no data or the request fails', async () => {
        jest.mocked(pageAPI.getDirectoryTree).mockResolvedValue({data: undefined});
        render(<SideBar siteName="Site" siteDescription="About" selectedDirectory="docs" onPagePathSelect={jest.fn<(path: string) => void>()}/>);
        await settle();
        expect(container.querySelectorAll('[data-testid="tree-node"]')).toHaveLength(0);

        jest.mocked(pageAPI.getDirectoryTree).mockRejectedValue(new Error('offline'));
        act(() => root.unmount());
        root = createRoot(container);
        render(<SideBar siteName="Site" siteDescription="About" selectedDirectory="other" onPagePathSelect={jest.fn<(path: string) => void>()}/>);
        await settle();
        expect(container.querySelectorAll('[data-testid="tree-node"]')).toHaveLength(0);
        expect(container.querySelector('[data-testid="tree-stub"]')).not.toBeNull();
    });

    it('ignores tree answers and failures that arrive after unmounting', async () => {
        let resolveTree: (value: { data: DirectoryNode[] }) => void = () => undefined;
        let rejectTree: (reason: Error) => void = () => undefined;
        jest.mocked(pageAPI.getDirectoryTree)
                .mockReturnValueOnce(new Promise((resolve) => {
                    resolveTree = resolve;
                }))
                .mockReturnValueOnce(new Promise((_resolve, reject) => {
                    rejectTree = reject;
                }));
        render(<SideBar siteName="Site" siteDescription="About" selectedDirectory="docs" onPagePathSelect={jest.fn<(path: string) => void>()}/>);
        act(() => root.unmount());
        root = createRoot(container);
        await act(async () => {
            resolveTree({data: tree});
            await Promise.resolve();
        });
        expect(container.querySelectorAll('[data-testid="tree-node"]')).toHaveLength(0);

        render(<SideBar siteName="Site" siteDescription="About" selectedDirectory="docs" onPagePathSelect={jest.fn<(path: string) => void>()}/>);
        act(() => root.unmount());
        root = createRoot(container);
        await act(async () => {
            rejectTree(new Error('late'));
            await Promise.resolve();
        });
        expect(container.querySelectorAll('[data-testid="tree-node"]')).toHaveLength(0);
    });

    it('starts collapsed on a narrow display and follows media query changes', async () => {
        const mediaQuery = installMatchMedia(true);
        render(<SideBar siteName="Site" siteDescription="About" selectedDirectory="docs" onPagePathSelect={jest.fn<(path: string) => void>()}/>);
        await settle();
        expect(container.querySelector('[aria-label="Expand sidebar"]')).not.toBeNull();
        expect(container.querySelector('[data-testid="tree-stub"]')).toBeNull();
        expect(container.textContent).not.toContain('Site');
        expect(mediaQuery.listeners).toHaveLength(1);

        act(() => mediaQuery.listeners[0]({matches: false} as MediaQueryListEvent));
        expect(container.querySelector('[aria-label="Collapse sidebar"]')).not.toBeNull();
        expect(container.querySelector('[data-testid="tree-stub"]')).not.toBeNull();
        expect(container.textContent).toContain('Site');

        act(() => mediaQuery.listeners[0]({matches: true} as MediaQueryListEvent));
        expect(container.querySelector('[aria-label="Expand sidebar"]')).not.toBeNull();

        act(() => root.unmount());
        expect(mediaQuery.removeEventListener).toHaveBeenCalledTimes(1);
        expect(mediaQuery.listeners).toHaveLength(0);
        root = createRoot(container);
    });

    it('links the site name to the front page', async () => {
        render(<SideBar siteName="Site" siteDescription="About" selectedDirectory="docs" onPagePathSelect={jest.fn<(path: string) => void>()}/>);
        await settle();

        const link = container.querySelector('a.logo') as HTMLAnchorElement | null;
        expect(link).not.toBeNull();
        expect(link!.textContent).toBe('Site');
        expect(link!.getAttribute('href')).toBe('/pages/index');
        expect(link!.getAttribute('aria-label')).toBe('Site: front page');
    });

    it('renders expanded without a matchMedia implementation', async () => {
        (window as { matchMedia?: typeof window.matchMedia }).matchMedia = undefined;
        render(<SideBar siteName="Site" siteDescription="About" selectedDirectory="docs" onPagePathSelect={jest.fn<(path: string) => void>()}/>);
        await settle();
        expect(container.querySelector('[aria-label="Collapse sidebar"]')).not.toBeNull();
        expect(container.querySelector('[data-testid="tree-stub"]')).not.toBeNull();
    });
});
