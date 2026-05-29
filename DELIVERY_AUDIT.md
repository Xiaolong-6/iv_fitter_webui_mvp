# Delivery audit — v1.7.3

## Purpose

This version removes development, release, and diagnostic controls that were useful during internal iteration but are not appropriate in the normal user-facing UI. It keeps fitting physics, backend APIs, report schemas, saved-model compatibility, and the v1.7.2 dependency hotfix unchanged.

## Implemented changes

### 1. Main user shell cleanup

- Removed `Check newest version` from the dock/footer area.
- Removed the Start page `External tester mode` panel.
- Removed the user-facing `Local release gate` / `Show release gate details` UI.
- Kept external-testing and release-privacy content in documentation/internal helpers instead of the main UI.

### 2. Parameter table cleanup

Removed these user-facing controls from the Fitting page parameter table:

- Restore
- Apply bounds
- Seed synthetic
- Show / All parameters filter
- Near bound / Weak diagnostic count strip
- Review parameter diagnostics prompt
- Component-level Seed from fit action

The parameter table now keeps the core user workflow: read parameters, edit initial values/bounds, inspect fitted values, and toggle Fit/Fixed.

### 3. Fitting action cleanup

- Report is no longer in the Run/Stop action row.
- Report now appears under the fit check/status summary.
- Report button tone follows the check state: OK, warning, error, or idle/disabled.
- Removed the bottom/mobile duplicate Run fit / Stop fit action bar.

### 4. Redundancy cleanup

- Removed dead CSS for removed parameter-filter and parameter-diagnostic controls.
- Removed the now-unused data-bounds and synthetic-seeding UI path from the Fitting page wiring.
- Removed obsolete global parameter-filter helpers/tests and synthetic-ground-truth seeding helpers from active frontend source.
- Removed obsolete documentation language that referenced Restore / synthetic seed / apply data bounds in the normal parameter-table workflow.

## Commands run

```bash
cd backend
python -m pytest -q
python -m compileall -q ivfitter
```

## Observed results

- Backend pytest passed: 122 tests.
- Backend compileall passed.
- Static string scan confirmed the requested removed UI labels are absent from the relevant user-facing UI files.
- Static redundancy scan confirmed `parameter-filter-bar`, `parameter-diagnostic-strip`, `ExternalTesterChecklist`, `external-tester`, `tester-step`, `release-readiness`, and `evaluateReleaseReadiness` are absent from `frontend/src`.

## Not verified in sandbox

Frontend validation was not completed because this sandbox does not have frontend dependencies installed and dependency installation is environment-dependent.

Required local validation:

```powershell
cd frontend
npm install --include=dev
npm run test -- --run --reporter=dot
npm run build
```

## Suggested commit

```text
fix(ui): remove internal controls from user workflow
```

Body:

```text
- Remove user-facing Check newest version, External tester mode, and Local release gate UI.
- Remove internal Parameter table controls: Restore, Apply bounds, Seed synthetic, global filters, near-bound/weak strip, and review-diagnostics prompt.
- Move Report under the fit check/status summary and color it by check state.
- Remove duplicate bottom/mobile Run fit and Stop fit controls.
- Remove dead CSS and obsolete documentation references for the removed controls.
- Keep fitting physics, backend APIs, saved-model compatibility, report schemas, and dependency hotfixes unchanged.

Backend pytest passed: 122 tests.
Backend compileall passed.
Frontend npm validation remains local-only.
```
