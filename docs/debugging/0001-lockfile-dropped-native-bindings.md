# 0001. Lockfile dropped native bindings, Vitest could not start

- Date found: 2026-09-25
- Area: tooling
- Fixed in: `build: regenerate lockfile with all platform bindings`

## Symptom

The first `npx vitest run` failed before collecting any test:

```text
Error: Cannot find native binding. npm has a bug related to optional dependencies
(https://github.com/npm/cli/issues/4828).
  cause: Error: Cannot find module '@rolldown/binding-wasm32-wasi'
```

## Reproduction

With npm 11.5.2 on Windows: add packages one by one with `npm install <pkg>` (TypeScript,
then ESLint, then Vitest), then run Vitest.

## Investigation

1. The message pointed at a missing optional dependency. `node_modules/@rolldown` held only
   `pluginutils`; no `binding-win32-x64-msvc` for this platform.
2. `npm ls rolldown` showed the chain `vitest → vite → rolldown`, so the binding is an
   optional dependency of rolldown, which Vitest 5 uses through Vite.
3. In `package-lock.json`, rolldown's entry listed its `optionalDependencies`
   (`@rolldown/binding-linux-x64-gnu`, `@rolldown/binding-win32-x64-msvc`, …) but there was
   **no** `node_modules/@rolldown/binding-*` package entry. Counting them gave 0. With no
   entry, npm had nothing to install.
4. After deleting `node_modules` and `package-lock.json` and running `npm install` once, the
   lockfile had 15 binding entries and the Windows binding was installed. Vitest started.
5. Later, `npm install express pino …` (incremental again) brought the count back to 0.
   So the problem was not a one-off corrupted install: incremental installs on this npm
   version keep dropping the entries.

## Root cause

npm/cli#4828: when an existing lockfile is updated, npm can prune platform-specific
optional dependencies that do not match the current machine, and then omits them for every
platform. The lockfile is committed, so the damage would reach CI: `npm ci` on Linux would
also skip `@rolldown/binding-linux-x64-gnu` and Vitest would fail there too.

## Fix

Regenerate the lockfile from scratch (`rm -rf node_modules package-lock.json && npm install`)
after dependency changes, and commit that version.

## Regression guard

CI runs `npm ci` and the test suite on Linux, so a lockfile without the Linux binding fails
the build immediately. Locally, `grep -c '"node_modules/@rolldown/binding-' package-lock.json`
should print a number greater than zero.

## Takeaway

Treat the lockfile as code: when a tool fails at startup with a native-module error, check
what the lockfile actually records before reinstalling blindly.
