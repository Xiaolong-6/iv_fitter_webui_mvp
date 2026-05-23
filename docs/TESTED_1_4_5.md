# Tested v1.4.5

Scope: run-state feedback, Stop action, and zoom ceiling.

Manual browser test:
1. Load or import a trace and click Run fit; confirm the button changes to Fitting… and a running banner appears.
2. Click Stop while fitting; confirm the UI returns to a controllable state and does not overwrite the workspace with that stopped result.
3. Use Ctrl+mouse wheel or +/- zoom controls; confirm zoom can go above the previous 118% ceiling.
