# Debugging notes

Write-ups of bugs found while building the API: what was observed, how it was narrowed
down, the root cause, the fix, and the test that now guards against it. Only real bugs
are recorded here.

| #    | Bug                                                                                                               | Area    |
| ---- | ----------------------------------------------------------------------------------------------------------------- | ------- |
| 0001 | [Lockfile dropped native bindings, Vitest could not start](0001-lockfile-dropped-native-bindings.md)              | Tooling |
| 0002 | [Invalid CORS origin crashed config loading instead of failing validation](0002-zod-refine-after-failed-check.md) | Config  |
| 0003 | [The tenth task sorted before the second](0003-task-order-sorted-as-text.md)                                      | Tasks   |
| 0004 | [An all-day event showed up on the day after its own](0004-all-day-event-on-the-wrong-day.md)                     | Events  |

New notes copy [the template](template.md).
