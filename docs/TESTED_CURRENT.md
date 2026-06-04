# Tested current package

## Package

IVfitter WebUI v1.9.6 verification-fix package, produced from the v1.9.5 staged package after repairing the frontend test failures that remained in the prior final zip.

## Main fixes in v1.9.6

- Fixed Model Builder handle normalization so the terminal handle id `node` is no longer misread as a component `n` port.
- Restored frontend Vitest success after the v1.9.1 handle-ID changes.
- Updated the FittingPage synthetic-trace toolbar test to assert the current Model Builder direct-shell DOM instead of the removed legacy `.model-webpage-stack` wrapper.
- Synchronized root, frontend, and backend version metadata to v1.9.6.
- Updated this test-status document and the final audit to reflect actual commands run in this workspace.

## Automated validation run in this workspace

Frontend validation from `frontend/`:

```bash
npm ci --no-audit --no-fund
npm run test -- --run --reporter=dot
npm run build
```

Result:

- `npm ci`: passed.
- Vitest: passed, 17 test files, 130 tests.
- Production build: passed. Vite emitted non-blocking warnings about the `@xyflow/react` module-level `use client` directive and a large JS chunk; no build error occurred.

Backend validation from `backend/`:

```bash
python3 -m compileall -q ivfitter
python3 -m pytest -q
```

Result:

- Python compile: passed.
- Backend pytest: passed, 137 collected tests, exit code 0.

## Manual checks still required before public release

These checks were not executed in this container because they require an interactive browser and/or Windows packaging environment.

1. Launch the app in a browser and confirm there is no blank Model Builder page.
2. Drag-connect both ends of a component: V → component p, component n → GND, then component-to-component via p/n ports.
3. Toggle diode-like component polarity in the Inspector and confirm the REV badge, equation preview, parameter table, fit result, and HTML/SVG report export remain synchronized.
4. Import all three canonical CSVs in `examples/demo_data/canonical/`, run fit, stop fit, rerun fit, and export HTML/CSV/JSON.
5. Repeat the main workflow at 125%, 150%, and 200% browser zoom, plus English/Chinese language toggle.
6. Run the Windows portable build script on a Windows machine if you need a colleague-ready `.exe` package.
