# 0003. The tenth task sorted before the second

- Date found: 2026-10-08
- Area: tasks
- Fixed in: `fix: order tasks with fractional string keys`

## Symptom

Found while reviewing the task repository, before any user reported it. With ten or more
tasks, the list returned by `GET /tasks` put the tenth task right after the first:

```text
1.000000 10.000000 11.000000 12.000000 2.000000 3.000000 ...
```

## Reproduction

Create twelve tasks for one user and list them.

## Investigation

1. `order` is stored as a decimal string such as `"10.000000"` and the list query sorts on it
   in MongoDB, which compares strings character by character.
2. A one-line Node script that sorted the generated values showed the same wrong order, so
   the problem was the representation, not the query.
3. `create` also finds the "latest" task by sorting `order` descending. After nine tasks the
   latest is `"9.000000"`, so every new task was assigned `"10.000000"`: duplicates, not just
   misordering.
4. `move` computed a float midpoint of two decimal strings. That loses precision after about
   fifty consecutive insertions into the same gap, and nothing tested it.

## Root cause

A numeric order was stored as text but compared as text. The unit and integration tests only
created one or two tasks, and `PUT /tasks/:id/position` had no test at all.

## Fix

Order keys are now fractional-index strings (`src/domain/task-order/fractional-index.ts`):
base-62 digits in ASCII order, so string comparison matches the intended order, and a key can
always be created between two neighbours without rewriting any other task. See
[ADR 0008](../adr/0008-fractional-index-string-keys-for-task-order.md).

## Regression guard

- Unit tests in `src/domain/task-order/fractional-index.test.ts` (append and prepend runs,
  200 insertions into one gap, malformed keys).
- `test/integration/task-ordering.test.ts` creates twelve tasks, moves a task between two
  neighbours and to the top.

## Takeaway

Test lists past the first digit boundary (10, 100), and give every endpoint at least one
integration test when it is added.
