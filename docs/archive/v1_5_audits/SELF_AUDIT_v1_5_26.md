# Self-audit — v1.5.26 adaptive workflow UI final

## Scope

This audit covers the UI/layout polish batch after v1.5.23. The release addresses the user-reported issues around adaptive card sizing, resizable workflow panes, Model Builder color semantics, Advanced/Parameters containment, portrait-mode behavior, HTML report plots, and parameter hover text.

## What changed

- **Data page:** Import/Paste/Plot review/Spreadsheet cards now use viewport-aware grid rows and internal scroll areas. Plot review remains lightweight and focused on data inspection.
- **Model page:** The Model Builder and Model preview columns are manually resizable. Main-path and branch groups are tinted to match the equivalent-circuit visual language.
- **Fitting page:** Fit setup remains on the left. Plots are kept stable in the upper/right region while Parameters scroll internally in the lower region. Advanced/Details remain downward-expanding left-panel controls.
- **Report page:** Main report content and export sidebar are manually resizable. HTML report export now includes inline SVG plots generated from fitted curves.
- **Tooltips:** Parameter-name hover text now prioritizes parameter meaning over raw internal keys.
- **Responsive layout:** Added portrait/narrow-screen rules to stack Data, Model, Fitting, and Report content safely and hide manual resize handles where they are not appropriate.

## Validation

Automated checks passed:

- Backend pytest suite: 123 tests passed.
- Backend compileall: passed.
- Frontend Vitest suite: 8 files / 27 tests passed.
- Frontend production build: passed.

## Non-goals confirmed

The release did not intentionally change:

- fitting equations,
- optimizer behavior,
- backend API contracts,
- saved-model compatibility,
- existing CSV/parameter CSV/diagnostics JSON export structure,
- model registry semantics.

## Residual risks / manual checks

1. **CSS-only layout behavior:** Automated tests do not verify pixel-level layout. Manually inspect desktop, high zoom, and portrait layouts.
2. **HTML report plots:** Plots are inline SVG and intentionally static. They do not include the full interactive plot toolbar.
3. **Model preview readability:** The obvious internal formula labels were cleaned earlier and the current polish avoids exposing raw parameter keys in tooltips. Complex future components should still be reviewed manually.
4. **Resizable panes:** Width values are in local React state for the session and are not persisted across reloads. This is intentional for this release.
5. **Portrait mode:** The app stacks pages and hides resize handles; very small phone screens may still require vertical scrolling because this is a scientific desktop-first UI.

## Recommendation

Use v1.5.26 as the next review package. Before committing, perform one browser pass over Data, Model, Fitting, and Report at 100%, 125%, and portrait/narrow viewport.
