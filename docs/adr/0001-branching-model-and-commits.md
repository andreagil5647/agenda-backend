# 0001. Branching model and commit conventions

- Status: Accepted
- Date: 2026-09-25

## Context

The API and the web app are separate repositories developed in small increments. Each
milestone should end in something deployed, and the history should explain how the code
got where it is.

## Options considered

- **Trunk-based**: least ceremony, but every merge to `main` deploys, so unfinished work
  needs feature flags.
- **GitHub Flow** (`main` + short branches): simple, same deployment concern.
- **Git Flow without release/hotfix branches**: `main` for releases, `develop` for
  integration, one branch per change.

## Decision

- `main` holds released code and deploys to Render.
- `develop` integrates finished work. All work branches start from it.
- Work happens on `feat/*`, `fix/*`, `chore/*` and `docs/*` branches, merged into `develop`
  through pull requests with a merge commit, so each branch's small commits stay readable.
- A release is a pull request from `develop` into `main`, tagged `vX.Y.Z`.
- Commit messages follow Conventional Commits, checked by commitlint locally (Husky) and on
  every pull request in CI.

## Consequences

- `main` only moves at milestone boundaries, which matches Render deploying from `main`.
- No staging environment: free Render services have no preview environments, so `develop`
  is validated by CI only.
- Merge commits make the graph busier than squash merges, in exchange for keeping each
  step of a feature visible.
