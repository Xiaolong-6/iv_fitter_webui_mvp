"""Headless fitting engine orchestration for the Web UI prototype.

The heavy numerical pieces live in focused helper modules:
``evaluation`` (model currents/voltage drops), ``residuals`` (range and
weighting), ``metrics`` (quality metrics/covariance), ``multistart`` (seed
selection), ``warnings`` (fit warnings), and ``reportability`` (backend-owned
reportability verdict).  This file now coordinates those pieces instead of
embedding all implementation details.
"""

from __future__ import annotations

import copy
import time
import numpy as np
from scipy.optimize import least_squares

from ivfitter import __version__
from . import evaluation
from .equations import generate_equations
from .fit_quality import evaluate_fit_quality
from .graph_solver import solve_graph_current
from .metrics import fit_metrics, parameter_stderr
from .model_spec import FitCurves, FitRequest, FitResult, FitWarning, ParameterResult
from .model_validation import validate_model_spec
from .multistart import multistart_candidates
from .reportability import reportability_from_warnings
from .residuals import compliance_mask, select_range, weighted_residual
from .warnings import deprecated_config_warnings, graph_solver_not_reportable_warning, photocurrent_fit_warnings

class FitTimeoutError(RuntimeError):
    """Raised when a fit exceeds the user-configured runtime budget."""


# Backwards-compatible aliases kept for tests and downstream scripts that used
# older private helpers directly.
_param_value = evaluation.param_value
branch_currents_at_vj = evaluation.branch_currents_at_vj
_series_rs_eff = evaluation.series_resistance_effective
_metrics = fit_metrics
_stderr = parameter_stderr
_select_range = select_range
_compliance_mask = compliance_mask
_residual = weighted_residual
_multistart_candidates = multistart_candidates



def _current_at_vj(vj, model):
    return evaluation.current_at_vj(vj, model)


def _solve_single_vj(v_ext: float, model) -> float:
    return evaluation.solve_single_vj(v_ext, model, rs_eff_fn=_series_rs_eff)

def solve_vj(voltage_v, model) -> np.ndarray:
    return evaluation.solve_vj(voltage_v, model, rs_eff_fn=_series_rs_eff)


def predict_current(voltage_v, model, solver_mode: str = "legacy_composite") -> np.ndarray:
    if solver_mode == "graph_dc":
        return evaluation.predict_current(voltage_v, model, solver_mode)
    vj = solve_vj(voltage_v, model)
    return _current_at_vj(vj, model)


def _all_fit_params(request: FitRequest):
    params = []
    for group_name in ("core", "series", "parallel"):
        for comp in getattr(request.model, group_name):
            for name, spec in comp.params.items():
                key = f"{comp.id}.{name}"
                params.append((key, comp, name, spec))
    return params


def _pack(request: FitRequest):
    x0, lower, upper, records = [], [], [], []
    for key, comp, name, spec in _all_fit_params(request):
        if spec.fit:
            x0.append(spec.value)
            lower.append(-np.inf if spec.lower is None else spec.lower)
            upper.append(np.inf if spec.upper is None else spec.upper)
            records.append((key, comp, name, spec))
    return np.array(x0, dtype=float), np.array(lower, dtype=float), np.array(upper, dtype=float), records


def _apply_x(records, x):
    for (_, comp, name, _spec), value in zip(records, x):
        comp.params[name].value = float(value)


