# Tested current — v1.7.3

Validated after user-facing UI declutter, fitting-action cleanup, and redundancy cleanup.

## Scope

- Removed the workflow-sidebar dock/footer `Check newest version` link.
- Removed the Start page `External tester mode` panel and deleted the now-unused `ExternalTesterChecklist` component and associated CSS.
- Removed the user-facing `Local release gate` / `Show release gate details` section from the Updates panel.
- Removed internal/debug-style Parameter table controls from the user UI: Restore, Apply bounds, Seed synthetic, global parameter filters, near-bound/weak count strip, and review-diagnostics prompt.
- Moved the Report action out of the Run/Stop action row and placed it under the fit check/status summary; the button color follows the current check state.
- Removed the Fitting page mobile/bottom Run fit / Stop fit action bar so fitting controls appear in one primary location.
- Removed unused release-readiness gate UI helpers/tests from frontend code after the gate was removed from user UI.
- Removed dead CSS for removed parameter filter/diagnostic controls.
- Kept the read-only GitHub release lookup in the Updates panel.
- Kept external testing documentation and release privacy scanner support outside the main user workflow.
- Kept fitting physics, backend APIs, saved-model compatibility, report schemas, and npm registry/lockfile hotfixes unchanged.

## Commands run in this environment

```bash
cd backend
python -m pytest -q
python -m compileall -q ivfitter
```

## Observed result

- Backend pytest: passed, 122 tests.
- Backend compileall: passed.
- Static UI-string scan: the removed user-facing strings are absent from the relevant Fitting/Parameter/Start/Sidebar/Updates UI components.
- Static redundancy scan: `ExternalTesterChecklist`, `external-tester`, `tester-step`, `release-readiness`, `evaluateReleaseReadiness`, `parameter-filter-bar`, `parameter-diagnostic-strip`, global parameter-filter helpers, and synthetic-ground-truth seeding helpers are absent from active frontend source.
- Version metadata: root package, frontend package, package locks, backend `pyproject.toml`, and backend `__version__` are all `1.7.3`.

## Not verified in this environment

- Frontend `npm install`, Vitest, and production build remain unverified in this sandbox because npm access is environment-dependent.
- Full release packaging (`release_build.ps1`, `build_portable_windows.ps1`).
- Portable smoke test.
- Manual browser checks.

## Required local frontend validation

```powershell
cd frontend
npm install --include=dev
npm run test -- --run --reporter=dot
npm run build
```

## Manual checks required

1. Sidebar footer should show language, zoom, and version only; no `Check newest version` link.
2. Start page should show the normal welcome/workflow cards only; no `External tester mode` panel.
3. Help/Updates panel should not show `Local release gate`, blocker counts, or `Show release gate details`.
4. Parameter table should not show Restore / Apply bounds / Seed synthetic / Show / All parameters / Near bound / Weak / Review parameter diagnostics controls.
5. Report button should appear below the fit check/status summary and change tone with the fit check state.
6. Fitting page bottom/mobile Run fit / Stop fit action bar should be absent.
7. Existing Data, Model, Fitting, Report, and Help workflows should remain usable.
