# vempain-website-frontend — Agent Guide

## Scope

This repository contains the public React/TypeScript website frontend. The
backend is maintained separately in `vempain-website-backend` and is a
Spring Boot application.

## Conventions

- Use the checked-in Yarn 4 tooling and existing scripts.
- Preserve route helpers and API contracts; JSON fields use snake_case.
- Shared authentication clients should follow the established
  `vempain-auth-frontend` patterns.
- Prefer existing components and utilities over duplicate implementations.
- Do not add TypeScript `enum`; use the repository's established constant
  object patterns.

## Gallery and image overlay

- `src/components/GalleryBlock.tsx` renders published galleries; `vempain-rt-renderer`
  only delegates to it through the `renderGallery` prop of `PageBodyRenderer`, so
  gallery and overlay changes belong here, not in the renderer.
- The thumbnail grid is responsive: `repeat(auto-fill, minmax(min(250px, 100%), 1fr))`
  capped at five columns. It drops columns with the available width down to one and the
  single column shrinks below the thumbnail width, so the sidebar collapse (`SideBar.tsx`, `max-width: 799px`) only has to handle widths below one column.
- `src/components/MetadataOverlay.tsx` is paged like a carousel: page `details`
  (comment, dates, rights, author, subjects) and page `camera` built by
  `src/tools/imageMetadata.ts` from the file `metadata` JSON (camera model, pixel size,
  megapixels, bits per sample, ISO, shutter speed, focal length, aperture). Pages without
  content are skipped; the pager is only shown when more than one page has content.

## Validation

Component tests use `react-dom/client` with `act` from `react` and mock Ant Design where
needed; there is no testing-library dependency. New tests go to `src/__tests__/`,
mirroring the `src/` layout.

Run `yarn lint`, `yarn typecheck`, `yarn test`, and the production build for
changes affecting application behavior, routing, APIs, authentication, or
deployment configuration.

## Tag ACL rule

Tags are metadata, not ACL-bearing resources. Tag entities have no ACL information, so tag list, search, and mutation endpoints must not perform ACL checks on tags. ACL checks apply only to resources that explicitly carry an ACL.
