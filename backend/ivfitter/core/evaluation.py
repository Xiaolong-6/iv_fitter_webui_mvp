"""Pure model-evaluation helpers for IV fitting.

This module contains the reusable numerical model assembly pieces that were
previously embedded in ``fitting_engine.py``.  It does not fit parameters; it
only evaluates currents, voltage drops, and junction voltages for a ModelSpec.
"""

from __future__ import annotations

import numpy as np
from scipy.optimize import brentq

from ivfitter.components.custom import evaluate_custom_expression
from ivfitter.components.diode import diode_current
from ivfitter.components.parallel import power_law_current, shunt_current, soft_breakdown_current
from ivfitter.components.series import apply_conductance_boost, softplus_conductance_boost
from .graph_solver import solve_graph_current
from .model_spec import ComponentSpec


def param_value(comp: ComponentSpec, name: str, default: float = 0.0) -> float:
    spec = comp.params.get(name)
    return float(spec.value) if spec is not None else default


def direction_sign(comp: ComponentSpec) -> float:
    return 1.0 if param_value(comp, "direction_sign", -1.0) > 0 else -1.0


def bias_activation(v: np.ndarray, polarity: str | None) -> np.ndarray:
    mode = polarity or "symmetric"
    if mode == "forward":
        return (np.asarray(v, dtype=float) >= 0.0).astype(float)
    if mode == "reverse":
        return (np.asarray(v, dtype=float) <= 0.0).astype(float)
    return np.ones_like(np.asarray(v, dtype=float), dtype=float)


def softplus(x: np.ndarray) -> np.ndarray:
    return np.logaddexp(0.0, np.asarray(x, dtype=float))


def thermal_voltage(temperature_K: float) -> float:
    return 8.617333262145e-5 * float(temperature_K)


def diode_polarity_sign(polarity: str | None) -> float:
    return -1.0 if polarity == "reverse" else 1.0


def photocurrent_constant(vj: np.ndarray, comp: ComponentSpec) -> np.ndarray:
    arr = np.asarray(vj, dtype=float)
    return direction_sign(comp) * param_value(comp, "Iph0_A", 0.0) * bias_activation(arr, comp.polarity)


def photocurrent_voltage_dependent(vj: np.ndarray, comp: ComponentSpec) -> np.ndarray:
    arr = np.asarray(vj, dtype=float)
    base = param_value(comp, "Iph0_A", 0.0)
    gain = param_value(comp, "gain_per_V", 0.0)
    threshold_amp = param_value(comp, "Aph", 0.0)
    vt = param_value(comp, "Vt_ph_V", 0.0)
    vs = max(param_value(comp, "Vs_ph_V", 1.0), 1e-30)
    m = param_value(comp, "m_ph", 1.0)
    threshold = threshold_amp * np.power(softplus((np.abs(arr) - vt) / vs), m)
    # ``direction_sign`` is the only current-direction control. Negative linear
    # gain values may reduce the voltage-dependent magnitude, but the computed
    # photocurrent magnitude must never become negative for imported/bypassed
    # configurations.
    magnitude = np.maximum(base * (1.0 + gain * np.abs(arr)) + threshold, 0.0)
    return direction_sign(comp) * magnitude * bias_activation(arr, comp.polarity)


def photoconductive_branch(vj: np.ndarray, comp: ComponentSpec) -> np.ndarray:
    arr = np.asarray(vj, dtype=float)
    return param_value(comp, "Gph_S", 0.0) * arr * bias_activation(arr, comp.polarity)


def series_diode_barrier_drop(current: np.ndarray, comp: ComponentSpec, temperature_K: float) -> np.ndarray:
    arr = np.asarray(current, dtype=float)
    sign = diode_polarity_sign(comp.polarity)
    forward_current = np.maximum(sign * arr, 0.0)
    i0 = max(param_value(comp, "I0_A", 1e-12), 1e-300)
    n = max(param_value(comp, "n", 1.5), 1e-12)
    return sign * n * thermal_voltage(temperature_K) * np.log1p(forward_current / i0)


