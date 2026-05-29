# Delivery audit — v1.7.1

## Purpose

This version consolidates the previously partial v1.6.3–v1.7.0 promises into a single auditable delivery. It does not change fitting physics, backend APIs, report schemas, or saved-model compatibility.

## Implemented changes

### 1. Model/parameter usability

- `frontend/src/model/parameterGrouping.ts`
  - Adds explicit placement groups: main path, junction core, parallel/leakage branches, modifiers.
  - Adds testable Law / Form / Placement metadata extraction.
  - Adds live filter counts and component diagnostic counts.
  - Adds component-only seed-from-fit helper.
- `frontend/src/components/ParameterTable.tsx`
  - Shows read-only Law / Form / Placement in each component header.
  - Shows near-bound and weak-identification counts per component.
  - Adds filter counts for all/free/fixed/near-bound/weak rows.
  - Adds component-level Seed from fit action.

### 2. External tester readiness

- `frontend/src/components/ExternalTesterChecklist.tsx`
  - Adds embedded tester roles: UI tester, research user, synthetic-data tester.
  - Adds live Data → Model → Fitting → Report step status.
- `frontend/src/pages/components/StartHerePage.tsx`
  - Embeds the external tester mode on the Start page.

### 3. Release readiness

- `frontend/src/services/releaseCheck.ts`
  - Adds `evaluateReleaseReadiness` for version consistency, release-text privacy scan, backend test record, frontend test/build record, manual browser check, and portable smoke recommendation.
- `frontend/src/components/ReleaseStatusPanel.tsx`
  - Displays a local release gate instead of only a GitHub release lookup.

### 4. Tests and documentation

- Added/updated frontend unit tests for parameter grouping, component-only seeding, and release readiness logic.
- Updated version files to 1.7.1.
- Updated `CHANGELOG.md`, `docs/TESTED_CURRENT.md`, `docs/VALIDATION_HISTORY.md`, and `docs/WEBUI_AGENT_HANDOFF.md`.

## Commands run

```bash
cd backend
python -m pytest -q
python -m compileall -q ivfitter
```

## Observed results

- Backend pytest passed: 122 tests.
- Backend compileall passed.

## Not verified in sandbox

Frontend validation was not completed because dependencies are not installed and the sandbox package mirror returned a 404 for `electron-to-chromium-1.5.371.tgz` during `npm install`.

Attempted commands:

```bash
cd frontend
npm run test -- --run --reporter=dot
# failed: vitest: not found

npm install
# failed: package mirror 404 for electron-to-chromium-1.5.371.tgz
```

## Required local validation before release

```bash
cd frontend
npm install
npm run test -- --run --reporter=dot
npm run build
```

Manual checks:

1. Parameter grouping and Law / Form / Placement labels.
2. Component-level Seed from fit.
3. External tester mode on Start page.
4. ReleaseStatusPanel local release gate.
5. Existing chart zoom/pan/reset behavior.
