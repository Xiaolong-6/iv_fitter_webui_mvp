# Release-candidate external audit — v1.5.42

## Scope

External-style review after the fitting plot layout hotfix. This audit focuses on UI regressions introduced by the chart control redesign and duplicated Fitting panel headings.

## Verdict

**Acceptable for browser review after local frontend test/build validation.**

The change is intentionally narrow: it removes duplicated Plots/Parameters panel headings, makes paired diagnostic plots fill the plot pane, moves chart controls to a compact overlay, and keeps backend fitting/report behavior unchanged.

## Checks

- Fitting core: not changed.
- Backend API/report schema: not changed.
- Manual/release-manager behavior: not changed.
- CSS debt: no new `!important`; changes are scoped to `.fitting-page` plot/section layout.

## Manual browser checks recommended

1. Fitting page with Linear I-V + signed residual at 100%, 125%, and 150% zoom.
2. Fitting page with Log |I| + log residual.
3. Data plot preview to confirm shared chart controls remain compact.
4. Plots/Parameters splitter behavior.
5. Narrow viewport: paired plots stack vertically without duplicated headings.
