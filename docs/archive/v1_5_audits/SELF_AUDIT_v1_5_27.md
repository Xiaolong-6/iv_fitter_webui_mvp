# Self-audit — v1.5.27 polarity and landscape stabilization

## Scope
This version addresses user-visible UI and model-explanation issues reported after v1.5.26:

- Diode-like series barrier drop did not expose polarity in the Model Builder.
- Model preview did not explain the series barrier polarity.
- Fitting landscape/desktop layout regressed after portrait optimization.
- Parameter hover text still exposed internal parameter keys before fitting.
- Model Builder should remain fixed while Model preview scrolls.
- Similar workflow pages needed landscape containment checks.

## Confirmed changes

### Diode-like series barrier polarity
- Backend registry now exposes `allowed_polarities=["forward", "reverse"]` and `default_polarity="forward"` for `series_diode_barrier`.
- The forward default preserves the legacy behavior.
- Reverse polarity activates the barrier in the opposite current direction.
- Model Builder now shows the polarity selector for the component.
- Equation preview includes the polarity in the component meaning line when present.

### Model preview readability
- Series barrier terms are displayed as `V_barrier(I)` or `-V_barrier(-I)` instead of generated/internal identifiers.
- The component meaning row explains whether the barrier is forward- or reverse-activated.

### Layout containment
- Model page now keeps Model Builder and Model preview in independent scroll containers.
- Model Builder remains visually fixed while Model preview scrolls.
- Fitting page now keeps plots and parameter table in fixed containers on landscape/desktop; parameters scroll internally.
- Report page left/right columns scroll independently and preserve the resizable pane behavior.
- Portrait fallback remains in place for narrow screens.

### Parameter hover text
- Parameter-name hover text now uses user-facing physical/modeling explanations before and after fitting.
- Default hover no longer falls back to raw internal keys such as `ohmic_1.Rs_ohm`.

## Non-goals
- No fitting objective changes.
- No optimizer changes.
- No report CSV/JSON structure changes.
- No new fitting model added.
- No worker-process hard timeout.

## Automated validation

Commands run:

```bash
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
cd frontend
npm run test -- --run
npm run build
```

Results:

- Backend pytest: 123 passed
- Backend compileall: passed
- Frontend Vitest: 8 files / 27 tests passed
- Frontend production build: passed

## Manual checks still recommended

Because these are UI/layout changes, manually check:

1. Model page at 100%, 125%, and 150% zoom.
2. Fitting page in wide landscape and narrow/portrait modes.
3. Model Builder remains fixed while Model preview scrolls.
4. Barrier polarity selector appears for Diode-like series barrier drop.
5. Parameter hover explanations read as user-facing physical descriptions.
6. Report page columns remain resizable and readable.
