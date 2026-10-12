# 0005. Toolchain: TypeScript 6, ESM, Express 5, Vitest

- Status: Accepted
- Date: 2026-09-25

## Context

Starting from an empty repository in September 2026, with versions checked on npm that day.

## Decision

- **TypeScript 6.0**, not 7.0. TypeScript 7 is the native (Go) compiler; typescript-eslint
  8.70 supports `typescript <6.1`, and type-aware linting is worth more here than faster
  compiles. Revisit when typescript-eslint supports 7.
- **ES modules** (`"type": "module"`, `NodeNext` resolution). Imports use `.js` extensions.
- **Express 5**: rejected promises from async handlers reach the error handler without a
  wrapper, and it is the maintained major.
- **Vitest** for tests: native TypeScript and ESM support without a separate transform
  configuration. Two projects: `unit` (no I/O) and `integration`.
- **mongodb-memory-server** for integration tests: a real `mongod` (single-node replica set,
  so transactions behave as on Atlas) without requiring Docker locally or in CI.
- **pino** for logs: JSON output that the hosting log viewer can parse, with redaction.
- **Node 22** (`.node-version`), the version used locally and on Render.

## Consequences

- `npm install` on npm 11.5 can drop platform-specific optional dependencies from the
  lockfile (see [debugging note 0001](../debugging/0001-lockfile-dropped-native-bindings.md)).
  After adding dependencies, check that `@rolldown/binding-*` entries remain in
  `package-lock.json`.
- The first integration run downloads a `mongod` binary; CI caches it.
