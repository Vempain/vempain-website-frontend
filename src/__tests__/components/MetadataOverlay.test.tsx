import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals';
import {act, type ReactElement, type ReactNode} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {MetadataOverlay} from '../../components/MetadataOverlay';

jest.mock('antd', () => ({
    Button: ({children, onClick, ...rest}: { children?: ReactNode; onClick?: () => void; 'aria-label'?: string }) => (
            <button type="button" onClick={onClick} aria-label={rest['aria-label']}>{children}</button>
    ),
    Descriptions: Object.assign(
            ({children}: { children: ReactNode }) => <dl>{children}</dl>,
            {
                Item: ({label, children}: { label: string; children: ReactNode }) => <div>
                    <dt>{label}</dt>
                    <dd>{children}</dd>
                </div>
            },
    ),
    Typography: {Text: ({children}: { children: ReactNode }) => <span>{children}</span>},
}));
jest.mock('@ant-design/icons', () => ({LeftOutlined: () => <i/>, RightOutlined: () => <i/>}));
jest.mock('../../components/ShowSubjects', () => ({
    ShowSubjects: ({subjects}: { subjects?: Array<{ subject: string }> }) => <ul>{subjects?.map((s) => <li key={s.subject}>{s.subject}</li>)}</ul>,
}));

const details = [{label: 'Kommentti', value: 'Sunset'}];
const camera = [{label: 'Kamera', value: 'Canon EOS R5'}, {label: 'Aukko', value: 'f/1.8'}];

describe('MetadataOverlay', () => {
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
        act(() => root.render(ui));
    }

    function overlay(): HTMLElement {
        return document.body.querySelector('[data-testid="metadata-overlay"]') as HTMLElement;
    }

    it('renders a single page without pager controls', () => {
        render(<MetadataOverlay entries={details}/>);

        expect(overlay().getAttribute('data-page')).toBe('details');
        expect(overlay().textContent).toContain('Sunset');
        expect(document.body.querySelector('[aria-label="Seuraava sivu"]')).toBeNull();
        expect(document.body.querySelector('[role="tablist"]')).toBeNull();
    });

    it('pages between the details and the camera data like a carousel', () => {
        render(<MetadataOverlay pages={[
            {
                key: 'details',
                title: 'Lisätiedot',
                entries: details,
                subjects: [{id: 1, subject: 'travel', subject_de: null, subject_en: null, subject_es: null, subject_fi: null, subject_se: null}]
            },
            {key: 'camera', title: 'Kamera', entries: camera},
        ]}/>);

        expect(overlay().getAttribute('data-page')).toBe('details');
        expect(overlay().textContent).toContain('travel');
        expect(overlay().textContent).toContain('1 / 2');
        expect(document.body.querySelectorAll('[role="tab"]')).toHaveLength(2);

        act(() => (document.body.querySelector('[aria-label="Seuraava sivu"]') as HTMLButtonElement).click());
        expect(overlay().getAttribute('data-page')).toBe('camera');
        expect(overlay().textContent).toContain('Canon EOS R5');
        expect(overlay().textContent).toContain('f/1.8');
        expect(overlay().textContent).not.toContain('Sunset');
        expect(overlay().textContent).toContain('2 / 2');

        // wraps around, and the dots select pages directly
        act(() => (document.body.querySelector('[aria-label="Seuraava sivu"]') as HTMLButtonElement).click());
        expect(overlay().getAttribute('data-page')).toBe('details');
        act(() => (document.body.querySelectorAll('[role="tab"]')[1] as HTMLButtonElement).click());
        expect(overlay().getAttribute('data-page')).toBe('camera');
        act(() => (document.body.querySelector('[aria-label="Edellinen sivu"]') as HTMLButtonElement).click());
        expect(overlay().getAttribute('data-page')).toBe('details');
    });

    it('skips empty pages and renders nothing when no page has content', () => {
        render(<MetadataOverlay pages={[{key: 'details', title: 'Lisätiedot', entries: []}, {key: 'camera', title: 'Kamera', entries: camera}]}/>);
        expect(overlay().getAttribute('data-page')).toBe('camera');
        expect(document.body.querySelector('[role="tablist"]')).toBeNull();

        render(<MetadataOverlay pages={[{key: 'details', title: 'Lisätiedot', entries: []}]}/>);
        expect(document.body.querySelector('[data-testid="metadata-overlay"]')).toBeNull();
    });
});
