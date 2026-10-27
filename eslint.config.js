import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default [
    {
        ignores: ['dist', '.yarn/**', 'node_modules/**']
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            parser: tseslint.parser,
            ecmaVersion: 2020,
            globals: globals.browser,
        },
        plugins: {
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            'react-refresh/only-export-components': [
                'warn',
                {allowConstantExport: true},
            ],
        },
    },
    {
        // Jest mocks and the custom ts-jest transformer are CommonJS test infrastructure, not shipped components.
        files: ['__mocks__/**', 'jest/**'],
        rules: {
            '@typescript-eslint/no-require-imports': 'off',
            'react-refresh/only-export-components': 'off',
        },
    },
    {
        // Type-aware rules for the sources and tests; the root-level mocks and setup files belong to no tsconfig project and keep the plain rules
        files: ['src/**/*.{ts,tsx}'],
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            // Deprecated 3rd-party functionality (anything its type declarations mark @deprecated: Ant Design props, DOM and library APIs) fails the lint
            '@typescript-eslint/no-deprecated': 'error',
        },
    },
]
