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
