# 0005. Completing a task reset its estimate and priority

- Date found: 2026-10-12
- Area: tasks, calendars
- Fixed in: `fix: stop partial updates resetting fields to their defaults`

## Symptom

In the web app, ticking "Draft launch checklist" as done changed its estimate from 90 to 30
minutes. No error: the request returned `200` and the task it returned already had the wrong
estimate.

## Reproduction

```text
POST  /api/v1/tasks      { "title": "Draft", "priority": "high", "estimateMinutes": 90 }
PATCH /api/v1/tasks/:id  { "status": "done" }
→ 200 { "status": "done", "priority": "none", "estimateMinutes": 30, … }
```

The same happened to calendars: renaming one reset its colour to blue, made it visible and
cleared its default reminders.

## Investigation

1. The web app sent only `{ "status": "done" }`, checked in the browser's network panel, so the
   other fields were not coming from the client.
2. The values the task ended up with, `none` and `30`, are the defaults for a new task. That
   pointed at validation, not at the repository: `versionedUpdate` only `$set`s the keys it is
   given.
3. `patchTaskRequestSchema` was `createTaskRequestSchema.partial()`. Parsing
   `{ "status": "done" }` with it returned
   `{ status: 'done', priority: 'none', estimateMinutes: 30 }`.

## Root cause

`.partial()` makes every key optional, but it does not remove a `.default()`. For zod an absent
key with a default is not absent: it is the default. So the patch schema turned "not sent" into
"set to the default", and the repository wrote those values over the stored ones. A patch
without `status` would equally have set a completed task back to `todo`.

The existing test changed one field and asserted on that field only, so nothing compared the
rest of the document before and after.

## Fix

Each resource declares its settable fields once, without defaults. The create schema adds the
defaults; the patch schema is `z.object(fields).partial()`, where an absent key stays absent.
Events and settings never had defaults and were not affected.

## Regression guard

[`test/integration/partial-updates.test.ts`](../../test/integration/partial-updates.test.ts)
creates a task and a calendar with no field at its default, patches one field, and asserts on
all the others. It also sends an empty patch.

## Takeaway

A test of an update should assert on what must not change. And a schema shared between create
and update is a place to look twice: the two mean different things by "missing".
