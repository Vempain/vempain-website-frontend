---
name: write-tests-in-harness
description: Write Jest tests for the website frontend inside its custom harness (import.meta transformer, services auto-mock, antd lib mapping, ESM stubs, 95 percent coverage threshold). Use whenever adding or changing a component, route, context or tool.
---

# Tests in vempain-website-frontend

- Tests live only in `src/__tests__/`, mirroring `src/` (`components/`, `context/`, `pages/`, `services/`, `tools/`), named `*.test.ts(x)`.
  Component tests render with `react-dom/client` and `act` from `react`; there is no testing-library dependency.
- Harness (the `jest` block of `package.json`):
    - `jest/tsJestImportMetaTransformer.cjs` rewrites `import.meta.env` in sources to the `__VITE_ENV__` global seeded in `src/setupTests.ts`;
    - every relative `.../services` import resolves to the `jest.fn()` stubs in `__mocks__/servicesMock.ts`; set return values per test;
    - `antd/es/*` maps to `antd/lib/*` so Ant Design renders for real; mock `antd` only when a component cannot be driven otherwise;
    - `@ant-design/icons` is a proxy returning empty components; `react-leaflet`, `@vempain/vempain-rt-renderer`, `react-player` are
      stubbed in `__mocks__/`;
    - `src/setupTests.ts` sets `IS_REACT_ACT_ENVIRONMENT`, `window.matchMedia`, `TextEncoder`/`TextDecoder`.
- Coverage threshold is 95% statements/branches/functions/lines over `src/` (except `models/`, `services/`, `main.tsx`, `setupTests.ts`);
  new code needs tests in the same commit or `yarn test` fails.
- Contract tests read sources with `fs` (`AppLayout.test.ts`, `services/ApiSnakeCaseContract.test.ts`); extend them when adding critical
  snake_case fields or layout rules.
- Run a single file with `yarn jest src/__tests__/<path>`; the full `yarn test` enforces coverage.
