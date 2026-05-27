# Tested current — v1.5.31

Validated after fitting release-candidate UI polish, compact Parameters table pass, chart toolbar redesign, Manual page cleanup, Equivalent circuit scaling polish, and user-facing Report model explanation rewrite.

Commands run:

```bash
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
cd frontend
npm install
npm run test -- --run
npm run build
```

Observed result in this package:

- Backend pytest: passed, 122 tests.
- Backend compileall: passed.
- Frontend Vitest: passed, 8 files / 27 tests.
- Frontend production build: passed.

Manual browser checks recommended before release:

1. Fitting page at desktop landscape: Fit setup fills the left pane; objective/run options scroll internally; plots and Parameters remain independently usable.
2. Browser zoom 125–150%: Parameters values and bounds do not overlap; table uses horizontal/internal scroll instead of clipping.
3. Plot controls: zoom/pan/reset buttons are large enough to click and show clear hover labels.
4. Model page: Equivalent circuit scales with pane width and does not show excessive border/padding.
5. Report page: model explanation reads as user-facing circuit language; technical backend equation summary is collapsed.
6. Manual page: left navigation changes sections; content area scrolls independently; no redundant dropdown/current-section header/developer tutorial wording is visible.
