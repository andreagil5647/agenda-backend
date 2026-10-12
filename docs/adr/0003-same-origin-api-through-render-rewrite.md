# 0003. Same-origin API through the web app's rewrite

- Status: Accepted
- Date: 2026-09-25

## Context

The web app (Render static site) and the API (Render web service) get separate
`*.onrender.com` hostnames. `onrender.com` is on the Public Suffix List, so the two are
different _sites_ to the browser. A session cookie set by the API is then a third-party
cookie: Safari, most mobile browsers and private windows block it even with
`SameSite=None; Secure`. A custom domain would fix this but is not free.

## Options considered

- **Cross-site cookies** (`SameSite=None; Secure`): fails on Safari and iOS.
- **Bearer tokens** stored by the web app: works cross-site, but tokens readable by
  JavaScript are exposed to any XSS, and revocation needs extra machinery.
- **Custom domain** (`app.` and `api.` under one registrable domain): robust, costs money.
- **Rewrite on the static site**: the web app's host forwards `/api/*` to the API. The
  browser only sees one origin, so cookies are first-party.

## Decision

The static site has a rewrite rule `/api/*` → `https://<api>.onrender.com/api/*`, placed
before the SPA fallback. The web app calls relative `/api/v1/...` URLs. In development the
webpack dev server proxies `/api` the same way, so both environments behave alike.

Sessions will use an opaque token in an `HttpOnly; Secure; SameSite=Lax` cookie, stored
hashed in MongoDB, with a double-submit CSRF token on unsafe methods.

## Consequences

- No CORS in production for browser traffic; `CORS_ORIGINS` only matters for direct calls.
- `SameSite=Lax` works because requests are same-site.
- The rewrite adds a proxy hop. `TRUST_PROXY_HOPS` must match the real chain so rate
  limiting sees client IPs; this is checked against the forwarded headers after deployment.
- While the free API instance wakes up (about a minute), the rewrite may return an error
  instead of waiting. The web app polls `GET /api/v1/health` and shows a "waking up" state.
