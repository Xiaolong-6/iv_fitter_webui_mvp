"""Headless fitting engine for the greenfield Web UI prototype."""

from __future__ import annotations

import copy
import numpy as np
from scipy.optimize import brentq, least_squares

from ivfitter import __version__
from ivfitter.components.diode import diode_current
from ivfitter.components.parallel import shunt_current, power_law_current, soft_breakdown_current
from ivfitter.components.series import softplus_conductance_boost, apply_conductance_boost
from ivfitter.components.custom import evaluate_custom_expression
from .equations import generate_equations
from .model_validation import validate_model_spec
from .fit_quality import evaluate_fit_quality
from .model_spec import ComponentSpec, FitCurves, FitRequest, FitResult, FitWarning, ParameterResult
from .graph_solver import solve_graph_current


def _param_value(comp: ComponentSpec, name: str, default: float = 0.0) -> float:
    spec = comp.params.get(name)
    return float(spec.value) if spec is not None else default


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


def _series_rs_eff(vj, model):
    arr = np.asarray(vj, dtype=float)
    rs = np.zeros_like(arr)
    for comp in model.series:
        if comp.function_type == "constant_rs":
            rs = rs + _param_value(comp, "Rs_ohm", _param_value(comp, "Rsh_ohm", 0.0))
        elif comp.function_type == "shunt" and (comp.placement == "series_voltage_drop" or comp.evaluation_form == "voltage_drop"):
            rs = rs + _param_value(comp, "Rsh_ohm", _param_value(comp, "Rs_ohm", 0.0))
    rs = np.maximum(rs, 0.0)
    for comp in model.series:
        if comp.function_type == "softplus_rs_modifier":
            boost = softplus_conductance_boost(arr, _param_value(comp, "A", 0.0), _param_value(comp, "Vt_V", 0.0), _param_value(comp, "Vs_V", 1.0), comp.polarity or "symmetric")
            rs = apply_conductance_boost(rs, boost)
        elif comp.function_type == "custom":
            expr = comp.metadata.get("expression", "A*softplus(u)")
            params = {name: spec.value for name, spec in comp.params.items()}
            boost = evaluate_custom_expression(arr, expr, params, comp.polarity or "symmetric")
            rs = apply_conductance_boost(rs, np.maximum(boost, -0.95))
    return np.maximum(rs, 0.0)


def branch_currents_at_vj(vj, model):
    arr = np.asarray(vj, dtype=float)
    out: dict[str, np.ndarray] = {}
    for comp in model.core:
        if comp.function_type == "diode":
            out[comp.id] = diode_current(arr, _param_value(comp, "I0_A", _param_value(comp, "I0", 1e-12)), _param_value(comp, "n", 1.5), model.temperature_K)
    for comp in model.parallel:
        if comp.function_type == "shunt":
            out[comp.id] = shunt_current(arr, _param_value(comp, "Rsh_ohm", _param_value(comp, "Rs_ohm", 1e30)))
        elif comp.function_type == "constant_rs":
            out[comp.id] = shunt_current(arr, _param_value(comp, "Rs_ohm", _param_value(comp, "Rsh_ohm", 1e30)))
        elif comp.function_type == "power_law":
            out[comp.id] = power_law_current(arr, _param_value(comp, "A", 0.0), _param_value(comp, "Vt_V", 0.0), _param_value(comp, "Vs_V", 1.0), _param_value(comp, "m", 1.0), comp.polarity or "forward")
        elif comp.function_type == "soft_breakdown":
            out[comp.id] = soft_breakdown_current(arr, _param_value(comp, "I0_A", 0.0), _param_value(comp, "Vbr_V", 10.0), _param_value(comp, "Vslope_V", 1.0), _param_value(comp, "w_V", 0.5))
        elif comp.function_type == "custom":
            expr = comp.metadata.get("expression", "s*A*softplus(u)**m")
            params = {name: spec.value for name, spec in comp.params.items()}
            out[comp.id] = evaluate_custom_expression(arr, expr, params, comp.polarity or "forward")
    return out


def _current_at_vj(vj, model):
    arr = np.asarray(vj, dtype=float)
    total = np.zeros_like(arr)
    for current in branch_currents_at_vj(arr, model).values():
        total = total + current
    return total


def _solve_single_vj(v_ext: float, model) -> float:
    def f(vj: float) -> float:
        return float(vj + _current_at_vj(np.array([vj]), model)[0] * _series_rs_eff(np.array([vj]), model)[0] - v_ext)
    span = max(10.0, abs(v_ext) + 10.0)
    lo, hi = v_ext - span, v_ext + span
    flo, fhi = f(lo), f(hi)
    tries = 0
    while flo * fhi > 0 and tries < 5:
        span *= 2
        lo, hi = v_ext - span, v_ext + span
        flo, fhi = f(lo), f(hi)
        tries += 1
    if flo * fhi <= 0:
        return float(brentq(f, lo, hi, maxiter=80))
    # fixed-point fallback for pathological combinations
    vj = v_ext
    for _ in range(12):
        i = _current_at_vj(np.array([vj]), model)[0]
        rs = _series_rs_eff(np.array([vj]), model)[0]
        vj = float(v_ext - i * rs)
    return vj


def solve_vj(voltage_v, model) -> np.ndarray:
    return np.array([_solve_single_vj(float(v), model) for v in np.asarray(voltage_v, dtype=float)], dtype=float)


def predict_current(voltage_v, model, solver_mode: str = "legacy_composite") -> np.ndarray:
    if solver_mode == "graph_dc":
        current, _branches = solve_graph_current(voltage_v, model)
        return current
    vj = solve_vj(voltage_v, model)
    return _current_at_vj(vj, model)


