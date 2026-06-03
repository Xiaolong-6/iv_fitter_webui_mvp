# External testing guide — IV-fitter Web UI

This guide is for people testing the application before public release. It separates UI testing from physics/model testing so feedback is actionable.

## Tester profiles

### 1. UI-only tester

Goal: verify that the interface is understandable and stable even without device-physics expertise.

Workflow:

1. Open the app.
2. Go to Data.
3. Load a sample trace or paste/import a CSV.
4. Confirm the trace table and plots update.
5. Go to Fitting.
6. Choose an available model without changing advanced settings.
7. Run Fit.
8. Stop one run mid-way and verify the UI returns to a cancelled/stopped state.
9. Check that plots can zoom, pan, reset, and resize.
10. Export/report only after a completed fit.

Pass criteria:

- No blank screen.
- No clipped or unreadable primary controls at common laptop resolutions.
- Stop/timeout state is clear.
- Manual and Report pages remain navigable.

### 2. Research user with real IV data

Goal: verify that the data-to-fit workflow produces interpretable diagnostics.

Workflow:

1. Import real IV CSV data.
2. Check units and sign convention.
3. Choose a physically plausible model.
4. Set initial values and bounds.
5. Run Fit.
6. Inspect fitted parameters, bounds status, residuals, and warnings.
7. Try at least one alternative model if the result is not reportable.
8. Export CSV/report artifacts.

Pass criteria:

- The selected trace is explicit throughout the workflow.
- Parameters are readable, grouped by component, and filterable.
- Near-bound or weakly identified parameters are visible.
- Reportability warnings are not confused with successful publication-ready results.

### 3. Software tester using synthetic data

Goal: verify whether the fitting stack can recover known parameters.

Workflow:

1. Generate or load a synthetic trace with known ground truth.
2. Seed from synthetic ground truth.
3. Perturb initial values and run Fit.
4. Compare fitted parameters with ground truth.
5. Repeat with noise and restricted voltage ranges.

Pass criteria:

- Synthetic ground-truth seeding does not change model structure.
- Fitted values are not promoted to next initials if quality gates fail.
- Exported artifacts clearly identify software version and model.

## Required feedback format

Please report issues with:

- App version.
- Operating system.
- Browser or portable build.
- Input data type/sample.
- Exact workflow step.
- Expected result.
- Actual result.
- Screenshot if visual.
- Whether the issue blocks release.
