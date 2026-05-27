# Development principles for IV-fitter Web UI

These principles are distilled from repeated fixes in the commit history and from the v1.5.28 audit. They are operating rules for future agents and human maintainers.

## 1. Preserve scientific contracts before UI polish

UI layout, wording, and workflow changes must not silently change fitting equations, optimizer behavior, backend API shapes, saved-model compatibility, parameter keys, CSV/JSON report schemas, or exported report semantics. If a scientific contract changes, version it, document it, and add regression tests.

## 2. Protect independent scroll regions

Before and after any layout change, verify that long-content regions remain independently usable:

- Model Builder scrolls independently.
- Model Preview / Equation Preview scrolls independently.
- The Parameters table can scroll without moving plots out of view.
- Report main content and export/sidebar regions remain usable.
- Narrow and portrait layouts do not introduce horizontal overflow or hide essential actions.

Avoid global `overflow` or height fixes that repair one page while breaking another.

## 3. Treat Fit setup as a global workflow control

Run/Stop/Report/status/advanced run options are workflow controls, not ordinary page content. Run fit is primary only when a valid selected trace exists. Stop is visually dangerous only while a fit is running. Report/export is available only after a result exists and should point the user toward diagnostics rather than bypass them.

## 4. Never silently overwrite user intent

User-edited bounds, initial values, fixed/free choices, selected trace, selected model, language setting, and reviewed diagnostics must survive unrelated navigation and UI changes. Automatic suggestions may be offered or applied only with visible source tracking and safe rollback. Poor, bound-stuck, or non-reportable fits may be displayed, but they must not be automatically promoted as trusted next-run initials.

## 5. Keep parameter provenance visible

The parameter table is a scientific control surface, not a cosmetic table. Every parameter value should be traceable as one of: registry default, user-edited, data-suggested, fitted-as-initial, or synthetic-ground-truth seeded. Hover and status text should explain scientific meaning and source, not only internal keys.

## 6. Use Law → Form → Placement as the modeling vocabulary

A law is a mathematical relation; it is not intrinsically series or parallel. A component instance chooses law, evaluation form, placement, and polarity/role. User-facing labels should be physically neutral unless the term is genuinely device-specific. If labels change, preserve internal IDs, legacy aliases, saved-model compatibility, equations, and fit behavior unless an explicit migration is implemented.

## 7. Make reports audit-ready

Report pages and exports must preserve trace identity, model structure, equation/model summary, fit configuration, fitted parameters, bounds, metrics, warnings/cautions, points used/excluded, solver diagnostics, software version, and export timestamp. Report polish must not alter export schemas unless the change is intentional, versioned, documented, and tested.

## 8. Version, document, and test every meaningful change

Every meaningful change should update the changelog, tested-current notes, version metadata, and handoff notes. If user behavior changes, update the manual or transparency docs. If validation is incomplete, state exactly what passed, what was blocked, and why. Do not hand off a package with stale version labels in current docs.

## 9. CSS changes require manual browser checks

Automated tests do not prove pixel-level layout. Each CSS/layout change needs a browser checklist covering desktop, zoomed browser, narrow/portrait layout, and long-content cases. Avoid accumulating `!important` overrides or one-off breakpoints without documenting the layout rationale.

## 10. Mathematical changes require regression tests

Any change to fitting transforms, bounds logic, compliance exclusion, residual weighting, reportability, fitted-as-initial promotion, model validation, or component evaluation must include targeted backend tests and, where relevant, frontend tests. Keep public metric/report keys stable unless a versioned schema migration is deliberate.
