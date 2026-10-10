/* global module, require */

/*
 * ts-jest wrapper that makes Vite's `import.meta.env` usable under the CommonJS test compiler.
 *
 * TypeScript rejects `import.meta` when emitting CommonJS (TS1343), so the expression is rewritten - before ts-jest sees the source - into a
 * cast of the `__VITE_ENV__` global that `src/setupTests.ts` installs. The replacement stays on the same line, so line numbers and therefore
 * coverage reporting are unaffected. Test sources are left untouched: they may quote `import.meta.env` as plain text, as the source contract
 * tests in `src/__tests__/services/` do.
 */

const {TsJestTransformer} = require('ts-jest');

const IMPORT_META_ENV = /import\.meta\.env/g;
const TYPED_ENV = '(globalThis as unknown as {__VITE_ENV__: Record<string, string | undefined>}).__VITE_ENV__';
const PLAIN_ENV = 'globalThis.__VITE_ENV__';
const TEST_SOURCE = /(__tests__|\.(test|spec)\.[tj]sx?$)/;

function rewrite(sourceText, sourcePath) {
    if (!sourceText.includes('import.meta.env') || TEST_SOURCE.test(sourcePath)) {
        return sourceText;
    }

    return sourceText.replace(IMPORT_META_ENV, /\.tsx?$/.test(sourcePath) ? TYPED_ENV : PLAIN_ENV);
}

class ImportMetaTsJestTransformer extends TsJestTransformer {
    process(sourceText, sourcePath, options) {
        return super.process(rewrite(sourceText, sourcePath), sourcePath, options);
    }

    processAsync(sourceText, sourcePath, options) {
        return super.processAsync(rewrite(sourceText, sourcePath), sourcePath, options);
    }
}

module.exports = {
    createTransformer: (options) => new ImportMetaTsJestTransformer(options),
};
