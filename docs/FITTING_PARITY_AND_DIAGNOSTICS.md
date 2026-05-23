# Fitting parity and diagnostics plan

The Web backend is converging toward the mature Tkinter fitting behavior, but parity should be explicit and testable.

## Implemented in 1.0.0

- Configurable residual floor for signed-log residual weighting.
- Optional multistart fitting with seed scale factors.
- Fit warning when multistart is used.
- Existing implicit junction-voltage solver and compliance-like exclusion remain active.

## Still required before 1.0 scientific parity

- Regression datasets shared with the Tkinter implementation.
- More complete two-stage seed refinement.
- Parameter-bound diagnostics with near-bound thresholds.
- Better covariance conditioning warnings.
- Branch contribution residual diagnostics.
- Benchmark tests for large traces and complex models.

## Interpretation policy

High fit quality does not imply physical uniqueness. Reports should show warnings, parameter bounds, and whether multistart or compliance exclusion was used.
