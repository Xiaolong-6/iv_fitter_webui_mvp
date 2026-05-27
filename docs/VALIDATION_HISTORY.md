# Validation history

This document replaces the old collection of many per-version `TESTED_*` files. It keeps the useful history without forcing future readers to open dozens of stale documents.

## Current validation record

Use `docs/TESTED_CURRENT.md` for the exact commands and result status of the current package.

## Historical summary

| Version range | Main validation focus | Notes |
|---|---|---|
| 1.0.7–1.1.3 | Early app setup, backend smoke checks, Windows script validation | Historical scaffold. Details are superseded by current scripts and `HUMAN_DEVELOPER_SETUP.md`. |
| 1.3.0–1.3.10 | Web UI workflow, plotting, model builder, equation preview, selected trace behavior | Historical alpha stabilization. |
| 1.3.11 | Audit-readiness cleanup | README/rules/docs consistency and package hygiene were improved. |
| 1.3.12 | Audit-fix regression pass | Solver failure handling, error boundaries, import warnings, and version injection were tested. |
| 1.3.13 | Model Builder / hover transparency | Topology feedback moved into Model Builder; help/hover behavior was unified. |
| 1.3.14 | Data-unit safety and backend import quality | Data preview units became display-only; import quality diagnostics reached the UI. |
| 1.3.15 | Compact equivalent-circuit layout | Parallel branches were folded below the main path for narrow layouts. |
| 1.3.16 | Rendered manual formulas | User manual and model preview shared a lightweight math renderer. |
| 1.4.0 | Photocurrent / light-response model laws | Added constant photocurrent, voltage-dependent photocurrent, photoconductive branch, and photo-modulated main path. |
| 1.4.1–1.4.2 | LAN phone/tablet testing and fetch diagnostics | Added LAN launch helper and backend-health troubleshooting for `Failed to fetch`. |
| 1.4.3 | HappyMeasure CSV import compatibility | Added HappyMeasure single/wide/long CSV v2 handling, including current-source conversion. |
| 1.4.4 | Mobile portrait layout | Improved narrow-screen flow, sticky mobile run action, compact voltage range controls, and backend connection banner. |
| 1.4.5 | Run-state feedback, Stop action, zoom limit | Added visible fitting status, Stop behavior, and expanded UI zoom limit. |
| 1.4.6–1.4.7 | User-facing Function Guide rewrite | Moved internal schema wording into Advanced details and added a regression check for default Function Guide wording. |
| 1.4.8 | Documentation cleanup | Removed stale per-version handoff/tested files and consolidated documentation entry points. |
| 1.5.18 | Bias-dependent current branch rename | Added canonical neutral naming and legacy alias coverage for the former voltage-dependent photocurrent component. |

## Policy for future validation docs

- Keep one current validation note: `docs/TESTED_CURRENT.md`.
- Append short historical summaries here after release-level changes.
- Do not add `TESTED_1_x_y.md` for every internal handoff package unless the user explicitly asks for a version-specific external audit artifact.
