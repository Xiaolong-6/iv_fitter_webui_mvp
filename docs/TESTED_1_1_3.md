# Tested 1.1.3

Package target: `iv_fitter_webui_mvp_v1_1_3_plot_control_convergence_tabs.zip`

## Changes validated

- Sidebar can be collapsed/restored using the hamburger button.
- Sidebar footer shows `v1.1.3`.
- Added `Fit & convergence` user-facing documentation tab.
- Parameters and Warnings are now shown under the plots in the main workspace.
- Plot visibility controls allow one, several, or all plots to be shown.
- Each plot has local X/Y zoom buttons, pan buttons, reset, wheel X zoom, and Shift+wheel Y zoom.
- Chart hover tooltip background is wider/taller and clamped inside the SVG viewbox.
- Model Builder makes initial values explicit through the `Initials` editor.
- Fit setup is grouped into Voltage range, Objective, and Run options.

## Commands run

```powershell
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
cd frontend
npm install
npm run build
```