def series_resistance_effective(vj: np.ndarray, model) -> np.ndarray:
    arr = np.asarray(vj, dtype=float)
    rs = np.zeros_like(arr)
    for comp in model.series:
        if comp.function_type == "constant_rs":
            rs = rs + param_value(comp, "Rs_ohm", param_value(comp, "Rsh_ohm", 0.0))
        elif comp.function_type == "shunt" and (comp.placement == "series_voltage_drop" or comp.evaluation_form == "voltage_drop"):
            rs = rs + param_value(comp, "Rsh_ohm", param_value(comp, "Rs_ohm", 0.0))
    rs = np.maximum(rs, 0.0)
    for comp in model.series:
        if comp.function_type == "softplus_rs_modifier":
            boost = softplus_conductance_boost(arr, param_value(comp, "A", 0.0), param_value(comp, "Vt_V", 0.0), param_value(comp, "Vs_V", 1.0), comp.polarity or "symmetric")
            rs = apply_conductance_boost(rs, boost)
        elif comp.function_type == "photo_modulated_main_path":
            r0 = param_value(comp, "R0_ohm", 0.0)
            gain = max(param_value(comp, "photo_gain", 0.0), -0.95)
            rs = rs + r0 / (1.0 + gain)
        elif comp.function_type == "custom":
            expr = comp.metadata.get("expression", "A*softplus(u)")
            params = {name: spec.value for name, spec in comp.params.items()}
            boost = evaluate_custom_expression(arr, expr, params, comp.polarity or "symmetric")
            rs = apply_conductance_boost(rs, np.maximum(boost, -0.95))
    return np.maximum(rs, 0.0)


def series_voltage_drop(current: np.ndarray, vj: np.ndarray, model, rs_eff_fn=series_resistance_effective) -> np.ndarray:
    arr_i = np.asarray(current, dtype=float)
    arr_vj = np.asarray(vj, dtype=float)
    drop = arr_i * rs_eff_fn(arr_vj, model)
    for comp in model.series:
        if comp.function_type == "series_diode_barrier":
            drop = drop + series_diode_barrier_drop(arr_i, comp, model.temperature_K)
    return drop


def branch_currents_at_vj(vj: np.ndarray, model) -> dict[str, np.ndarray]:
    arr = np.asarray(vj, dtype=float)
    out: dict[str, np.ndarray] = {}
    for comp in model.core:
        if comp.function_type == "diode":
            sign = diode_polarity_sign(comp.polarity)
            out[comp.id] = sign * diode_current(sign * arr, param_value(comp, "I0_A", param_value(comp, "I0", 1e-12)), param_value(comp, "n", 1.5), model.temperature_K)
    for comp in model.parallel:
        if comp.function_type == "shunt":
            out[comp.id] = shunt_current(arr, param_value(comp, "Rsh_ohm", param_value(comp, "Rs_ohm", 1e30)))
        elif comp.function_type == "constant_rs":
            out[comp.id] = shunt_current(arr, param_value(comp, "Rs_ohm", param_value(comp, "Rsh_ohm", 1e30)))
        elif comp.function_type == "power_law":
            out[comp.id] = power_law_current(arr, param_value(comp, "A", 0.0), param_value(comp, "Vt_V", 0.0), param_value(comp, "Vs_V", 1.0), param_value(comp, "m", 1.0), comp.polarity or "forward")
        elif comp.function_type == "soft_breakdown":
            out[comp.id] = soft_breakdown_current(arr, param_value(comp, "I0_A", 0.0), param_value(comp, "Vbr_V", 10.0), param_value(comp, "Vslope_V", 1.0), param_value(comp, "w_V", 0.5))
        elif comp.function_type == "photocurrent_constant":
            out[comp.id] = photocurrent_constant(arr, comp)
        elif comp.function_type == "photocurrent_voltage_dependent":
            out[comp.id] = photocurrent_voltage_dependent(arr, comp)
        elif comp.function_type == "photoconductive_branch":
            out[comp.id] = photoconductive_branch(arr, comp)
        elif comp.function_type == "custom":
            expr = comp.metadata.get("expression", "s*A*softplus(u)**m")
            params = {name: spec.value for name, spec in comp.params.items()}
            out[comp.id] = evaluate_custom_expression(arr, expr, params, comp.polarity or "forward")
    return out


def current_at_vj(vj: np.ndarray, model) -> np.ndarray:
    arr = np.asarray(vj, dtype=float)
    total = np.zeros_like(arr)
    for current in branch_currents_at_vj(arr, model).values():
        total = total + current
    return total


def solve_single_vj(v_ext: float, model, rs_eff_fn=series_resistance_effective) -> float:
    def f(vj: float) -> float:
        arr_vj = np.array([vj], dtype=float)
        current = current_at_vj(arr_vj, model)
        drop = series_voltage_drop(current, arr_vj, model, rs_eff_fn=rs_eff_fn)
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
    return float("nan")


def solve_vj(voltage_v, model, rs_eff_fn=series_resistance_effective) -> np.ndarray:
    return np.array([solve_single_vj(float(v), model, rs_eff_fn=rs_eff_fn) for v in np.asarray(voltage_v, dtype=float)], dtype=float)


def predict_current(voltage_v, model, solver_mode: str = "legacy_composite", rs_eff_fn=series_resistance_effective) -> np.ndarray:
    if solver_mode == "graph_dc":
        current, _branches = solve_graph_current(voltage_v, model)
        return current
    vj = solve_vj(voltage_v, model, rs_eff_fn=rs_eff_fn)
    return current_at_vj(vj, model)
