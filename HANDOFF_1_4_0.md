# IV-fitter Web UI v1.4.0 handoff

## Summary

v1.4.0 adds photocurrent and light-response modeling through the existing Law / Form / Placement / Component architecture.

## What changed

- New backend laws:
  - `photocurrent_constant`
  - `photocurrent_voltage_dependent`
  - `photoconductive_branch`
  - `photo_modulated_main_path`
- Photocurrent direction is represented by `direction_sign`; bias activation remains `forward`, `reverse`, or `symmetric` through polarity.
- Voltage-dependent photocurrent includes both linear `|Vj|` gain and optional softplus-threshold terms. The advanced threshold parameters are fixed by default to reduce overfitting.
- Model Builder filters functions by target bucket so branch laws and main-path laws appear in the correct context.
- Formula preview knows how to render photocurrent-specific terms instead of generic branch placeholders.
- The user-facing circuit read-order phrase was removed; it was an internal design note and should not be exposed in UI.
- User manual now documents dark/light workflow and lists presets plus two-trace ΔI(V) preview as future features.

## Validation

See `docs/TESTED_1_4_0.md`.

## Future features intentionally not included

- One-click light-response presets.
- Direct two-trace ΔI(V) preview with voltage-grid alignment/interpolation.
- Full LaTeX renderer dependency. The current math renderer remains lightweight and dependency-free.
