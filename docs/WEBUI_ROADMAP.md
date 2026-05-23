# Web UI roadmap

## v0.1.0 MVP scaffold

Goal: prove the Web-first architecture without migrating the existing Tkinter app.

Delivered:

- FastAPI backend skeleton.
- React/TypeScript frontend skeleton.
- Shared `ModelSpec` concept.
- Function registry.
- Headless `fit_trace()` entry point.
- Basic component evaluators.
- Custom expression evaluator.
- Tests for backend primitives.

## v0.2.0 Functional Web prototype

Target:

- Real CSV upload/import in the frontend.
- Real Plotly plots:
  - linear I-V;
  - log |I|;
  - signed residual;
  - log residual.
- Model Builder can add/remove:
  - D1;
  - Rs;
  - Rsh;
  - series softplus modifier;
  - parallel power-law branch;
  - reverse soft-breakdown branch;
  - custom branch.
- Parameter editor with value/lower/upper/fit/unit columns.
- Fit warnings visible in the UI.
- Export result JSON.

## v0.3.0 Backend parity push

Target:

- Improve implicit series-Rs solver to match the mature Tkinter backend more closely.
- Add robust seeding and staged fitting.
- Add uncertainty/covariance estimates.
- Add compliance-point detection.
- Add regression tests using real sample traces.

## v0.4.0 Diagnostics and reporting

Target:

- Branch contribution plots.
- Excluded point overlays.
- Fit comparison mode.
- Markdown/HTML fit report export.
- PPT-clean plot export preset.

## v1.0.0 Desktop packaging exploration

Target:

- Decide between browser-local launcher, Tauri, or Electron.
- Package backend + frontend for Windows.
- Define local file access and auto-update strategy.

## Stop/go decision

Continue Web UI if v0.2.0 demonstrates clearly better model-building and diagnostics than Tkinter.

Stop or slow down Web UI if backend parity costs exceed UI benefits before the model registry stabilizes.
