# Release-candidate external audit — v1.5.43

## Verdict

**Release-candidate status: suitable for browser review after local frontend install/build validation.**

This release is a UI-responsive polish pass. It does not intentionally change fitting physics, optimizer behavior, backend APIs, report schemas, saved-model compatibility, Manual behavior, or Release Manager behavior.

## What changed

- Fitting page prioritizes plot height by default and keeps the plots/parameters splitter.
- Fit setup has narrower-pane action behavior so Run/Stop/Report do not crop under high zoom.
- Plot controls are compact header controls instead of visual overlays covering legends or data.
- Parameter toolbar labels and component summaries are more compact while detailed explanations remain available via hover/title.
- Data import now follows the actual workflow: choose an input source, load data, inspect plot/table, then continue to Fitting.

## Release risks

- Frontend test/build could not be completed in this container because npm dependencies are unavailable from the current mirror. Local validation remains mandatory.
- No screenshot/Playwright visual regression tests exist; browser review is still required for 100%, 125%, and 150–160% zoom.
- The Data page drag-and-drop path should be manually tested in the target Windows browser.

## Required browser checks

1. Start with no data: Data page should invite upload/paste/sample without warning-like empty states.
2. Import a multi-trace dataset: trace metadata should be structured and preview should have most of the space.
3. Fitting 150–160% zoom: Run/Stop/Report should not crop; paired plots should be visible.
4. Plot controls should not cover legends/data.
5. Parameters should remain scrollable and not show huge blank gaps.
