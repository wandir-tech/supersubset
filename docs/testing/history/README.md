# Testing History

QA audit logs ordered by date. Each file records what was tested, bugs found, bugs fixed, and remaining gaps — so future agents can pick up where the last round left off.

Naming convention: dated history entries use `YYYY-MM-DD-slug.md` so directory order matches chronology.

| File                                                                                                   | Date       | Scope                                                                                                                                |
| ------------------------------------------------------------------------------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| [2026-04-11-qa-pre-audit.md](2026-04-11-qa-pre-audit.md)                                               | 2026-04-11 | Initial 31-bug sweep across all packages                                                                                             |
| [2026-04-16-qa-round-1.md](2026-04-16-qa-round-1.md)                                                   | 2026-04-16 | Chart rendering, example apps, QA skill creation                                                                                     |
| [2026-04-16-qa-round-2.md](2026-04-16-qa-round-2.md)                                                   | 2026-04-16 | Lint, a11y, undo/redo, edge cases, performance                                                                                       |
| [2026-05-02-qa-round-3-market-readiness.md](2026-05-02-qa-round-3-market-readiness.md)                 | 2026-05-02 | Market-readiness campaign plan, blocker hunt, and parallel PR dispatch model                                                         |
| [2026-05-10-qa-nextjs-workbench-post-merge.md](2026-05-10-qa-nextjs-workbench-post-merge.md)           | 2026-05-10 | Post-merge host and dev-app workflow QA, synced-baseline validation, stale-build recovery notes, and deeper backend-probe coverage   |
| [2026-05-11-qa-backend-probe-followup.md](2026-05-11-qa-backend-probe-followup.md)                     | 2026-05-11 | Synced-develop backend-probe follow-up, preview fallback coverage, and merged-branch validation                                      |
| [2026-05-11-qa-backend-probe-session-followup.md](2026-05-11-qa-backend-probe-session-followup.md)     | 2026-05-11 | Synced-develop backend-probe session follow-up, sessionStorage reload coverage, and merged-branch validation                         |
| [2026-05-11-qa-backend-probe-reconnect-followup.md](2026-05-11-qa-backend-probe-reconnect-followup.md) | 2026-05-11 | Synced-develop backend-probe reconnect follow-up, in-memory form-state coverage, and merged-branch validation                        |
| [2026-05-11-qa-real-backend-probe-cors-followup.md](2026-05-11-qa-real-backend-probe-cors-followup.md) | 2026-05-11 | First live backend-probe round against the Next.js workbench host, discovered cross-origin CORS breakage, and validated the fix      |
| [2026-05-11-qa-fresh-consumer-install-smoke.md](2026-05-11-qa-fresh-consumer-install-smoke.md)         | 2026-05-11 | Fresh consumer-host install smoke using packed local artifacts, surfaced an ECharts cleanup warning, and validated the lifecycle fix |
