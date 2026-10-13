---
name: add-route-with-open-graph
description: Add or change a route or page view of the public website frontend, including its Open Graph metadata, cookie-based API calls, safe file URLs and renderer runtime. Use for routing, page, gallery or link-preview work.
---

# Add a route to vempain-website-frontend

1. Route component in `src/pages/`, registered in `src/App.tsx` (`/pages/*`, `/search`, `/galleries`, `/galleries/:galleryId`, fallback to
   the default page); layout pieces in `src/components/`.
2. Page paths go through `src/tools/routes.ts` (`toFrontendPagePath`, `toBackendPagePath`); the renderer runtime depends on them.
3. API calls use the local cookie-based `src/services/AbstractAPI.ts` (`withCredentials`, `X-Auth-Token` refresh); never the bearer
   `AbstractAPI` of `@vempain/vempain-auth-frontend` (used only for types). Models in `src/models` mirror the backend DTOs in snake_case.
4. File URLs are built with `encodeApiPath()` (`src/tools/safePaths.ts`), never by concatenating raw paths into `/file/...`.
5. Open Graph: publish the route's metadata with `useOpenGraph().setRouteOpenGraph(meta | null)` (pages use `page.open_graph` from the
   backend, `pageOpenGraph(page)` as fallback); URLs come from `window.location.origin` and `fileAPI.getFileUrl`. Crawlers are served by
   the nginx proxy to `GET /api/public/open-graph/<route>` (`nginx.conf.template`), so a new route needs the backend's `OpenGraphService`
   to know it.
6. Page bodies render through `PageBodyRenderer` from `@vempain/vempain-rt-renderer` inside `RendererProvider`
   (`src/rendererRuntime.ts`, `src/rendererGalleryAdapter.ts`); gallery UI and the image metadata overlay belong here (`GalleryBlock.tsx`,
   `MetadataOverlay.tsx`), not in the renderer.
7. No TypeScript `enum`; tests in the same commit (see `write-tests-in-harness`); run `yarn lint`, `yarn typecheck`, `yarn test`,
   `yarn build:production`.
