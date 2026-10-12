# 0004. Layered modules and a code-first OpenAPI contract

- Status: Accepted
- Date: 2026-09-25

## Context

The API is consumed by a separate repository that generates its TypeScript types from an
OpenAPI document. If the document is written by hand it drifts from the code; if validation
and documentation are defined separately they drift from each other.

## Options considered

- **Spec-first**: hand-written YAML, validated at runtime by a middleware. The spec is the
  source of truth, but TypeScript types must be generated back into the server.
- **Code-first from zod**: zod schemas validate requests and are converted to OpenAPI.
- **Annotations/JSDoc**: comments that generate a spec; nothing checks them against runtime
  behaviour.

## Decision

Code-first. `createRouteBuilder` registers each endpoint once: the zod schemas for params,
query and body validate the request and are added to an OpenAPI 3.1 registry
(`@asteasolutions/zod-to-openapi`). The document is served at `/api/openapi.json`, rendered
at `/api/docs`, and committed as `openapi/openapi.json`. CI fails if the committed file
differs from what the code generates.

Code is organised in layers: routes → controllers → services → repositories, with shared
zod schemas in `schemas/`. Dependencies are passed in explicitly (`createApp(deps)`), so
tests can swap the database.

## Consequences

- The contract cannot silently drift: changing a schema changes the generated file, and CI
  asks for it to be committed.
- The web app pins its type generation to the committed file, so the repositories stay in
  sync without a shared package.
- Response bodies are documented but not validated at runtime; integration tests cover them.
