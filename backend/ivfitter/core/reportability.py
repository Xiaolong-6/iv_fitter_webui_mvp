"""Backend-owned reportability verdict for fit results."""

from __future__ import annotations

import math
from .model_spec import FitWarning

NON_REPORTABLE_WARNING_CODES = {
    "graph_solver",
    "graph_solver_kcl_failed",
    "junction_solver_failed",
    "quality_empty_curve",
    "quality_nonfinite_fit",
    "quality_nonfinite_data",
    "quality_too_few_finite_points",
    "quality_fit_current_explosion",
    "quality_residual_explosion",
    "quality_nonfinite_rmse",
    "quality_rmse_explosion",
    "fit_exception",
    "too_few_points",
    "duplicate_unidentifiable_component",
}


def reportability_from_warnings(success: bool, warnings: list[FitWarning], metrics: dict[str, float] | None = None) -> tuple[bool, str]:
    errors = [w for w in warnings if w.severity == "error" or w.code in NON_REPORTABLE_WARNING_CODES]
    if errors:
        first = errors[0]
        return False, f"{first.code}: {first.message}"
    if not success:
        return False, "fit did not report success"
    if metrics:
        rmse = metrics.get("linear_rmse_A")
        if rmse is None or not math.isfinite(float(rmse)):
            return False, "linear RMSE is non-finite"
    return True, "passed backend numerical/reportability checks"
