# 0004. An all-day event showed up on the day after its own

- Date found: 2026-10-12
- Area: events
- Fixed in: `fix: match all-day events against the user's local dates`

## Symptom

A fresh demo account is seeded with an all-day event for today, "Keep evening free". The
web app's day view for today listed the timed "Focus block" but not the all-day event. No
error anywhere: the request returned `200` with one event instead of two.

## Reproduction

With an account whose time zone is `Europe/Madrid` (UTC+2 in October), create an all-day
event with `startDate: 2026-10-12`, `endDate: 2026-10-13`, then ask for that local day:

```text
GET /api/v1/events?from=2026-10-11T22:00:00.000Z&to=2026-10-12T22:00:00.000Z
```

The event is missing. Asking for the next local day (`from=2026-10-12T22:00:00.000Z`)
returns it, a day late.

## Investigation

1. Ruled out the web app first. Calling the endpoint from the browser console with the same
   `from` and `to` also returned one event, so the list was already wrong on the wire.
2. Ruled out the seed. A five-day range returned both events, so the document existed and
   belonged to the user.
3. That left the range filter in `EventsRepository.listByRange`. Timed events compare
   instants, which was correct. All-day events were compared against
   `range.from.toISOString().slice(0, 10)` and the same for `to`: the **UTC** date of each
   bound.
4. For the request above those are `2026-10-11` and `2026-10-12`, and the filter was
   `startDate < '2026-10-12' && endDate > '2026-10-11'`. The event starts on `2026-10-12`,
   so the first half is false.

## Root cause

An all-day event has no time zone: it is "the 12th" wherever the user is. The range in the
query is two instants. Turning an instant into a calendar date needs a time zone, and the
code silently used UTC. East of UTC a local day starts on the previous UTC date, so the
whole comparison was shifted by one day. In UTC, where the existing integration test ran,
local and UTC dates are the same and nothing looked wrong.

## Fix

`src/domain/time/local-date.ts` converts the instant range into the first and last calendar
dates it covers in a given time zone, and the events service passes the account's
`settings.timeZone`. The repository compares all-day events against those dates. The time
zone is now validated when it is written, in settings and on events, so the conversion
cannot fail on a value that is not an IANA zone.

Sending the time zone as a query parameter was the alternative. The account setting already
defines what a day is for that user, so using it keeps the endpoint unchanged and keeps two
clients of the same account consistent.

## Regression guard

- [`src/domain/time/local-date.test.ts`](../../src/domain/time/local-date.test.ts): dates
  east and west of UTC, across a daylight saving change, and at a half-hour offset.
- [`test/integration/events-range.test.ts`](../../test/integration/events-range.test.ts):
  a Madrid account gets its all-day event on its own local day, and not on the day before
  or after.

## Takeaway

A test that only runs in UTC cannot see a time zone bug. Date and range tests need at least
one zone on each side of UTC.
