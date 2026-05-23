# IV-fitter Web UI agent handoff

Current package: **v1.4.17**.

This file is the current handoff for future coding agents. It replaces old root-level `HANDOFF_*` files and version-specific handoff fragments.

## First documents to read

1. `PROJECT_RULES.md`
2. `docs/DOCUMENTATION_INDEX.md`
3. this file
4. `README.md`
5. `docs/TESTED_CURRENT.md`

## Product purpose

IV-fitter Web UI has one core job: help users import I-V data, build physically interpretable circuit models, fit traces, inspect residuals/warnings, and export defensible results. Do not add features that make this workflow slower, less reliable, or more confusing.

## Current architecture

```text
React/Vite frontend -> FastAPI API -> Python fitting core
```

- Frontend owns interaction, layout, language selection, and user-facing documentation.
- Backend owns import parsing, model validation, fitting, warnings, equation summaries, and report data.
- The model architecture is Law / Form / Placement. User-facing placement is **Main path** and **Branches**.

## Current important features

- HappyMeasure CSV v2 import compatibility for single, wide, and long exports, including current-source conversion.
- Data workspace display units are display-only; internal fitting arrays remain SI V/A.
- Photocurrent and light-response laws exist as first-class components:
  - constant photocurrent
  - voltage-dependent photocurrent
  - photoconductive branch
  - photo-modulated main path
- Model Builder equivalent-circuit preview uses a compact topology diagram with main path on top and branches below Vj.
- User manual Function Guide is user-facing by default. Internal schema terms are only allowed in collapsed Advanced details.
- Mobile portrait layout has a sticky full-width run action, compact voltage range controls, and a backend connection banner.
- Fitting has visible running feedback, Stop behavior for ignoring an in-flight result, and expanded app-local zoom.
- LAN testing helper `04c_run_lan_dev.bat` starts both backend and frontend and prints phone/tablet URLs.

## Known boundaries

- Graph DC solver remains experimental; do not present it as the default report-grade solver without additional validation.
- Two-trace `ΔI(V)` light/dark preview is not implemented.
- One-click light-response presets are not implemented.
- The lightweight math renderer is purpose-built for the app's formulas; it is not a general LaTeX engine.
- Do not introduce new frontend libraries, math-rendering packages, services, or build systems without explicit user approval.

## Documentation policy

- Use `docs/DOCUMENTATION_INDEX.md` as the map.
- Use `docs/TESTED_CURRENT.md` for current validation.
- Use `docs/VALIDATION_HISTORY.md` for historical validation summaries.
- Do not recreate root-level `HANDOFF_*.md` or many `docs/TESTED_*.md` files for routine internal versions.
- Keep README human-facing. Put agent/process details here or in `PROJECT_RULES.md`.

## Required validation before handoff

For code or UI changes, run when feasible:

```powershell
npm install
npm run build
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
```

For docs-only changes, still run the full set if dependency availability allows it; otherwise clearly state what was not run.

## Required manual test in final response

After every change, provide a 3-step browser test that does not require reading source code. The user should be able to verify the change through the UI or visible files.


## v1.4.9 selected-column HappyMeasure fix

HappyMeasure combined wide-v2 files contain a trace-metadata table before the actual `# section,data` table. The generic single-trace importer must read the explicit data section before applying user-selected `voltage_col` / `current_col`; otherwise selected columns such as `Voltage_V` and `T001 Device_14 [Current_A]` are reported as missing. Keep the anonymized fixture in `examples/testdata/` for regression coverage.


## Sample data note

The Data page sample loader is intentionally tied to the full anonymized HappyMeasure combined wide-v2 CSV. Do not replace it with a cropped fixture or a synthetic in-memory trace unless the user explicitly asks. The sample is meant to exercise the same importer path users need for HappyMeasure multi-trace files.


## Plot selector note

The Plots section now owns a user-facing trace selector. Do not re-add explanatory text like "Showing selected trace only..." in the plot header; the selector itself communicates which trace is active. Keep Data and Plot trace selectors bound to the same selected-trace state.


## Main-path transport note

Main path now exposes advanced transport / voltage-drop forms in the Model Builder menu. Keep this distinction intact:

- branch functions contribute current at `V_j`;
- main-path functions consume voltage or modify effective series transport before branch currents are evaluated.

Do not reframe branch current laws as main-path terms unless they have a clear voltage-drop or transport-modifier evaluation form. The photo-modulated main-path term is available as an interpretive advanced option, but the UI blocks pairing it with ordinary Ohmic series resistance in single-trace fitting because both collapse to an effective resistance.


## Stabilization note

Current stabilization guards include: APP_VERSION fallback to `dev`, abortable equation-preview requests, expanded ErrorBoundary coverage, diagnostic-only graph_dc reportability, deprecated `seed_scale_factors` warning, stricter photocurrent sign validation, and near-zero-current exclusion for log-magnitude metrics. Keep these regression tests active when changing fitting configuration, equation preview, or model validation.

## v1.4.17 stabilization refactor note

This release is a refactor-only stabilization pass. Model Builder add/duplicate rules now live in pure frontend modules under `frontend/src/model-builder/`. Fitting orchestration stays in `fitting_engine.py`, while model evaluation, residuals, metrics, multistart, warnings, and reportability decisions are split into focused backend helper modules. Do not re-inline these helpers into UI or fitting orchestration unless a testable architecture reason is documented.
