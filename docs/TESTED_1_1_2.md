# Tested in 1.1.2

## Scope

Version 1.1.2 adds left-panel user-facing tabs, a persistent sidebar version label, and a frontend numerical sanity fallback for exploded fits.

## Checks run on the packaged tree

- Backend tests: `PYTHONPATH=backend python -m pytest backend/tests -q`
- Backend compile check: `python -m compileall -q backend/ivfitter backend/tests`
- Frontend build: `npm install` and `npm run build` if Node/npm access is available in the handoff environment.
- Package hygiene: generated caches removed before zipping.

## Manual UI checks required after applying locally

1. Run `03_test_backend.bat`.
2. Run `04_run_dev.bat`.
3. Open the app in the browser.
4. Confirm the left panel shows Workspace, User guide, Function guide, and Fitting logic tabs.
5. Confirm the lower-left sidebar version reads `v1.1.2`.
6. Run the current synthetic trace fit.
7. Confirm an exploded result is shown as `failed quality gate`, not green completed.
8. Confirm the Function guide content loads from the backend registry.
9. Confirm README, changelog, sidebar version, and backend/frontend version strings are consistent.

## Known limitation

The default synthetic trace/model can still produce an intentionally bad or unstable fit. This version prevents such output from being presented as a clean success. The next recommended step remains safe demo presets and better default model/range selection.
