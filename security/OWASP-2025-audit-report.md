# OWASP Top 10:2025 audit — standalone website frontend

Date: 2026-09-15  
Scope: `vempain-website-frontend` (React 19, TypeScript, Vite, Yarn 4). No backend source was changed.

## Scope and asset inventory

The browser serves the Vite SPA from nginx. It calls the configured website API (`VITE_APP_API_URL`, normally
`/api`) and the file API (`/file` through the API base URL), and loads OpenStreetMap tiles over HTTPS. Public page,
gallery, search and file reads are rendered in the SPA; login/logout are POST requests. The API response may provide a
JWT, which this frontend currently stores as `jwt_token` in `localStorage` for compatibility with the website
authentication contract. The browser-to-API boundary is trusted only for presentation: authorization and ACL decisions
remain backend responsibilities. The production artifact is a static nginx image (`Dockerfile`, `nginx.conf`).

Sensitive data handled in-browser includes the login password during submission, JWT/session state, page bodies,
gallery metadata and location data. Dependencies are inventoried by `package.json` and `yarn.lock`; no SCA, SAST or
secret scanner is configured, so dependency scanning remains a recommended CI control.

## Threat model and migration parity

An anonymous browser can request public pages, galleries, search data and files. An authenticated browser can request
ACL-protected content and location metadata. A stolen browser token is replayable until the backend expires/revokes it;
the frontend clears it on 401 and logout, but cannot invalidate a stateless token itself. The replacement Spring website
backend and legacy PHP implementation are separate trust boundaries: this report does not claim that frontend controls
replace backend ACL, path containment, cookie, CSRF, rate-limit, or error controls. `/api`, `/file`, `/health`, and
page routing must be verified against both implementations during migration. Legacy PHP deployment status is not
discoverable from this repository and is therefore **UNVERIFIED**; confirm the active ingress before decommissioning it.

## Findings remediated

### F-01 — HIGH/MEDIUM: server-provided file paths were interpolated into API URLs

`src/services/FileAPI.ts` previously interpolated `file_path` directly into `/file/${filePath}`, and embed
identifiers were similarly interpolated by `PageAPI`. Malformed values containing URL syntax or dot segments could
cause requests outside the intended client-side namespace and made backend path-traversal mistakes easier to reach.
`src/tools/safePaths.ts` now rejects control characters, backslashes and `.`/`..` segments and percent-encodes every
path segment. `FileAPI` fails closed for invalid paths; `PageAPI` rejects invalid embed identifiers/cluster keys.
Regression coverage: `src/services/FileAPISecurity.test.ts`.

### F-02 — MEDIUM: static delivery lacked browser hardening headers

`nginx.conf` did not set response security headers. Production nginx now sends `X-Content-Type-Options`,
`X-Frame-Options`, `Referrer-Policy`, and restrictive `Permissions-Policy`; `index.html` is `no-store` to reduce stale
SPA/auth configuration caching. Runtime verification against the deployed proxy remains required because ingress may
override headers.

## A01–A10 checklist

| Category | Verdict | Evidence / disposition |
|---|---|---|
| A01 Broken Access Control | **MEDIUM residual / backend required** | Client route/UI guards are not authorization. API calls use backend responses and 401 expiry handling; verify anonymous/wrong-user/right-user behavior in both PHP and Spring services. Path/identifier validation fixed in F-01. |
| A02 Security Misconfiguration | **PASS (frontend delivery)** | F-02 headers and `index.html` cache policy in `nginx.conf`; container is static nginx. Proxy/TLS and backend error exposure are unverified here. |
| A03 Software Supply Chain Failures | **INFO** | Yarn lockfile is committed and build uses the lockfile. No configured SCA/provenance scanner; add CI scanning as a separate approved change. |
| A04 Cryptographic Failures | **MEDIUM residual** | HTTPS is used for external map resources and deployment must provide TLS. JWT is stored in localStorage for compatibility; migrate to secure HttpOnly cookie/session contract in the active backend before removing this residual. |
| A05 Injection | **PASS (frontend sinks reviewed)** | React JSX escapes displayed API strings; no `dangerouslySetInnerHTML`, `eval`, or `new Function` found. URL path encoding/rejection is covered by F-01. Renderer dependency and backend HTML sanitization require service-level review. |
| A06 Insecure Design | **MEDIUM residual** | Frontend intentionally treats authorization as a backend concern and clears state on 401. Add backend rate limits/session lifecycle controls and verify parity before migration cutover. |
| A07 Authentication Failures | **MEDIUM residual** | Login/logout are explicit POST calls; token is cleared on logout and 401. Token replay/expiry and account-rate limiting are backend controls and remain unverified here. |
| A08 Software/Data Integrity Failures | **PASS (build integrity)** | Production build is generated from checked-in Yarn lockfile and Vite source; no runtime remote scripts are configured. CI artifact signing/provenance is not configured (INFO). |
| A09 Logging/Alerting Failures | **UNVERIFIED** | Frontend reports failed loads to console only; authentication/access logging and alerting belong to the API/proxy and require local dynamic probes. |
| A10 Mishandling Exceptions | **PASS (frontend boundary)** | API errors are converted to bounded response messages and UI rendering uses React text nodes. Backend stack traces/problem details and proxy error pages require separate verification. |

## Verification

Passed from the frontend repository:

```text
yarn lint
yarn typecheck
yarn test                 # 4 suites, 7 tests passed
yarn build:production    # Vite production build passed
```

The new regression test covers encoded names, URL metacharacters, traversal and control characters. Backend source and
backend checks were intentionally not modified or run as part of this frontend-only change. Cross-link: the standalone
backend audit should reference this report when documenting `/api` and `/file` parity.

## Accepted/deferred risks

The frontend cannot enforce ACLs, invalidate stateless JWTs, add rate limiting, or guarantee secure cookie flags.
`localStorage` token compatibility and unknown legacy PHP deployment status are explicit migration residuals, not
resolved by React changes. Before cutover, probe both backend implementations and the real reverse proxy for
anonymous/invalid/authorized requests, malformed paths, `/health`, headers, error bodies, logout replay, and file
containment.
