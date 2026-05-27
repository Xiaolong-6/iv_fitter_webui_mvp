# Release-candidate external audit — v1.5.36

Audit stance: read the repository as an outside release-review agent after the CSS and FittingPage structural-debt cleanup series. This is a fresh release-candidate review, not an update of earlier v1.5.28 or v1.5.31 audits.

## Verdict

**Release-candidate status: acceptable for user/browser review.**

The two previously identified structural blockers are materially resolved:

- `frontend/src/style.css` is no longer a 4,690-line cumulative patch file. It is now a 6-line import manifest backed by ordered CSS modules under `frontend/src/styles/`.
- Normal frontend CSS no longer depends on `!important` overrides. The previous count was about 255; the current count is 0 across `frontend/src/*.css` and `frontend/src/styles/*.css`.
- `frontend/src/pages/FittingPage.tsx` is no longer a 2,010-line god component. It is now about 754 lines and acts as a workflow coordinator; page sections, report rendering, default model/config, fit actions/messages, backend banner, layout state, pane resizing, and utility helpers are extracted.

## Scope reviewed

Reviewed areas:

- frontend page/component boundaries,
- CSS structure and cascade ownership,
- version/documentation consistency,
- release validation commands,
- report/manual/user-facing behavior continuity,
- scientific contract preservation.

This audit did not repeat a full physics/math proof of every model law because this refactor intentionally did not change backend fitting math, backend API contracts, saved-model schema, or report metric keys.

## Architecture assessment

### Frontend structure

The frontend now has clearer ownership:

- `FittingPage.tsx` coordinates workflow state and callbacks.
- `pages/components/WorkflowSections.tsx` owns Model and Fitting page layout sections.
- `pages/components/ReportWorkflowPage.tsx` owns report rendering and user-facing model explanation.
- `pages/components/FitActionCluster.tsx` owns Run/Stop/Report buttons and fitting messages.
- `pages/components/WorkflowStatus.tsx` owns context/status text.
- `pages/hooks/usePaneResize.ts`, `useAppZoom.ts`, and `useWorkflowLayoutState.ts` isolate layout behavior.
- `model/defaults.ts` owns default model/config setup.

This is a substantial improvement over a single large page component.

### CSS structure

The CSS is now organized as an ordered cascade:

1. `styles/base-shell.css`
2. `styles/charts-and-components.css`
3. `styles/workflow-layout.css`
4. `styles/data-model-pages.css`
5. `styles/fitting-page.css`
6. `styles/report-manual-responsive.css`
7. component-specific CSS files

The new `docs/FRONTEND_STYLESHEET_ARCHITECTURE.md` documents this ownership model. This should stop future agents from adding late broad overrides directly into `style.css`.

## Scientific contract review

No release-blocking scientific contract changes were introduced in this cleanup series:

- backend fitting engine unchanged,
- component registry semantics unchanged,
- Law / Form / Placement model architecture unchanged,
- parameter keys unchanged,
- report metric keys unchanged,
- full report CSV and HTML report paths retained,
- removed parameter CSV / diagnostics JSON paths remain intentionally removed from v1.5.30 onward.

The reduced-chi-square-like metric remains labeled as relative/weighting-dependent in the UI from the earlier polish work, which is appropriate.

## Documentation consistency review

Current docs are self-consistent for v1.5.36:

- README current version is v1.5.36.
- root package, frontend package, frontend lockfile, backend pyproject, and backend `__version__` are v1.5.36.
- `docs/WEBUI_AGENT_HANDOFF.md` points to v1.5.36 and includes the current frontend structure note.
- `docs/TESTED_CURRENT.md` records the v1.5.36 validation pass.
- `docs/DOCUMENTATION_INDEX.md` includes the stylesheet architecture document.
- `docs/DEVELOPMENT_PRINCIPLES.md` includes CSS ownership and FittingPage coordinator rules.

Older audit file `RELEASE_CANDIDATE_EXTERNAL_AUDIT_v1_5_31.md` is retained as historical context, not as the current release audit.

## Remaining non-blocking risks

1. **Visual regression coverage remains manual.** There is still no Playwright/screenshot regression suite. This is acceptable for the current MVP, but manual browser checks must be performed before a public release.
2. **CSS modules are ordered but not yet fully design-tokenized.** The cascade is now maintainable, but future work could further extract spacing, z-index, row-height, and breakpoint tokens.
3. **FittingPage is much smaller but still central.** At about 754 lines, it is no longer a god component, but it remains the workflow coordinator. Future feature additions should go into extracted hooks/components.
4. **Manual and report wording should still be checked by a real domain user.** The structure is improved, but user-facing language benefits from empirical review.

## Required manual browser checks before tagging

Check at 100%, 125%, and 150% app/browser zoom:

1. Data page import/paste/plot review/spreadsheet cards.
2. Model page: Model Builder and Model Preview independent scrolling.
3. Fitting page: Fit setup height containment, plot controls, parameter table compactness and no overlap.
4. Fitting page low-height landscape behavior.
5. Report page: user-facing model explanation, HTML export, CSV export.
6. Manual page: left navigation and independent content scrolling.
7. Equivalent circuit: border density, SVG scaling, and complex-model overflow.

## Release recommendation

Proceed with v1.5.36 as the structural-debt-cleaned release candidate for manual browser review. The previous two debt items — monolithic CSS with excessive `!important`, and oversized FittingPage coordinator — are no longer release blockers.
