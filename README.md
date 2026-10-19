# Vempain Website Frontend

React/TypeScript/Vite frontend for the public Vempain website. It is deployed
independently from `vempain-website-backend`, which is the current Spring Boot
backend.

## Development

Use the repository's Yarn 4 release and scripts in `package.json`. Common
checks are:

```bash
yarn lint
yarn typecheck
yarn test
yarn build:production
```

API paths, route helpers, authentication/session handling, embeds, and file
rendering must remain compatible with the website backend and the reverse
proxy paths `/api`, `/file`, and `/health`.

Do not commit generated bundles, coverage output, local `.env` files, or
credentials.

## Trace propagation

Every API call carries a W3C `traceparent` header: one trace id per page load (printed once to the browser console at
debug level as `[vempain] page trace id ...`) and a new span id per request. Traefik and the website backend continue the
trace, so a visitor's API calls can be followed end to end in Grafana; quote the page trace id when reporting a problem.

## Open Graph and link previews

Every route sets its document title and Open Graph / Twitter card tags in the browser
from the metadata the backend sends with a page (`open_graph`), using the origin the
site is served from. Link-preview crawlers do not run the application, so the nginx
configuration (`nginx.conf.template`) proxies requests with a crawler `User-Agent` to
the website backend's `GET /api/public/open-graph/<route>`, which answers with a small
HTML document carrying the same tags. The backend address (host:port) is
`VEMPAIN_BACKEND_ADDRESS` (default `vempain-site-backend:8000`); set it when the
backend service has another name or address.
