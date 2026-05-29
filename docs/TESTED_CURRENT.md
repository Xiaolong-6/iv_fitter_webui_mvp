# Tested current — v1.7.2

Validated after frontend dependency install hotfix.

## Scope

- Removed internal sandbox mirror tarball URLs from root and frontend lockfiles.
- Replaced the stale frontend lockfile `electron-to-chromium-1.5.371.tgz` resolved URL with the public npm registry tarball for `electron-to-chromium-1.5.361`, matching the root lockfile entry.
- Added `.npmrc` files to force the official npm registry and install devDependencies.
- Added `scripts/frontend_dependency_repair.ps1` for Windows recovery when `vitest: not found` or `electron-to-chromium` tarball 404 occurs.

## Commands run in this environment

```bash
cd backend
python -m pytest -q
python -m compileall -q ivfitter
```

## Observed result

- Backend pytest: passed, 122 tests.
- Backend compileall: passed.
- Lockfile privacy/sandbox URL scan: passed after sanitization.

## Not verified in this environment

- Frontend `npm install`, Vitest, and production build remain unverified in this sandbox because npm access is environment-dependent.
- Full release packaging (`release_build.ps1`, `build_portable_windows.ps1`).
- Portable smoke test.
- Manual browser checks.

## Local frontend recovery command

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/frontend_dependency_repair.ps1
```

