# 0006. Optimistic concurrency with version ETags

- Status: Accepted
- Date: 2026-09-28

## Context

Agenda resources are edited from an interactive timeline where the same calendar, event or task
can be open in more than one tab. Blind writes would let an older view overwrite a newer drag,
rename or soft-delete without warning. MongoDB does not provide row versions automatically, so
the API needs one consistent convention before the resource repositories are added.

## Options considered

- **Last write wins**: simplest implementation, but silently loses user edits.
- **`updatedAt` preconditions**: easy to expose, but timestamps are awkward HTTP validators and
  can be ambiguous at millisecond precision.
- **Integer `version` plus `If-Match`**: explicit, cheap to query with MongoDB and maps cleanly
  to HTTP conditional requests.

## Decision

Every mutable document has a positive integer `version`, starting at `1`. Repository updates add
the expected version to the MongoDB filter and increment `version` in the same atomic update.

HTTP responses expose the version as a strong ETag using the quoted decimal value, such as
`ETag: "3"`. Unsafe write endpoints that protect an existing resource parse `If-Match` with the
same format and reject weak, wildcard or multi-value headers. A write whose filter matches no
document because the version is stale returns a conflict.

Documents are also soft-deletable by convention: active queries add `deletedAt: null`, while
restore and delete operations increment `version` like any other mutation.

## Consequences

- Stale writes are detected without transactions for single-document updates.
- The frontend can store one simple ETag per resource and send it back through `If-Match`.
- API clients must re-read a resource after a conflict before retrying the change.
- Bulk reorder endpoints still need careful resource-specific design because they update several
  documents at once.

## Update, 2026-10-12: status codes and scope

The decision above left the status codes open. As implemented:

- `PATCH` and `DELETE` on a calendar, task or event, and `PUT /tasks/:id/position`, require
  `If-Match`. A route opts in with `conditional: true` in its definition, which both enforces the
  header and documents it in the OpenAPI contract.
- A missing header answers `428 Precondition Required`, a stale version `412 Precondition Failed`
  with `details.reason: "stale_version"`, and a malformed header `400`. `409 Conflict` stays for
  conflicts that are not about versions, such as a duplicate email.
- A resource that does not exist, or belongs to another user, answers `404` whatever version is
  sent, so the precondition cannot be used to probe for other users' ids.
- `PUT /calendars/order` and `PATCH /me/settings` are not conditional. The first replaces the
  whole order in one request and the second changes independent fields, so last write wins is
  the intended behaviour for both.
