# 1.0 candidate release checklist

## Backend

- [x] Headless fitting API exists.
- [x] ModelSpec/FitResult schemas are explicit.
- [x] Registry-driven function library exists.
- [x] Physics validation exists.
- [x] Custom expressions are evaluated or rejected.
- [x] Reproducible JSON export exists.
- [x] Markdown report export exists.

## Frontend

- [x] React/Vite scaffold exists.
- [x] Model Builder is registry-driven.
- [x] Plotly workspace scaffold exists.
- [x] Function library and equation preview components exist.
- [ ] Full browser build verification should be run on a local Node environment.

## Scientific limitations before public 1.0 release

- Confirm parity against the mature Tkinter backend on real IV datasets.
- Add benchmark traces and acceptance tolerances.
- Review all function help text and physical interpretation labels.
- Decide whether desktop packaging is required or browser-local mode is enough.
