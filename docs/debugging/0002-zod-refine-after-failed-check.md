# 0002. Invalid CORS origin crashed config loading instead of failing validation

- Date found: 2026-09-25
- Area: configuration
- Fixed in: `feat: load and validate environment configuration` (caught by the test before
  the commit)

## Symptom

The test `rejects a CORS origin with a wildcard` failed. `loadConfig` threw, but not the
expected `ConfigError`:

```text
threw Invalid URL
```

A bad `CORS_ORIGINS=*` in production would have crashed startup with a bare `TypeError`
instead of the friendly list of invalid variables.

## Reproduction

```ts
loadConfig({ MONGODB_URI: 'mongodb://x', CORS_ORIGINS: '*' });
```

## Investigation

1. The other invalid-origin cases (path, trailing slash, `ftp:`) passed, so the schema was
   rejecting them correctly. Only the wildcard, the one value that is not a URL at all,
   behaved differently.
2. The schema was `z.url(...).refine((value) => new URL(value).origin === value)`. Running
   `loadConfig` directly showed the error came from `new URL('*')`, i.e. from inside the
   refinement.
3. So the refinement ran even though `z.url()` had already reported the value as invalid.

## Root cause

In zod 4, checks and refinements on the same schema all run and collect their issues; a
failed format check does not stop later refinements unless they are marked to abort. The
refinement assumed its input was a valid URL, and `new URL('*')` threw a `TypeError`,
which escaped `safeParse` as an exception instead of becoming a validation issue.

## Fix

The refinement guards itself with `URL.canParse(value)` before constructing a `URL`, and a
comment next to the schema explains why.

## Regression guard

[`src/config/env.test.ts`](../../src/config/env.test.ts): the table test
`rejects a CORS origin with %s` includes the wildcard case and asserts a `ConfigError`.

## Takeaway

A zod refinement must be total: it receives whatever the base type accepts, not what the
earlier checks approved.