def fit_trace(request: FitRequest) -> FitResult:
    """Fit one trace using ModelSpec and FitConfig, independent of any UI."""
    request = copy.deepcopy(request)
    warnings: list[FitWarning] = validate_model_spec(request.model)
    warnings.extend(deprecated_config_warnings(request.config))
    timeout_s = float(getattr(request.config, "run_timeout_s", 60.0) or 0.0)
    deadline = time.monotonic() + timeout_s if timeout_s > 0 else None

    def check_timeout() -> None:
        if deadline is not None and time.monotonic() > deadline:
            raise FitTimeoutError(f"Fit exceeded run timeout of {timeout_s:g} s.")

    x0, lower, upper, records = _pack(request)
    v_fit, i_meas, range_mask = select_range(request)
    excluded = compliance_mask(i_meas, request.config.exclude_compliance)
    if excluded.any():
        warnings.append(FitWarning(code="compliance_excluded", message=f"Excluded {int(excluded.sum())} high-current point(s) as possible compliance points.", severity="warning"))
    use = ~excluded
    if len(v_fit[use]) < 3:
        warnings.append(FitWarning(code="too_few_points", message="Need at least three usable points for fitting.", severity="error"))
    success = True
    message = "No free parameters; evaluated model only."
    fit_jac = None
    fit_residual_vector = None
    timed_out = False
    if len(x0) > 0 and len(v_fit[use]) >= 3:
        def fun(x):
            check_timeout()
            _apply_x(records, x)
            pred = predict_current(v_fit[use], request.model, request.config.solver_mode)
            if not np.all(np.isfinite(pred)):
                return np.full_like(i_meas[use], 1e30, dtype=float)
            res_vec = weighted_residual(pred, i_meas[use], request.config.weighting, request.config.residual_floor_A)
            return np.nan_to_num(res_vec, nan=1e30, posinf=1e30, neginf=-1e30)
        try:
            starts = [x0]
            if request.config.multistart_enabled:
                starts = multistart_candidates(x0, lower, upper, getattr(request.config, "multistart_n_seeds", 12))
            best = None
            for start in starts:
                check_timeout()
                res = least_squares(fun, start, bounds=(lower, upper), loss=request.config.loss, max_nfev=request.config.max_nfev)
                cost = float(np.sum(res.fun**2))
                if best is None or cost < best[0]:
                    best = (cost, res)
            assert best is not None
            res = best[1]
            _apply_x(records, res.x)
            success = bool(res.success)
            message = str(res.message)
            if request.config.multistart_enabled:
                message += f"; multistart tried {len(starts)} seed set(s)"
                warnings.append(FitWarning(code="multistart", message=f"Multistart tried {len(starts)} seed set(s) using bounded/log-space sampling.", severity="info"))
            fit_jac = res.jac
            fit_residual_vector = res.fun
        except FitTimeoutError as exc:
            timed_out = True
            success = False
            message = str(exc)
            warnings.append(FitWarning(code="fit_timeout", message=message, severity="error"))
        except Exception as exc:
            success = False
            message = f"Fit failed: {exc}"
            warnings.append(FitWarning(code="fit_exception", message=message, severity="error"))
    v_all = np.asarray(request.trace.voltage_V, dtype=float)
    i_all = np.asarray(request.trace.current_A, dtype=float)
    if timed_out:
        branches = {}
        i_pred = np.full_like(v_all, np.nan, dtype=float)
    else:
        try:
            check_timeout()
            if request.config.solver_mode == "graph_dc":
                i_pred, branches = solve_graph_current(v_all, request.model)
                warnings.append(graph_solver_not_reportable_warning())
            else:
                vj_all = solve_vj(v_all, request.model)
                branches = branch_currents_at_vj(vj_all, request.model)
                i_pred = sum(branches.values(), np.zeros_like(v_all)) if branches else np.zeros_like(v_all)
        except FitTimeoutError as exc:
            success = False
            message = str(exc)
            warnings.append(FitWarning(code="fit_timeout", message=message, severity="error"))
            branches = {}
            i_pred = np.full_like(v_all, np.nan, dtype=float)
    if not np.all(np.isfinite(i_pred)):
        code = "graph_solver_kcl_failed" if request.config.solver_mode == "graph_dc" else "junction_solver_failed"
        warnings.append(FitWarning(code=code, message="Model prediction produced non-finite currents; this fit is not reportable.", severity="error"))
        success = False
        i_pred = np.asarray(i_pred, dtype=float)
    residual = i_pred - i_all
    params: dict[str, ParameterResult] = {}
    stderrs = parameter_stderr(records, fit_jac, fit_residual_vector)
    for key, comp, name, spec in _all_fit_params(request):
        params[key] = ParameterResult(value=spec.value, unit=spec.unit, fixed=not spec.fit, lower=spec.lower, upper=spec.upper, stderr=stderrs.get(key))
    excluded_mask = np.zeros_like(v_all, dtype=bool)
    range_indices = np.where(range_mask)[0]
    assert len(excluded) == len(range_indices), "compliance mask must align with selected range"
    excluded_mask[range_indices[excluded]] = True
    metrics = fit_metrics(i_pred, i_all, request.config.residual_floor_A)
    quality_ok, quality_warnings = evaluate_fit_quality(i_pred, i_all, metrics.get("linear_rmse_A"))
    warnings.extend(quality_warnings)
    warnings.extend(photocurrent_fit_warnings(request.model))
    if not quality_ok:
        success = False
        if "quality gate" not in message.lower():
            message = f"{message}; failed numerical quality gate"
    reportable, reportability_reason = reportability_from_warnings(success, warnings, metrics)
    return FitResult(
        success=success,
        reportable=reportable,
        reportability_reason=reportability_reason,
        message=message,
        model=request.model,
        config=request.config,
        parameters=params,
        metrics=metrics,
        warnings=warnings,
        curves=FitCurves(voltage_V=v_all.tolist(), current_measured_A=i_all.tolist(), current_fit_A=i_pred.tolist(), residual_A=residual.tolist(), branch_currents_A={k: v.tolist() for k, v in branches.items()}, excluded_mask=excluded_mask.tolist()),
        equations=generate_equations(request.model),
        software_version=__version__,
    )
