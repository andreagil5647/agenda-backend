# Contributing

## Branches

| Branch    | Purpose                                                 |
| --------- | ------------------------------------------------------- |
| `main`    | Released code. Every merge deploys to Render.           |
| `develop` | Integration branch. Feature branches start and end here |
| `feat/*`  | New behaviour, e.g. `feat/auth-sessions`                |
| `fix/*`   | Bug fixes                                               |
| `chore/*` | Tooling, dependencies, configuration                    |
| `docs/*`  | Documentation only                                      |

1. Branch from `develop`: `git switch -c feat/<topic> develop`.
2. Keep commits small and focused. Each commit should build and pass its tests.
3. Open a pull request into `develop`. CI must pass.
4. Merge with a merge commit (no squash) so the individual commits stay in history.
5. A release is a pull request from `develop` into `main`, tagged `vX.Y.Z`.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/), checked by commitlint:

```text
feat: add recurring event expansion
fix: keep all-day events on their date across time zones
test: cover DST transitions in reminder scheduling
```

Types in use: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `build`, `ci`, `perf`.

## Before opening a pull request

```bash
npm run lint && npm run typecheck && npm test
npm run openapi:check    # regenerate with openapi:generate if routes changed
```

## Bugs worth writing up

If a bug took real investigation, add a note under [docs/debugging](docs/debugging/README.md)
using the template, and link the regression test.
