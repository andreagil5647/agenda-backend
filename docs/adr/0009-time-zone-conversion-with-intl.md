# 0009. Time zone conversion with `Intl`, until recurrence needs more

- Status: Accepted
- Date: 2026-10-12

## Context

Two features need to move between an instant and a wall clock in an IANA time zone:

- `GET /events` has to know which calendar dates an instant range covers for the account, to
  match all-day events (see [debugging note 0004](../debugging/0004-all-day-event-on-the-wrong-day.md)).
- The demo account is seeded with a day described as wall-clock times ("stand-up at 09:00"),
  which have to become instants in the visitor's zone.

That is two conversions: instant to local date, and local date and time to instant. The second
is the awkward one, because the UTC offset depends on the instant being looked for.

## Options considered

- **`Temporal` through a polyfill**: the right model (`ZonedDateTime`, explicit disambiguation
  around daylight saving changes), and what the recurrence engine will need. A sizeable
  dependency to add for two functions.
- **A date library with time zone support** (Luxon, date-fns-tz): well tested, but a second
  date model to learn and later replace when `Temporal` arrives.
- **`Intl.DateTimeFormat` directly**: no dependency, uses the runtime's own time zone database.
  Formatting an instant in a zone gives its wall clock; the reverse is found by guessing an
  offset and correcting once.

## Decision

Use `Intl.DateTimeFormat` behind two small modules in `src/domain/time`: `local-date.ts` for
instant to date, and `zoned-time.ts` for date and time to instant. Both are pure and unit-tested
with zones on both sides of UTC, half-hour and 45-minute offsets, and both daylight saving
changes, including a wall time that does not exist.

Nothing outside `src/domain/time` formats or parses a zone. When the recurrence engine is built
(roadmap item 8) it will bring `Temporal`, and these two modules become thin wrappers over it or
are removed.

## Consequences

- No new dependency, and the zone data is whatever Node ships, updated with the runtime.
- A wall time skipped by a spring-forward change resolves to the time after the gap, and a time
  repeated by an autumn change resolves to one of its two instants without a way to choose.
  Good enough for seeding and date ranges; not for recurring events, which is why this decision
  stops at recurrence.
- The web app needs the same two conversions for its time grid and makes the same choice, so
  both sides agree on what a local day is.