def _select_range(request: FitRequest):
    v = np.asarray(request.trace.voltage_V, dtype=float)
    i = np.asarray(request.trace.current_A, dtype=float)
    mask = np.ones(v.shape, dtype=bool)
    if request.config.v_min is not None: mask &= v >= request.config.v_min
    if request.config.v_max is not None: mask &= v <= request.config.v_max
    return v[mask], i[mask], mask


def _compliance_mask(i: np.ndarray, enabled: bool) -> np.ndarray:
    if not enabled or len(i) < 8: return np.zeros(i.shape, dtype=bool)
    a = np.abs(i)
    high = np.quantile(a, 0.98)
    if high <= 0: return np.zeros(i.shape, dtype=bool)
    return a >= 0.995 * high


def _residual(y_fit, y_meas, weighting: str, floor_A: float = 1e-15):
    if weighting == "symmetric_log_signed":
        scale = np.maximum(np.maximum(np.abs(y_fit), np.abs(y_meas)), max(float(floor_A), 1e-30))
        return (y_fit - y_meas) / scale
    return y_fit - y_meas


def _metrics(y_fit, y_meas):
    residual = y_fit - y_meas
    rmse = float(np.sqrt(np.mean(residual**2))) if len(residual) else float("nan")
    denom = float(np.sqrt(np.mean(y_meas**2))) if len(y_meas) else float("nan")
    ss_res = float(np.sum(residual**2))
    ss_tot = float(np.sum((y_meas - np.mean(y_meas))**2))
    log_fit = np.log10(np.maximum(np.abs(y_fit), 1e-30))
    log_meas = np.log10(np.maximum(np.abs(y_meas), 1e-30))
    log_res = log_fit - log_meas
    return {
        "linear_rmse_A": rmse,
        "normalized_rmse": rmse / denom if denom else float("nan"),
        "linear_r2": 1.0 - ss_res / ss_tot if ss_tot else float("nan"),
        "log_magnitude_mae_decades": float(np.mean(np.abs(log_res))) if len(log_res) else float("nan"),
    }


def _stderr(records, jac):
    if jac is None or jac.size == 0 or len(records) == 0: return {}
    try:
        jtj = jac.T @ jac
        cov = np.linalg.pinv(jtj)
        return {key: float(np.sqrt(max(cov[idx, idx], 0.0))) for idx, (key, *_rest) in enumerate(records)}
    except Exception:
        return {}


def fit_trace(request: FitRequest) -> FitResult:
    """Fit one trace using ModelSpec and FitConfig, independent of any UI."""
    request = copy.deepcopy(request)
    warnings: list[FitWarning] = validate_model_spec(request.model)
    x0, lower, upper, records = _pack(request)
    v_fit, i_meas, range_mask = _select_range(request)
    excluded = _compliance_mask(i_meas, request.config.exclude_compliance)
    if excluded.any():
        warnings.append(FitWarning(code="compliance_excluded", message=f"Excluded {int(excluded.sum())} high-current point(s) as possible compliance points.", severity="warning"))
    use = ~excluded
    if len(v_fit[use]) < 3:
        warnings.append(FitWarning(code="too_few_points", message="Need at least three usable points for fitting.", severity="error"))
    success = True
    message = "No free parameters; evaluated model only."
    fit_jac = None
    if len(x0) > 0 and len(v_fit[use]) >= 3:
        def fun(x):
            _apply_x(records, x)
            return _residual(predict_current(v_fit[use], request.model, request.config.solver_mode), i_meas[use], request.config.weighting, request.config.residual_floor_A)
        try:
            starts = [x0]
            if request.config.multistart_enabled:
                starts = []
                for factor in request.config.seed_scale_factors:
                    candidate = np.clip(x0 * float(factor), lower, upper)
                    starts.append(candidate)
            best = None
            for start in starts:
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
                warnings.append(FitWarning(code="multistart", message=f"Multistart tried {len(starts)} seed set(s).", severity="info"))
            fit_jac = res.jac
        except Exception as exc:
            success = False
            message = f"Fit failed: {exc}"
            warnings.append(FitWarning(code="fit_exception", message=message, severity="error"))
    v_all = np.asarray(request.trace.voltage_V, dtype=float)
    i_all = np.asarray(request.trace.current_A, dtype=float)
    if request.config.solver_mode == "graph_dc":
        i_pred, branches = solve_graph_current(v_all, request.model)
        warnings.append(FitWarning(code="graph_solver", message="Experimental DC graph solver used. Validate against the legacy solver before reporting.", severity="info"))
    else:
        vj_all = solve_vj(v_all, request.model)
        branches = branch_currents_at_vj(vj_all, request.model)
        i_pred = sum(branches.values(), np.zeros_like(v_all)) if branches else np.zeros_like(v_all)
    residual = i_pred - i_all
    params: dict[str, ParameterResult] = {}
    stderrs = _stderr(records, fit_jac)
    for key, comp, name, spec in _all_fit_params(request):
        params[key] = ParameterResult(value=spec.value, unit=spec.unit, fixed=not spec.fit, lower=spec.lower, upper=spec.upper, stderr=stderrs.get(key))
    excluded_mask = np.zeros_like(v_all, dtype=bool)
    idx = np.where(range_mask)[0]
    excluded_mask[idx[excluded]] = True
    metrics = _metrics(i_pred, i_all)
    quality_ok, quality_warnings = evaluate_fit_quality(i_pred, i_all, metrics.get("linear_rmse_A"))
    warnings.extend(quality_warnings)
    if not quality_ok:
        success = False
        if "quality gate" not in message.lower():
            message = f"{message}; failed numerical quality gate"
    return FitResult(
        success=success,
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
