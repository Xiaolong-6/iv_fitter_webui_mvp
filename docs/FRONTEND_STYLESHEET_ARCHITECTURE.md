# Frontend stylesheet architecture

This document describes the current CSS structure for the IV-fitter Web UI.

## Entry point

`frontend/src/style.css` is intentionally small. It only imports ordered stylesheet modules. Do not add page rules directly to this file.

## Module order

The import order is part of the cascade contract:

1. `styles/base-shell.css` — root variables, body/app shell, basic card/control primitives, and base imports.
2. `styles/charts-and-components.css` — chart toolbar, chart primitives, fit-config primitives, small shared controls.
3. `styles/workflow-layout.css` — workflow shell, sidebar, generic page grid/scroll containment.
4. `styles/data-model-pages.css` — Data and Model page containment plus legacy related page rules.
5. `styles/fitting-page.css` — Fitting page layout, Fit setup containment, Parameters density, plot controls.
6. `styles/report-manual-responsive.css` — Report page, Manual reader integration, and late responsive release-candidate overrides.
7. Existing component-specific files: `styles/model-builder.css` and `styles/user-documentation.css`.

## Rules for future CSS changes

- Add selectors to the narrowest page/component module that owns the behavior.
- Do not reintroduce broad cross-page selectors unless they are true shell primitives.
- Do not use `!important` as a normal override mechanism. If it appears necessary, first check cascade order and selector ownership.
- Keep page scroll contracts explicit: shell owns viewport height; each workflow page owns its own internal scroll regions.
- Add layout changes to manual browser checks at 100%, 125%, 150%, low-height landscape, and narrow/portrait.

## Current debt status

The previous single `style.css` file was about 4,690 lines with 255 `!important` declarations. The current structure keeps `style.css` as a small import manifest and removes all normal `!important` overrides. CSS is still visually large because the app has many workflow pages, but ownership boundaries are now explicit.
