"""Warning helpers used by fitting and reportability decisions."""

from __future__ import annotations

from .component_aliases import BIAS_DEPENDENT_CURRENT_TYPES
from .model_spec import FitWarning

PHOTOCURRENT_TYPES = {"photocurrent_constant"}


def deprecated_config_warnings(config) -> list[FitWarning]:
    if getattr(config, "seed_scale_factors", None):
        return [FitWarning(
            code="deprecated_field",
            message="seed_scale_factors is ignored; use multistart_n_seeds instead.",
            severity="warning",
        )]
    return []


def graph_solver_not_reportable_warning() -> FitWarning:
    return FitWarning(code="graph_solver", message="graph_dc is a diagnostic solver and is not reportable.", severity="error")


def photocurrent_fit_warnings(model) -> list[FitWarning]:
    warnings: list[FitWarning] = []
    for comp in [*model.core, *model.series, *model.parallel]:
        is_photocurrent = comp.function_type in PHOTOCURRENT_TYPES
        is_bias_dependent = comp.function_type in BIAS_DEPENDENT_CURRENT_TYPES
        if not is_photocurrent and not is_bias_dependent:
            continue
        for name, spec in comp.params.items():
            if not spec.fit:
                continue
            value = float(spec.value)
            lower = spec.lower
            upper = spec.upper
            near_lower = lower is not None and abs(value - lower) <= max(abs(lower), 1.0) * 1e-6
            near_upper = upper is not None and abs(value - upper) <= max(abs(upper), 1.0) * 1e-6
            if near_lower or near_upper:
                warnings.append(FitWarning(
                    code="current_branch_parameter_near_bound",
                    message=f"{comp.id}.{name} reached or nearly reached a bound. The current branch may be unnecessary, under-constrained, or using the wrong form.",
                    severity="warning",
                ))
        if is_bias_dependent:
            active_shape_params = [name for name in ("gain_per_V", "Aph", "Vt_ph_V", "Vs_ph_V", "m_ph") if comp.params.get(name) and comp.params[name].fit]
            if len(active_shape_params) >= 3:
                warnings.append(FitWarning(
                    code="bias_dependent_current_overparameterized",
                    message=f"{comp.id} has several bias-dependent current shape parameters free. Fit the baseline model first, then free only the minimum branch parameters needed by the residuals.",
                    severity="warning",
                ))
    return warnings
