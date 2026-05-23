"""Numerical sanity checks for fit results.

These checks are not a substitute for physical interpretation. They prevent the UI
from presenting numerically exploded results as clean successful fits.
"""

from __future__ import annotations

import math
import numpy as np

from .model_spec import FitWarning


def evaluate_fit_quality(y_fit, y_meas, rmse: float | None) -> tuple[bool, list[FitWarning]]:
    """Return whether the fit passes numerical sanity gates and generated warnings."""

    fit = np.asarray(y_fit, dtype=float)
    meas = np.asarray(y_meas, dtype=float)
    warnings: list[FitWarning] = []

    if fit.size == 0 or meas.size == 0:
        warnings.append(FitWarning(code="quality_empty_curve", message="Fit quality could not be evaluated because curve arrays are empty.", severity="error"))
        return False, warnings

    finite_fit = np.isfinite(fit)
    finite_meas = np.isfinite(meas)
    if not finite_fit.all():
        bad = int((~finite_fit).sum())
        warnings.append(FitWarning(code="quality_nonfinite_fit", message=f"Fit curve contains {bad} non-finite value(s).", severity="error"))

    if not finite_meas.all():
        bad = int((~finite_meas).sum())
        warnings.append(FitWarning(code="quality_nonfinite_data", message=f"Measured curve contains {bad} non-finite value(s).", severity="error"))

    finite = finite_fit & finite_meas
    if finite.sum() < 3:
        warnings.append(FitWarning(code="quality_too_few_finite_points", message="Fewer than three finite measured/fit point pairs are available.", severity="error"))
        return False, warnings

    fit_abs_max = float(np.max(np.abs(fit[finite])))
    meas_abs_max = float(np.max(np.abs(meas[finite])))
    meas_scale = max(meas_abs_max, float(np.percentile(np.abs(meas[finite]), 95)), 1e-15)
    residual_abs_max = float(np.max(np.abs((fit - meas)[finite])))

    if fit_abs_max > max(1e3, 1e8 * meas_scale):
        warnings.append(FitWarning(code="quality_fit_current_explosion", message=f"Fit current magnitude is numerically implausible: max |I_fit|={fit_abs_max:.3e} A versus measured scale {meas_scale:.3e} A.", severity="error"))

    if residual_abs_max > max(1e3, 1e8 * meas_scale):
        warnings.append(FitWarning(code="quality_residual_explosion", message=f"Residual magnitude is numerically implausible: max |residual|={residual_abs_max:.3e} A.", severity="error"))

    if rmse is None or not math.isfinite(float(rmse)):
        warnings.append(FitWarning(code="quality_nonfinite_rmse", message="RMSE is non-finite.", severity="error"))
    elif float(rmse) > max(1e3, 1e7 * meas_scale):
        warnings.append(FitWarning(code="quality_rmse_explosion", message=f"RMSE is numerically implausible: {float(rmse):.3e} A versus measured scale {meas_scale:.3e} A.", severity="error"))

    ok = not any(w.severity == "error" for w in warnings)
    return ok, warnings
