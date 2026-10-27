# vempain-website-frontend — Agent Guide

## Scope

- React 19 + TypeScript + Ant Design 6 single-page app (Vite) for the **public website**. The backend is `vempain-website-backend` (Spring Boot);
  the reverse proxy routes `/api`, `/file` and `/health` to it and everything else to this app (`nginx.conf.template`).
- Page bodies are rendered with `@vempain/vempain-rt-renderer`; `src/rendererRuntime.ts` and `src/rendererGalleryAdapter.ts` are the reference
  `RendererProvider` runtime for that library, and `src/components/PageView.tsx` mounts `PageBodyRenderer`.

## Layout

| Path                       | Purpose                                                                                                                    |
|----------------------------|----------------------------------------------------------------------------------------------------------------------------|
| `src/App.tsx`              | Routes: `/pages/*`, `/search`, `/galleries`, `/galleries/:galleryId`, fallback to the default page                         |
| `src/components/`          | Layout (`TopBar`, `SideBar`, `BottomFooter`), page/gallery views, location map/modal, subjects                             |
| `src/pages/`               | Route components                                                                                                           |
| `src/context/`             | `AuthContext`, `ThemeContext`, `OpenGraphContext` (+ `*Instance.ts` files)                                                 |
| `src/services/`            | `AbstractAPI` (local, cookie based) and one `*API.ts` per backend resource                                                 |
| `src/tools/traceparent.ts` | W3C trace context of the page (own copy of the auth library's tool): one trace id per page load, a new span id per request |
| `src/models/`              | TS models mirroring the backend DTOs                                                                                       |
| `src/tools/`               | `routes.ts` (frontend/backend page-path helpers), `safePaths.ts`, `geo.ts`, `deepMerge.ts`, `openGraph.ts`                 |
| `src/__tests__/`           | Jest tests (`*.test.ts(x)`), mirroring the `src/` structure                                                                |
| `__mocks__/`               | Jest mocks (assets, styles, services, icons, `react-leaflet`, the renderer, `react-player`)                                |
| `jest/`                    | Custom `ts-jest` transformer that makes `import.meta.env` usable in CommonJS test runs                                     |

## Conventions

- **Authentication differs from the admin/file SPAs on purpose**: the website backend uses an `HttpOnly` cookie session (`withCredentials: true`) and
  mirrors refreshed tokens from the `X-Auth-Token` header. The local `src/services/AbstractAPI.ts` implements that; `@vempain/vempain-auth-frontend` is
  used only for shared types (`PagedRequest`, `PagedResponse`, `BuildInfo`). Do not swap in the bearer-token `AbstractAPI` from the auth library.
- Every request of `AbstractAPI.request` carries a W3C `traceparent` header from `src/tools/traceparent.ts` unless the caller set one (any letter case). The
  page trace id is logged once at `console.debug` level; Traefik and the website backend continue the
  trace (the backend CORS allows `traceparent`). Keep the tool in sync with `vempain-auth-frontend/src/tools/traceparent.ts`.
- `WebSiteFile`, `WebSiteGallery`, `WebSiteLocation` and `WebSiteSubject` carry the optional audit trail the backend exposes (`creator`, `created`,
  `modifier`, `modified`: admin users by nick, null for rows published before the site schema had the columns), mirroring
  `WebSitePage`; keep the models in step with the backend's `ResponseContractJTC`.
- JSON contracts are snake_case (`file_path`, `subject_ids`, `total_pages`); `src/__tests__/services/ApiSnakeCaseContract.test.ts` guards the
  critical ones.
- Build file URLs through `encodeApiPath()` in `src/tools/safePaths.ts`; never concatenate raw paths into `/file/...` URLs.
- Page style: a page's custom CSS (`WebSitePage.page_style`, written in the admin page editor, published to `web_site_page.page_style`
  and returned by the page content endpoint; list endpoints omit it) is applied by `src/components/PageStyle.tsx` as a `<style>` element
  for as long as `PageView` shows the page, document-wide, so a page can override the site's default style (the `:root` variables of
  `App.css`) as well as style its own canvas. The canvas is the `.content-section.page-detail` block, which carries `PAGE_CANVAS_CLASS`
  (`vps-page-canvas`, `src/tools/pageStyle.ts`; identical to the admin editor's canvas class, keep the two in step). `sanitizePageStyle`
  trims the CSS and neutralises `</style` so the text cannot close the element. The theme context's `applyPageStyle` is a different
  thing: it merges a theme token object, not CSS text.
- Internal links: the admin editor's link dialog writes root-relative hrefs into page bodies, `/pages/<path>` for a published page and
  `/file/<path>` for a published file (built by `tools/internalLinkTools.ts` of `vempain-admin-frontend` from
  `GET /admin-management/site/links` of the admin backend, every segment URL-encoded), so they match `toFrontendPagePath` and the
  `/file` prefix the reverse proxy sends to the website backend. `src/components/PageBody.tsx` mounts `PageBodyRenderer` for `PageView`
  and follows a plain left click on a link the application serves itself (`internalRouteFromHref` in `src/tools/routes.ts`: `/pages/...`,
  `/galleries...`, `/search`, also as an absolute URL of this site) with the router instead of a page load; a click with a modifier key,
  a `target`, a `download`, a `/file/...` link, another site or an in-page anchor is left to the browser. Keep the two prefixes in step
  with the admin frontend's `internalLinkTools.ts`.
- Preserve the route helpers in `src/tools/routes.ts` (`toFrontendPagePath`, `toBackendPagePath`, ...); the renderer runtime depends on them.
  `DEFAULT_PAGE_PATH` (`index`) there is the front page: the fallback route of `App.tsx` and the site name in the sidebar header (`SideBar.tsx`, a router `Link`
  styled as `.logo`) both lead to `toFrontendPagePath(DEFAULT_PAGE_PATH)`.
- Do not add TypeScript `enum`; use `as const` objects like the other Vempain frontends.
- Build metadata is generated by `generateBuildInfo.js` into `src/buildInfo.json`; treat the JSON as a derived artifact.
- `.env.example` is the template (`VITE_API_BASE_URL`); `.env.local`/`.env.prod` are local/deployment files and must not receive secrets.

## Open Graph and link previews

- `OpenGraphProvider` (`src/context/OpenGraphContext.tsx`, mounted in `App.tsx` with the site name and description from the configuration)
  keeps the document title and the `description`, `canonical`, `og:*`, `article:*` and `twitter:*` tags of `<head>` in step with the
  route. Routes publish their metadata with `useOpenGraph().setRouteOpenGraph(meta | null)`; it is dropped automatically when the
  route changes, and the site level metadata (`siteOpenGraph`) is used until a route publishes its own. `src/tools/openGraph.ts`
  holds the pure functions (`buildHeadData`, `applyHeadData`, `pageOpenGraph`); URLs are built from `window.location.origin` and
  `fileAPI.getFileUrl`, never from a configured host name.
- `PagesRoute` publishes `open_graph` from the page response (`WebSitePage.open_graph`, computed by the backend: title, header or body
  summary, first image/hero/gallery embed the caller may see); a page from a backend without the field gets `pageOpenGraph(page)`.
  `GalleryRoute` publishes the gallery number as title.
- Link-preview crawlers (Facebook, Slack, Discord, Telegram, WhatsApp, X, LinkedIn, Mastodon, Bluesky, ...) do not run the app, so
  `nginx.conf.template` proxies requests whose `User-Agent` matches the crawler list to the website backend,
  `GET /api/public/open-graph/<route>` (`Accept: text/html`), which answers with a small HTML document carrying the same tags. The
  proxy drops `Cookie`/`Authorization`, so that document never describes restricted content, and passes `X-Vempain-Origin`
  (`X-Forwarded-Proto` restricted to http/https + `Host`) for the absolute URLs. Search engines are not in the list on purpose: they
  render JavaScript and must index the real pages. The backend address (host:port) comes from `VEMPAIN_BACKEND_ADDRESS` (Dockerfile default
  `vempain-site-backend:8000`, the compose service name) through an `upstream` block; nginx renders the template at container start with
  `NGINX_ENVSUBST_FILTER=^VEMPAIN_`, so nginx's own `$variables` stay untouched.
- Tests: `src/__tests__/tools/openGraph.test.ts`, `src/__tests__/context/OpenGraphContext.test.tsx`, `src/__tests__/pages/OpenGraphRoutes.test.tsx`.

## Gallery and image overlay

- `src/components/PageTags.tsx` shows the subjects of a page as colored Ant Design tags in the title row of `PageView` (`.page-title-row`);
  the color of a tag is a stable function of its name (`tools/tagColors.ts`, `tagColor` over the preset palette `TAG_COLORS`), and a click opens
  the subject search. `ShowSubjects` (single blue tags) stays for the page list cards and the metadata overlay. Tested in
  `src/__tests__/components/PageView.test.tsx` and `src/__tests__/tools/tagColors.test.ts`.
- `src/components/GalleryBlock.tsx` renders published galleries. Each thumbnail sits in a fixed-ratio frame (`THUMBNAIL_FRAME_STYLE`, `overflow: hidden`)
  and is drawn with `object-fit: cover` centred, so the frame always shows the full narrower dimension and the middle of the wider one. The Ant Design
  `Image` wrapper (`.ant-image`) must be sized to the frame through `styles.root` (`THUMBNAIL_WRAPPER_STYLE`); without it the wrapper has no height,
  the image keeps its natural shape and the frame clips the top of a tall thumbnail or leaves the bottom empty under a wide one.
  The next batch of a gallery loads by itself when the sentinel under the grid scrolls into view (`IntersectionObserver`, 200px ahead);
  the "Lataa lisää" button and the preview prefetch call the same `loadMore`, which issues one request at a time (`fetchInFlightRef`).
  That guard holds only while the host's `fetchMoreFiles` promise is pending, so a host must return a promise that settles when the page
  has arrived, never one that resolves before the request: `GalleryLoader` additionally keeps the pending request in `nextPageRequestRef`
  and hands it to every caller until it settles, and drops a response that belongs to a previous gallery (`galleryGenerationRef`). A
  loader that resolves early makes the still-visible sentinel request the same page again and shows every image of that page twice.
  Without `IntersectionObserver` (old browsers, jsdom) only the button loads.
  Hovering a thumbnail shows the whole thumbnail in an Ant Design `Tooltip` (`THUMB_TOOLTIP_STYLES`, `THUMB_TOOLTIP_IMAGE_STYLE`). Ant Design
  caps a tooltip box at 250px, which the preview image would overflow and bleed past the browser edge on the outer columns, so the preview lifts
  the cap (`styles.root.maxWidth: 'none'`) and bounds the image by the viewport minus a gutter as well as by its fixed maximum size; with the
  box sized to the image, the tooltip's own overflow handling shifts or flips it into view. Keep both together when changing the preview.
  `@vempain/vempain-rt-renderer` only delegates gallery embeds to the host through
  the `renderGallery` prop of `PageBodyRenderer`, so gallery and image-overlay changes belong in this repository, not in the renderer.
- The thumbnail grid is responsive: `repeat(auto-fill, minmax(min(250px, 100%), 1fr))` with no cap on the column count (the grid spans the
  content width, so a wide screen gets as many columns as fit). It drops columns with the
  available width down to one, and the single column shrinks below the thumbnail width, so the sidebar collapse (`SideBar.tsx`,
  `max-width: 799px`) only has to handle widths below one column. Thumbnails keep a fixed 250:166 aspect ratio.
- `src/components/MetadataOverlay.tsx` is paged like a carousel: page `details` (comment, dates, rights, author, subjects) and page `camera`,
  built by `src/tools/imageMetadata.ts` from the site file `metadata` JSON (camera model, pixel size, megapixels, bits per sample, ISO,
  shutter speed, focal length, aperture). Pages without content are skipped and the pager is shown only when more than one page has content.

## Tooling and validation

- Use the checked-in Yarn 4 release (`.yarn/releases`, `yarnPath` in `.yarnrc.yml`); `@vempain/*` packages resolve from GitHub Packages with
  `VEMPAIN_ACTION_TOKEN`.
- Tests are Jest (`ts-jest`, jsdom, `src/setupTests.ts`) and live in `src/__tests__/` only, mirroring the `src/` layout. Component tests render
  with `react-dom/client` and `act` from `react`; there is no testing-library dependency. Style-contract tests read the CSS/TS sources with `fs`
  (`AppLayout.test.ts`, `services/ApiSnakeCaseContract.test.ts`).
- Coverage is enforced: `collectCoverageFrom` in the `jest` block covers all of `src/` except `models/`, `services/`, `main.tsx`, `setupTests.ts`
  and the test sources, and `coverageThreshold` fails the run below 95% statements/branches/functions/lines. New components, routes, contexts and
  tools need tests in the same commit.
- Run after changes affecting behavior, routing, APIs, authentication or deployment:

```bash
yarn lint
yarn typecheck
yarn test
yarn build:production
```

`yarn lint` is type-aware (`parserOptions.projectService`) and fails on `@typescript-eslint/no-deprecated`: any use of functionality that the type declarations
mark `@deprecated` (Ant Design props, DOM or library APIs) must be replaced by the documented successor. CI runs it before the build.

- CI uses the reusable `frontend-spa.yaml` workflow from `vempain-workflows`. Do not commit `dist/`, `coverage/`, `node_modules/` or local `.env` files.
- Security findings and their mitigations are recorded in `security/OWASP-2025-audit-report.md`; keep it current when changing sanitization,
  URL building or authentication handling.

### Test harness

The `jest` block of `package.json` papers over the gap between the Vite/ESM build and the CommonJS test compiler. Know these before writing a test:

| Mechanism                                                       | Effect                                                                                                     |
|-----------------------------------------------------------------|------------------------------------------------------------------------------------------------------------|
| `jest/tsJestImportMetaTransformer.cjs`                          | Rewrites `import.meta.env` in non-test sources to the `__VITE_ENV__` global that `src/setupTests.ts` seeds |
| `^(\.{1,2}/)+services$`                                         | Every relative `.../services` import resolves to the `jest.fn()` stubs in `__mocks__/servicesMock.ts`      |
| `^antd/es/(.*)$` to `antd/lib/$1`                               | Ant Design renders for real; mock `antd` per test only when a component cannot be driven otherwise         |
| `@ant-design/icons`                                             | Proxy mock returning an empty component for any icon name, so icons never need mocking                     |
| `react-leaflet`, `@vempain/vempain-rt-renderer`, `react-player` | ESM-only packages replaced by stubs in `__mocks__/`                                                        |

`src/setupTests.ts` also sets `IS_REACT_ACT_ENVIRONMENT`, a `window.matchMedia` stub and `TextEncoder`/`TextDecoder`. `tsconfig.test.json` adds
`vite/client` types, `allowJs` and `resolveJsonModule` on top of `tsconfig.app.json`.

## Tag ACL rule

Tags are metadata, not ACL-bearing resources. Tag entities have no ACL information, so tag list, search, and mutation endpoints must not perform ACL checks on
tags. ACL checks apply only to resources that explicitly carry an ACL.
