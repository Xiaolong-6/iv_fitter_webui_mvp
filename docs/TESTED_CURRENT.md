# Tested current package — v1.4.8

Scope: documentation cleanup and consolidation only.

## What changed

- Removed stale root-level handoff files.
- Removed old per-version `docs/TESTED_*` files after consolidating their purpose into `docs/VALIDATION_HISTORY.md`.
- Added `docs/DOCUMENTATION_INDEX.md` as the stable documentation entry point.
- Rewrote `docs/WEBUI_AGENT_HANDOFF.md` as a current-status handoff instead of a running incident log.
- Updated README and changelog to point to the consolidated documentation structure.

## Commands run

```powershell
npm install
npm run build
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
```

## Results

- `npm install`: passed
- `npm run build`: passed
- `PYTHONPATH=backend python -m pytest backend/tests -q`: passed
- `python -m compileall -q backend/ivfitter backend/tests`: passed

## Manual browser check

1. Open the app and confirm the footer/version shows v1.4.8.
2. Open **User manual → Function Guide** and confirm user-facing content is still present.
3. Confirm documentation cleanup did not change app behavior: import a trace, run a fit, and verify the result panel still updates.
