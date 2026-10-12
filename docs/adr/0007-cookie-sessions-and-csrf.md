# 0007. Cookie sessions and CSRF protection

- Status: Accepted
- Date: 2026-10-07

## Context

Agenda runs the API behind the web app's same-origin `/api/*` rewrite. That lets the browser
use first-party cookies for authenticated requests, but unsafe requests still need CSRF
protection because cookies are sent automatically.

## Options considered

- **Bearer tokens in local storage**: simple for the frontend, but a script injection can read
  the token directly.
- **Opaque `HttpOnly` session cookie only**: protects the token from JavaScript, but unsafe
  requests are exposed to CSRF.
- **Opaque `HttpOnly` session cookie plus double-submit CSRF token**: keeps the session secret
  out of JavaScript while requiring browser clients to echo a separate token on unsafe methods.

## Decision

Sessions use an opaque random token in an `HttpOnly; Secure; SameSite=Lax` cookie. Only the
SHA-256 hash of that token is stored in MongoDB, with a TTL index on `expiresAt`.

Login and registration also set a separate readable CSRF cookie. The server stores a hash of
that CSRF token on the session document. Unsafe requests that operate on an active session must
send the same token in the `X-CSRF-Token` header and the CSRF cookie. The API also rejects unsafe
requests with a disallowed `Origin` or `Sec-Fetch-Site: cross-site`.

Passwords are hashed with argon2id. User documents keep the password hash out of every response.

## Consequences

- The frontend can bootstrap auth state from `GET /auth/session` and keep using relative `/api`
  calls with credentials.
- XSS cannot read the session token, though it can still perform actions as the user; normal
  output escaping and content security remain important.
- CSRF validation is tied to a real server-side session, so a forged readable cookie alone is not
  enough.
- Local development must send requests from an allowed origin, matching production's same-origin
  rewrite model.
