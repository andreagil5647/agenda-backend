# 0002. MongoDB Atlas free tier with the native driver

- Status: Accepted
- Date: 2026-09-25

## Context

The public demo must stay online at no cost for as long as the project exists.
Limits checked on 2026-09-25:

| Option           | Storage | Lifetime                                   | Other limits                                |
| ---------------- | ------- | ------------------------------------------ | ------------------------------------------- |
| Render Postgres  | 1 GB    | Expires 30 days after creation (+14 grace) | One per workspace, no backups               |
| Neon Postgres    | 0.5 GB  | No expiry                                  | 100 compute-hours/month, scales to zero     |
| MongoDB Atlas M0 | 512 MB  | No expiry; paused after 30 days idle       | 100 ops/s, 500 connections, no auto backups |

The data (users, calendars, events with embedded recurrence exceptions, tasks) is
per-user and document-shaped, and fits well within 512 MB.

## Options considered

- **Render Postgres**: same platform as the API, but the 30-day expiry breaks a permanent demo.
- **Neon Postgres**: permanent and relational; adds a SQL layer and migrations.
- **MongoDB Atlas M0**: permanent, fits the document shape of recurring events and their
  exceptions.
- For MongoDB access: **Mongoose** (schemas, middleware) or the **native driver** with
  zod at the edges.

## Decision

MongoDB Atlas M0, accessed through the official `mongodb` driver. zod validates what enters
the API; repositories map between documents and domain types.

## Consequences

- One source of truth for shapes (zod) instead of both zod and Mongoose schemas.
- Indexes are created explicitly at startup; there is no schema migration tool.
- Atlas pauses an M0 cluster after 30 days without connections. Scheduled reminder
  dispatch keeps it active.
- Render's outbound IPs are not fixed, so Atlas network access allows `0.0.0.0/0`. A
  dedicated database user with a long random password limits the exposure.
