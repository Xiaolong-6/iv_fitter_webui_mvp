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



def _direction_sign(comp: ComponentSpec) -> float:
    return 1.0 if _param_value(comp, "direction_sign", -1.0) >= 0 else -1.0


def _bias_activation(v: np.ndarray, polarity: str | None) -> np.ndarray:
    mode = polarity or "symmetric"
    if mode == "forward":
        return (np.asarray(v, dtype=float) >= 0.0).astype(float)
    if mode == "reverse":
        return (np.asarray(v, dtype=float) <= 0.0).astype(float)
    return np.ones_like(np.asarray(v, dtype=float), dtype=float)


def _softplus(x: np.ndarray) -> np.ndarray:
    x = np.asarray(x, dtype=float)
    return np.logaddexp(0.0, x)


def _photocurrent_constant(vj: np.ndarray, comp: ComponentSpec) -> np.ndarray:
    arr = np.asarray(vj, dtype=float)
    return _direction_sign(comp) * _param_value(comp, "Iph0_A", 0.0) * _bias_activation(arr, comp.polarity)


def _photocurrent_voltage_dependent(vj: np.ndarray, comp: ComponentSpec) -> np.ndarray:
    arr = np.asarray(vj, dtype=float)
    base = _param_value(comp, "Iph0_A", 0.0)
    gain = _param_value(comp, "gain_per_V", 0.0)
    # Linear collection/gain term is the safe default. Threshold terms default to
    # zero/fixed, so the law degenerates to the simplest form until users opt in.
    threshold_amp = _param_value(comp, "Aph", 0.0)
    vt = _param_value(comp, "Vt_ph_V", 0.0)
    vs = max(_param_value(comp, "Vs_ph_V", 1.0), 1e-30)
    m = _param_value(comp, "m_ph", 1.0)
    threshold = threshold_amp * np.power(_softplus((np.abs(arr) - vt) / vs), m)
    magnitude = base * (1.0 + gain * np.abs(arr)) + threshold
    return _direction_sign(comp) * magnitude * _bias_activation(arr, comp.polarity)


def _photoconductive_branch(vj: np.ndarray, comp: ComponentSpec) -> np.ndarray:
    arr = np.asarray(vj, dtype=float)
    return _param_value(comp, "Gph_S", 0.0) * arr * _bias_activation(arr, comp.polarity)


def _thermal_voltage(T: float) -> float:
    return 8.617333262145e-5 * float(T)


def _diode_polarity_sign(polarity: str | None) -> float:
    return -1.0 if polarity == "reverse" else 1.0


def _series_diode_barrier_drop(current: np.ndarray, comp: ComponentSpec, temperature_K: float) -> np.ndarray:
    arr = np.asarray(current, dtype=float)
    sign = _diode_polarity_sign(comp.polarity)
    forward_current = np.maximum(sign * arr, 0.0)
    i0 = max(_param_value(comp, "I0_A", 1e-12), 1e-300)
    n = max(_param_value(comp, "n", 1.5), 1e-12)
    return sign * n * _thermal_voltage(temperature_K) * np.log1p(forward_current / i0)


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
        elif comp.function_type == "photo_modulated_main_path":
            r0 = _param_value(comp, "R0_ohm", 0.0)
            gain = max(_param_value(comp, "photo_gain", 0.0), -0.95)
            rs = rs + r0 / (1.0 + gain)
        elif comp.function_type == "custom":
            expr = comp.metadata.get("expression", "A*softplus(u)")
            params = {name: spec.value for name, spec in comp.params.items()}
            boost = evaluate_custom_expression(arr, expr, params, comp.polarity or "symmetric")
            rs = apply_conductance_boost(rs, np.maximum(boost, -0.95))
    return np.maximum(rs, 0.0)


def _series_voltage_drop(current, vj, model):
    arr_i = np.asarray(current, dtype=float)
    arr_vj = np.asarray(vj, dtype=float)
    drop = arr_i * _series_rs_eff(arr_vj, model)
    for comp in model.series:
        if comp.function_type == "series_diode_barrier":
            drop = drop + _series_diode_barrier_drop(arr_i, comp, model.temperature_K)
    return drop


