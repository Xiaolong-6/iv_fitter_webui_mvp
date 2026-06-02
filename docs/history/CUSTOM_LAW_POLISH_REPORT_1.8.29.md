# IV-fitter Web UI — v1.8.29 Custom Law Builder Polish

## Scope

This release follows v1.8.28 and focuses on the remaining Custom Law Builder semantic/UI issues.

## Changes

- Replaced backend-oriented labels such as `Custom expression law` / `Advanced · Custom expression law` with user-facing labels:
  - `Custom branch current law`
  - `Custom main-path voltage drop`
- When an auto-named built-in component such as `D1`, `Rs`, or `Rsh` is switched to a custom law, the nickname is changed to `custom` unless the user had already supplied a non-auto name.
- Branch custom laws default to `A * Vi`; main-path custom laws default to `A * I`.
- Parameter badge units for custom parameter `A` are inferred from physical form and expression:
  - branch `A` → `A`
  - branch `A * Vi` → `A/V`
  - main `A` → `V`
  - main `A * I` → `Ω`
- Renamed `POLARITY?`-style wording to `Polarity` with a sign-convention tooltip.
- Changed `Advanced variables` into an explicit disclosure control: `▸ Advanced variables` / `▾ Advanced variables`.
- Fixed syntax help so multiplication examples show the correct variable for the selected physical form.
- Removed `^` from advertised power syntax; custom expressions should use `**` because the backend safe Python AST evaluator does not support `^` as power.
- Custom equations avoid misleading auto-generated diode/resistor subscripts: switching auto-named `D1` to custom renders `I_custom = ...` rather than `I_D1 = ...`.
- Backend custom expression evaluation now accepts user-facing aliases `Vi`, `V`, `absVi`, and `absV` in addition to `Vj`/`absVj`.

## Validation run

- `npm --prefix frontend test -- --run` — passed, 14 files / 113 tests.
- `npm --prefix frontend run build` — passed with existing non-blocking Vite warnings.
- `PYTHONPATH=backend pytest -q backend/tests` — passed.
- `python -m py_compile backend/ivfitter/api/main.py backend/ivfitter/components/custom.py backend/ivfitter/core/fitting_engine.py backend/ivfitter/io/import_trace.py backend/ivfitter/io/_column_detection.py backend/ivfitter/io/_happymeasure_sections.py` — passed.
