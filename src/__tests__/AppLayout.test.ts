import {describe, expect, it} from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';

describe('application layout', () => {
    it('gives carousel embeds a constrained viewport width', () => {
        const indexCss = fs.readFileSync(path.join(process.cwd(), 'src/index.css'), 'utf8');
        const appCss = fs.readFileSync(path.join(process.cwd(), 'src/App.css'), 'utf8');

        expect(indexCss).not.toMatch(/body\s*\{[^}]*display:\s*flex/s);
        expect(appCss).toMatch(/#root\s*\{[^}]*width:\s*100%/s);
        expect(appCss).toMatch(/\.app-layout\s*\{[^}]*width:\s*100%/s);
        expect(appCss).toMatch(/\.app-main\s*\{[^}]*min-width:\s*0/s);
        expect(appCss).toMatch(/\.app-content\s*\{[^}]*min-width:\s*0/s);
    });
});