def branch_currents_at_vj(vj, model):
    arr = np.asarray(vj, dtype=float)
    out: dict[str, np.ndarray] = {}
    for comp in model.core:
        if comp.function_type == "diode":
            sign = _diode_polarity_sign(comp.polarity)
            out[comp.id] = sign * diode_current(sign * arr, _param_value(comp, "I0_A", _param_value(comp, "I0", 1e-12)), _param_value(comp, "n", 1.5), model.temperature_K)
    for comp in model.parallel:
        if comp.function_type == "shunt":
            out[comp.id] = shunt_current(arr, _param_value(comp, "Rsh_ohm", _param_value(comp, "Rs_ohm", 1e30)))
        elif comp.function_type == "constant_rs":
            out[comp.id] = shunt_current(arr, _param_value(comp, "Rs_ohm", _param_value(comp, "Rsh_ohm", 1e30)))
        elif comp.function_type == "power_law":
            out[comp.id] = power_law_current(arr, _param_value(comp, "A", 0.0), _param_value(comp, "Vt_V", 0.0), _param_value(comp, "Vs_V", 1.0), _param_value(comp, "m", 1.0), comp.polarity or "forward")
        elif comp.function_type == "soft_breakdown":
            out[comp.id] = soft_breakdown_current(arr, _param_value(comp, "I0_A", 0.0), _param_value(comp, "Vbr_V", 10.0), _param_value(comp, "Vslope_V", 1.0), _param_value(comp, "w_V", 0.5))
        elif comp.function_type == "photocurrent_constant":
            out[comp.id] = _photocurrent_constant(arr, comp)
        elif comp.function_type == "photocurrent_voltage_dependent":
            out[comp.id] = _photocurrent_voltage_dependent(arr, comp)
        elif comp.function_type == "photoconductive_branch":
            out[comp.id] = _photoconductive_branch(arr, comp)
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
        arr_vj = np.array([vj], dtype=float)
        current = _current_at_vj(arr_vj, model)
        drop = _series_voltage_drop(current, arr_vj, model)
        return float(vj + drop[0] - v_ext)
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
        try:
            root = float(brentq(f, lo, hi, maxiter=80))
            return root if np.isfinite(root) else float("nan")
        except Exception:
            return float("nan")
    # Do not silently return a fixed-point fallback.  Without a bracketed
    # root, the junction voltage is undefined for this parameter set.
    return float("nan")


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


def _stderr(records, jac, residual_vector):
    if jac is None or jac.size == 0 or len(records) == 0 or residual_vector is None:
        return {}
    try:
        n_obs, n_params = jac.shape
        dof = max(n_obs - n_params, 1)
        sigma2 = float(np.sum(np.asarray(residual_vector, dtype=float) ** 2) / dof)
        jtj = jac.T @ jac
        cov = sigma2 * np.linalg.pinv(jtj)
        return {key: float(np.sqrt(max(cov[idx, idx], 0.0))) for idx, (key, *_rest) in enumerate(records)}
    except Exception:
        return {}


def _multistart_candidates(x0: np.ndarray, lower: np.ndarray, upper: np.ndarray, n_seeds: int) -> list[np.ndarray]:
    candidates = [np.clip(np.asarray(x0, dtype=float), lower, upper)]
    n_extra = max(int(n_seeds) - 1, 0)
    if n_extra <= 0 or len(x0) == 0:
        return candidates
    phi = 0.6180339887498949
    for seed_idx in range(n_extra):
        values = []
        for dim, value in enumerate(x0):
            lo = lower[dim]
            hi = upper[dim]
            q = ((seed_idx + 1) * (dim + 1) * phi) % 1.0
            q = min(max(q, 1e-6), 1.0 - 1e-6)
            if np.isfinite(lo) and np.isfinite(hi) and hi > lo:
                if lo > 0 and hi / lo > 100:
                    val = float(np.exp(np.log(lo) + q * (np.log(hi) - np.log(lo))))
                else:
                    val = float(lo + q * (hi - lo))
            elif value > 0:
                val = float(value * (10.0 ** ((q - 0.5) * 6.0)))
            else:
                scale = max(abs(float(value)), 1.0)
                val = float(value + (q - 0.5) * 2.0 * scale)
            values.append(val)
        candidates.append(np.clip(np.asarray(values, dtype=float), lower, upper))
    # Deduplicate numerically identical seeds produced by clipping.
    unique: list[np.ndarray] = []
    for candidate in candidates:
        if not any(np.allclose(candidate, existing, rtol=1e-12, atol=1e-30) for existing in unique):
            unique.append(candidate)
    return unique



