# Release-candidate external audit — v1.5.40

## Scope

This audit reviews the v1.5.40 UI-polish package after the continuous Manual reader release. The change is intentionally frontend/UI-only: Start-page wording and action sizing, Fitting plot defaults, plot/parameter split resizing, chart control affordances, Data header copy, and Manual navigation density.

## External-agent assessment

Release-candidate status: **acceptable for user/browser review after local frontend install/build validation**.

The package preserves the fitting core, backend API contracts, report export shape, saved-model compatibility, and release-manager scripts. The most visible risk is still visual regression because no screenshot/Playwright suite is present, so browser review remains required.

## Checks performed in this coding pass

- Backend pytest suite passed.
- Python compileall passed for backend and release tools.
- Frontend dependency install/build was attempted but remains blocked in this environment by package-mirror availability; local release validation must run npm install/test/build.

## UI review focus before publishing

1. Start page: sidebar tab reads Start, primary actions are visually prominent, and Data page header does not show the removed HappyMeasure sample hint.
2. Fitting page: default plot view is Linear I-V + signed residual after data/fit review; Log |I| + log residual is available; All diagnostic plots remains available.
3. Fitting page: Plots/Parameters splitter can be dragged and does not break high-zoom layout.
4. Chart controls: icon buttons are easier to identify and click than the previous tiny text buttons.
5. Manual: left navigation is compact and subtitle-free while still scrolling the continuous document to the selected section.
6. Chinese/English switching remains usable.

## Residual risks

- No automated visual regression testing.
- Plot controls are icon-based but still per-chart; a future shared toolbar could further reduce visual repetition.
- Frontend tests/build need local execution where npm registry access is healthy.

## Conclusion

v1.5.40 is a focused release-candidate polish package and is suitable for manual review. It should not be described as a numerical fitting or reportability improvement.
