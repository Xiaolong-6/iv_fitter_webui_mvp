# Tested current — v1.5.30

Validation target: v1.5.30 UI/layout/manual/report cleanup after v1.5.29 audit-principles release.

Validated changes in this package:

- Synthetic trace generation moved from Data import to a **Debug algorithm** action beside the Model Builder title.
- Fitting page now has a manual column resizer between Fit setup and plots/parameters.
- Fit setup advanced/objective controls use available pane height and scroll internally.
- Parameters table is denser and uses horizontal/internal scrolling to avoid high-zoom overlap.
- Report exports now keep HTML report and full report CSV only; separate parameter CSV and diagnostics JSON download paths were removed.
- Report Model and equations are displayed as labeled, rendered formula blocks rather than raw code text.
- Manual page is simplified: no redundant section dropdown, no Current section heading, user-facing subtitle, scrollable content area with left navigation.
- Equivalent circuit panel has reduced chrome and scales with the Model Builder pane.
- Fit quality metrics each expose their own hover explanation.

Commands to run:

```bash
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
cd frontend
npm install
npm run test -- --run
npm run build
```

Manual browser checks recommended:

1. Model page: Debug algorithm opens Synthetic IV trace drawer; generated trace imports and becomes selected.
2. Model page: Equivalent circuit scales with pane resize and does not show an oversized border.
3. Fitting page: drag the Fit setup/results resizer; Objective/advanced options scroll inside Fit setup.
4. Fitting page: high zoom does not make Parameters cells overlap; table scrolls instead.
5. Report page: only HTML and report CSV exports are shown; equations are rendered as labeled formula blocks.
6. Help page: left navigation changes sections; content scrolls without redundant top dropdown or Current section header.