def _photocurrent_fit_warnings(model) -> list[FitWarning]:
    warnings: list[FitWarning] = []
    photo_types = {"photocurrent_constant", "photocurrent_voltage_dependent", "photoconductive_branch", "photo_modulated_main_path"}
    for comp in [*model.core, *model.series, *model.parallel]:
        if comp.function_type not in photo_types:
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
                    code="photocurrent_parameter_near_bound",
                    message=f"{comp.id}.{name} reached or nearly reached a bound. The light-response term may be unnecessary, under-constrained, or using the wrong form.",
                    severity="warning",
                ))
        if comp.function_type == "photocurrent_voltage_dependent":
            active_shape_params = [name for name in ("gain_per_V", "Aph", "Vt_ph_V", "Vs_ph_V", "m_ph") if comp.params.get(name) and comp.params[name].fit]
            if len(active_shape_params) >= 3:
                warnings.append(FitWarning(
                    code="photocurrent_overparameterized",
                    message=f"{comp.id} has several voltage-dependent photocurrent shape parameters free. Fit dark-like parameters first, then free only the minimum light-response parameters needed by the residuals.",
                    severity="warning",
                ))
    if any(c.function_type in photo_types for c in [*model.core, *model.series, *model.parallel]):
        warnings.append(FitWarning(
            code="photocurrent_dark_first_guidance",
            message="For light-response fits, fit the dark trace first, then seed or fix dark-like parameters before freeing photocurrent terms.",
            severity="info",
        ))
    return warnings

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
    fit_residual_vector = None
    if len(x0) > 0 and len(v_fit[use]) >= 3:
        def fun(x):
            _apply_x(records, x)
            pred = predict_current(v_fit[use], request.model, request.config.solver_mode)
            if not np.all(np.isfinite(pred)):
                return np.full_like(i_meas[use], 1e30, dtype=float)
            res_vec = _residual(pred, i_meas[use], request.config.weighting, request.config.residual_floor_A)
            return np.nan_to_num(res_vec, nan=1e30, posinf=1e30, neginf=-1e30)
        try:
            starts = [x0]
            if request.config.multistart_enabled:
                starts = _multistart_candidates(x0, lower, upper, getattr(request.config, "multistart_n_seeds", 12))
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
                warnings.append(FitWarning(code="multistart", message=f"Multistart tried {len(starts)} seed set(s) using bounded/log-space sampling.", severity="info"))
            fit_jac = res.jac
            fit_residual_vector = res.fun
        except Exception as exc:
            success = False
            message = f"Fit failed: {exc}"
            warnings.append(FitWarning(code="fit_exception", message=message, severity="error"))
    v_all = np.asarray(request.trace.voltage_V, dtype=float)
    i_all = np.asarray(request.trace.current_A, dtype=float)
    if request.config.solver_mode == "graph_dc":
        i_pred, branches = solve_graph_current(v_all, request.model)
        warnings.append(FitWarning(code="graph_solver", message="Experimental DC graph solver used. Validate against the legacy solver before reporting.", severity="warning"))
    else:
        vj_all = solve_vj(v_all, request.model)
        branches = branch_currents_at_vj(vj_all, request.model)
        i_pred = sum(branches.values(), np.zeros_like(v_all)) if branches else np.zeros_like(v_all)
    if not np.all(np.isfinite(i_pred)):
        code = "graph_solver_kcl_failed" if request.config.solver_mode == "graph_dc" else "junction_solver_failed"
        warnings.append(FitWarning(code=code, message="Model prediction produced non-finite currents; this fit is not reportable.", severity="error"))
        success = False
        i_pred = np.asarray(i_pred, dtype=float)
    residual = i_pred - i_all
    params: dict[str, ParameterResult] = {}
    stderrs = _stderr(records, fit_jac, fit_residual_vector)
    for key, comp, name, spec in _all_fit_params(request):
        params[key] = ParameterResult(value=spec.value, unit=spec.unit, fixed=not spec.fit, lower=spec.lower, upper=spec.upper, stderr=stderrs.get(key))
    excluded_mask = np.zeros_like(v_all, dtype=bool)
    range_indices = np.where(range_mask)[0]
    assert len(excluded) == len(range_indices), "compliance mask must align with selected range"
    excluded_mask[range_indices[excluded]] = True
    metrics = _metrics(i_pred, i_all)
    quality_ok, quality_warnings = evaluate_fit_quality(i_pred, i_all, metrics.get("linear_rmse_A"))
    warnings.extend(quality_warnings)
    warnings.extend(_photocurrent_fit_warnings(request.model))
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
