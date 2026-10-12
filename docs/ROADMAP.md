# Roadmap

Ordered backlog for the backend's domain layer. The foundation (config, logging, errors,
health checks, the OpenAPI pipeline, CI, Render deploy) is done - this tracks what comes
next. Each item is meant to be one `feat/*` branch, ending in passing tests, an updated
`openapi/openapi.json`, and an ADR if it involved a real decision (see
[docs/adr](adr/README.md)).

The web app ([andreagil5647/agenda](https://github.com/andreagil5647/agenda)) has a
parallel roadmap; items here are ordered so each one unblocks real frontend work as soon
as it lands, rather than building the whole API before any UI can use it.

## Status

Done:

- [x] Config, logging, error handling, health checks (`/api/v1/health`, `/health/ready`)
- [x] Code-first OpenAPI 3.1 contract, committed and drift-checked in CI
- [x] MongoDB connection, CI, Render blueprint
- [x] Same-origin `/api/*` architecture - see
      [ADR 0003](adr/0003-same-origin-api-through-render-rewrite.md)
- [x] 1. Repository base pattern
- [x] 2. Auth (register, login, logout, session, CSRF) - [ADR 0007](adr/0007-cookie-sessions-and-csrf.md)
- [x] 3. Demo account (`POST /auth/demo`, seeded relative to now)
- [x] 4. Me (settings, account deletion)
- [x] 5. Calendars CRUD and ordering
- [x] 6. Tasks CRUD, soft delete, restore, position - fractional keys with unit tests after
      [debugging note 0003](debugging/0003-task-order-sorted-as-text.md)
- [x] 7. Events, non-recurring (timed and all-day, task link, range query)

Known gaps in the done items, to close before the next feature:

- [x] `If-Match` is required on updates, deletes and task moves: `412` on a stale version,
      `428` when missing ([ADR 0006](adr/0006-optimistic-concurrency-with-version-etags.md))
- [x] `PATCH /events/:id` validates the merged event: end after start, fields matching the
      event kind
- [x] All-day events are matched against the account's local dates
      ([debugging note 0004](debugging/0004-all-day-event-on-the-wrong-day.md))
- [ ] Demo-user cap and `scripts/seed-demo.ts` (item 3 asked for both)
- [ ] Integration tests for calendar reorder, calendar/event deletion and account deletion
- [x] One slice per resource (`me`, `calendars`, `tasks`, `events`, `demo`): routes,
      controller, service, schemas and a view mapper each, instead of four bundled planner
      files; demo seeding lives in `src/services/demo.service.ts`

Remaining, in order: items 8-13 below. The "frontend first" order still holds: the web app
needs a time grid with drag-and-drop (task onto grid creates a linked event) before the
recurrence work pays off visibly, so item 8 starts once that lands.

## Domain model (recap)

| Entity             | Notes                                                                                                                                                                                                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `User`             | email, argon2id password hash, display name, settings (tz, week start, 12/24h, locale, theme, accent), `isDemo`, `expiresAt?`                                                                                                                                                                          |
| `Session`          | hashed opaque token, `userId`, TTL index on `expiresAt`                                                                                                                                                                                                                                                |
| `Calendar`         | name, `colorKey` (palette key, not a hex), visibility, default reminders, order                                                                                                                                                                                                                        |
| `Event`            | timed (`startUtc`/`endUtc` + IANA `timeZone`) or all-day (`startDate`/`endDate` as plain dates, no zone); optional `rule` (structured RRULE subset); `exceptions[]` embedded (`originalStart`, `cancelled?`, `override?`); `taskId?` links a time block back to its task; soft-deleted via `deletedAt` |
| `Task`             | title, due date, priority, status, `estimateMinutes` (default block length when dropped on the grid), fractional-index `order`, soft-deleted                                                                                                                                                           |
| `ReminderJob`      | materialised per occurrence for a rolling 48h window; `fireAt`, `status`, TTL cleanup                                                                                                                                                                                                                  |
| `PushSubscription` | Web Push endpoint + keys                                                                                                                                                                                                                                                                               |

Recurrence expands **server-side only** (`GET /events` returns concrete instances); the
client never runs RRULE logic. Scoped edits ("this / this and following / all") split or
patch the master document - see the build order below for where this lands.

## API surface (target)

| Resource  | Endpoints                                                                                                                                                                                  |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Auth      | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `POST /auth/demo`, `GET /auth/session`                                                                                     |
| Me        | `GET /me`, `PATCH /me/settings`, `DELETE /me`                                                                                                                                              |
| Calendars | `GET/POST /calendars`, `PATCH/DELETE /calendars/:id`, `PUT /calendars/order`                                                                                                               |
| Events    | `GET /events?from&to&calendarIds`, `POST /events`, `GET/PATCH/DELETE /events/:id`, `PATCH/DELETE /events/:id/occurrences/:originalStart?scope=this\|following`, `POST /events/:id/restore` |
| Tasks     | `GET /tasks?status&due`, `POST /tasks`, `PATCH/DELETE /tasks/:id`, `POST /tasks/:id/restore`, `PUT /tasks/:id/position`                                                                    |
| Reminders | `GET /reminders/upcoming?until=`                                                                                                                                                           |
| Push      | `GET /push/vapid-public-key`, `POST /push/subscriptions`, `DELETE /push/subscriptions/:id`                                                                                                 |
| Internal  | `POST /internal/reminders/dispatch` (secret header, excluded from public docs)                                                                                                             |

## Build order

Each item lists its rough scope and what "done" means. Testing expectations apply
throughout: unit tests for anything in `domain/`, integration tests (Supertest + the real
`mongod`) for every route, and coverage stays at the levels set in
[ADR 0004 of the original plan](adr/0004-layers-and-code-first-openapi.md)-adjacent
work - practically, `domain/` code should sit at 90%+ branch coverage given how much of
the product's correctness lives there.

1. **Repository base pattern.** A small shared helper for the repository layer
   (`routes → controllers → services → repositories`) - id handling, soft-delete
   filtering, optimistic-concurrency (`version` field, `If-Match`) helpers used by every
   resource below. No public endpoint yet; unit-tested in isolation.
2. **Auth.** `users` collection + indexes, argon2id hashing, opaque session tokens
   (hashed at rest, `HttpOnly; Secure; SameSite=Lax` cookie, TTL), CSRF double-submit
   token on unsafe methods, origin/`Sec-Fetch-Site` check. Endpoints: register, login,
   logout, session. Integration tests cover cookie attributes, CSRF rejection, and
   session expiry.
3. **Demo account.** `POST /auth/demo` creates an ephemeral user (`isDemo: true`,
   `expiresAt` ~24h, TTL index) seeded with realistic data relative to _now_. Rate-limited
   and capped on active demo users. A `scripts/seed-demo.ts` factors out the seeding logic
   so it can also run locally.
4. **Me.** Settings read/update, account deletion (cascades to the user's own documents).
5. **Calendars.** CRUD, visibility toggle, default reminders, `PUT /calendars/order`.
   Straightforward CRUD - a good place to firm up the repository base pattern from step 1
   against a real resource before events (the hard one) needs it.
6. **Tasks.** CRUD, soft delete + restore, completion, fractional-index `PUT
/tasks/:id/position` (unit-test the fractional-index math directly: insert between two
   existing orders, insert at either end, rebalance when precision runs out).
7. **Events, non-recurring.** CRUD for one-off timed and all-day events, calendar
   association, `taskId` linking (dragging a task onto the grid creates a linked event).
   `GET /events?from&to` range query. No recurrence yet - `rule` is always absent at this
   point.
8. **Recurrence engine** (`src/domain/recurrence/`, framework-free). RRULE subset
   (`FREQ`, `INTERVAL`, `BYDAY` with ordinals, `BYMONTHDAY`, `COUNT`/`UNTIL`), expansion
   over `Temporal.ZonedDateTime` with explicit DST disambiguation, exceptions, and the
   "this and following" split (old master's `UNTIL` set to the previous instance, a new
   master created from this instance forward). This is the highest-value, highest-risk
   piece to get well tested: table tests per fixture zone (`Europe/Madrid`,
   `America/Sao_Paulo`, `Australia/Lord_Howe` for the 30-minute DST case), property tests,
   and a differential check against `rrule` (dev-only oracle, UTC-safe cases only).
9. **Events, recurring.** Wire the engine into `GET /events` (expand instances in range)
   and add the occurrence-scoped `PATCH`/`DELETE` endpoints (`scope=this|following|all`
   on the plain `PATCH`/`DELETE`). Integration tests cover each scope against a real
   series, plus the DST fixture zones end to end through the HTTP layer.
10. **Reminders.** `ReminderJob` materialisation for a rolling 48h window, recomputed on
    event writes; `GET /reminders/upcoming` for the client-side scheduler.
11. **Push.** VAPID key generation/config, subscription CRUD, `web-push` integration.
12. **Reminder dispatch.** `POST /internal/reminders/dispatch` (secret header), idempotent
    claim of due jobs (`findOneAndUpdate` on `status: 'pending'`), Web Push send. Wire an
    external scheduler (cron-job.org, see the original plan's reminder-architecture
    reasoning) once this is deployed.
13. **Hardening pass.** Per-route rate-limit tuning, response-shape checks against the
    OpenAPI document, demo-account TTL cleanup verified end to end, and a look at overall
    coverage before calling the backend "MVP-complete".

## Definition of done, per item

- Unit tests for domain logic, integration tests for the HTTP surface.
- `npm run openapi:generate` run and the diff committed.
- `npm run lint && npm run typecheck && npm test && npm run build` all pass.
- An ADR if the item involved a real trade-off (auth mechanics, recurrence storage,
  fractional-index scheme, ...). Not every item needs one - CRUD for calendars probably
  doesn't.
- A debugging note only for a bug that actually happened, not a pre-emptive one.
- Small commits, conventional-commit messages, branch from `develop`.
