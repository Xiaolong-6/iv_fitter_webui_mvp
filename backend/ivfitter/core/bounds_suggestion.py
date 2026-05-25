"""Data-aware parameter-bound suggestions for the Web UI.

This module is intentionally non-invasive: it reads the selected trace, fit
voltage range, current model, and registry defaults, then returns suggestions.
It does not change parameter names, equations, serialization, or fit behavior.
"""

from __future__ import annotations

from dataclasses import dataclass
from math import isfinite
from statistics import median
from typing import Literal

from pydantic import BaseModel, Field

from .component_registry import registry_by_function
from .model_spec import FitConfig, ModelSpec, TraceData

BoundSuggestionSource = Literal["registry_default", "data_suggested", "not_suggested"]


class ParameterBoundsSuggestion(BaseModel):
    """One parameter suggestion returned to the UI."""

    component_id: str
    param_name: str
    lower: float | None = None
    upper: float | None = None
    initial: float | None = None
    source: BoundSuggestionSource = "data_suggested"
    reason: str


class BoundsSuggestionResponse(BaseModel):
    """Data-aware suggestion response keyed by ``component_id.param_name``."""

    suggestions: dict[str, ParameterBoundsSuggestion] = Field(default_factory=dict)
    status: str
    notes: list[str] = Field(default_factory=list)


class BoundsSuggestionRequest(BaseModel):
    trace: TraceData
    model: ModelSpec
    config: FitConfig = Field(default_factory=FitConfig)


@dataclass(frozen=True)
class TraceScale:
    voltage_span: float
    v_abs_max: float
    i_abs_max: float
    i_p50: float
    i_p90: float
    i_p95: float
    rs_slope_ohm: float | None
    rsh_slope_ohm: float | None


def _finite_selected_points(trace: TraceData, config: FitConfig) -> list[tuple[float, float]]:
    lo = config.v_min
    hi = config.v_max
    if lo is not None and hi is not None and lo > hi:
        lo, hi = hi, lo
    out: list[tuple[float, float]] = []
    for v, i in zip(trace.voltage_V, trace.current_A):
        if not (isfinite(v) and isfinite(i)):
            continue
        if lo is not None and v < lo:
            continue
        if hi is not None and v > hi:
            continue
        out.append((float(v), float(i)))
    return out


def _percentile(sorted_values: list[float], fraction: float) -> float:
    if not sorted_values:
        return 0.0
    idx = max(0, min(len(sorted_values) - 1, round((len(sorted_values) - 1) * fraction)))
    return sorted_values[idx]


def _positive_scale(value: float, fallback: float) -> float:
    if isfinite(value) and value > 0:
        return float(value)
    return fallback


def _robust_dv_di(points: list[tuple[float, float]]) -> float | None:
    if len(points) < 2:
        return None
    ordered = sorted(points, key=lambda pair: pair[0])
    slopes: list[float] = []
    for (v0, i0), (v1, i1) in zip(ordered, ordered[1:]):
        di = i1 - i0
        dv = v1 - v0
        if abs(di) <= 0 or not (isfinite(di) and isfinite(dv)):
            continue
        slope = abs(dv / di)
        if isfinite(slope) and slope > 0:
            slopes.append(slope)
    return median(slopes) if slopes else None


def _trace_scale(points: list[tuple[float, float]]) -> TraceScale | None:
    if len(points) < 3:
        return None
    abs_i = sorted(abs(i) for _, i in points if isfinite(i))
    abs_v = [abs(v) for v, _ in points if isfinite(v)]
    if not abs_i or not abs_v:
        return None
    vs = max(v for v, _ in points) - min(v for v, _ in points)
    i_p50 = _positive_scale(_percentile(abs_i, 0.50), 1e-12)
    i_p90 = _positive_scale(_percentile(abs_i, 0.90), i_p50)
    i_p95 = _positive_scale(_percentile(abs_i, 0.95), i_p90)
    high_threshold = _percentile(abs_i, 0.80)
    high_points = [(v, i) for v, i in points if abs(i) >= high_threshold]
    rs_slope = _robust_dv_di(high_points)
    low_v_limit = max(abs(vs) * 0.15, 1e-9)
    low_points = [(v, i) for v, i in points if abs(v) <= low_v_limit]
    if len(low_points) < 3:
        low_i_limit = _percentile(abs_i, 0.25)
        low_points = [(v, i) for v, i in points if abs(i) <= low_i_limit]
    rsh_slope = _robust_dv_di(low_points)
    return TraceScale(
        voltage_span=_positive_scale(abs(vs), 1.0),
        v_abs_max=_positive_scale(max(abs_v), 1.0),
        i_abs_max=_positive_scale(max(abs_i), i_p95),
        i_p50=i_p50,
        i_p90=i_p90,
        i_p95=i_p95,
        rs_slope_ohm=rs_slope,
        rsh_slope_ohm=rsh_slope,
    )


def _clip(value: float, lower: float | None, upper: float | None) -> float:
    out = value
    if lower is not None:
        out = max(out, lower)
    if upper is not None:
        out = min(out, upper)
    return out


def _key(component_id: str, param_name: str) -> str:
    return f"{component_id}.{param_name}"


def _registry_param(function_type: str, param_name: str):
    definition = registry_by_function().get(function_type)
    if not definition:
        return None
    return next((p for p in definition.parameters if p.name == param_name), None)


def _suggest_for_param(function_type: str, placement: str | None, param_name: str, scale: TraceScale) -> tuple[float | None, float | None, float | None, str] | None:
    reg = _registry_param(function_type, param_name)
    reg_lower = reg.lower if reg else None
    reg_upper = reg.upper if reg else None
    i_scale = max(scale.i_p95, 1e-15)
    v_scale = max(scale.voltage_span, 1e-9)

    if param_name == "Rs_ohm" and placement == "series_voltage_drop":
        fallback = scale.v_abs_max / max(scale.i_p90, 1e-15)
        estimate = scale.rs_slope_ohm or fallback
        upper = _clip(max(estimate * 50.0, fallback * 5.0, 1e-6), reg_lower, reg_upper)
        initial = _clip(max(min(estimate, upper * 0.2), 1e-9), reg_lower, upper)
        return reg_lower, upper, initial, "Rs upper estimated from high-current dV/dI; fallback uses max(|V|)/high-percentile(|I|). Safety factor keeps the bound conservative."

    if param_name in {"Rsh_ohm", "Rs_ohm"} and placement in {"parallel_current_branch", "junction_current_branch"}:
        fallback = scale.v_abs_max / max(scale.i_p50, 1e-15)
        estimate = scale.rsh_slope_ohm or fallback
        lower = _clip(max(estimate / 1e3, 1e-9), reg_lower, reg_upper)
        upper = _clip(max(estimate * 1e3, lower * 10.0), lower, reg_upper)
        initial = _clip(max(estimate, lower), lower, upper)
        return lower, upper, initial, "Rsh range estimated from low-voltage dV/dI, with a wide factor because leakage and noise can dominate this region."

    if param_name in {"I0_A", "I01_A", "I02_A"}:
        upper = _clip(max(i_scale * 100.0, 1e-15), reg_lower, reg_upper)
        initial = _clip(min(max(i_scale * 1e-6, reg_lower or 1e-30), upper), reg_lower, upper)
        return reg_lower, upper, initial, "Saturation-current upper bound limited by the observed current scale; lower bound remains the registry floor."

    if param_name in {"A", "Afwd_A", "Iph0_A", "Aph"}:
        upper = _clip(max(i_scale * 100.0, 1e-15), reg_lower, reg_upper)
        initial = _clip(min(max(i_scale * 0.1, reg_lower or 0.0), upper), reg_lower, upper)
        return reg_lower, upper, initial, "Current-scale amplitude estimated from the selected trace current magnitude."

    if param_name in {"Vt_V", "Vt_fwd_V", "Vt_ph_V", "Vbr_V"}:
        margin = 0.25 * v_scale
        lower = _clip(-scale.v_abs_max - margin, reg_lower, reg_upper)
        upper = _clip(scale.v_abs_max + margin, lower, reg_upper)
        initial = _clip(min(scale.v_abs_max, upper), lower, upper)
        return lower, upper, initial, "Threshold voltage range derived from the selected fit voltage span plus a margin; it is a search-window suggestion, not a detected threshold."

    if param_name in {"Vs_V", "Vs_fwd_V", "Vs_ph_V", "Vslope_V", "w_V"}:
        lower = _clip(max(v_scale * 1e-4, 1e-9), reg_lower, reg_upper)
        upper = _clip(max(v_scale, lower * 10.0), lower, reg_upper)
        initial = _clip(max(v_scale * 0.1, lower), lower, upper)
        return lower, upper, initial, "Voltage softness/slope range derived from the selected voltage span."

    if param_name in {"A_V"}:
        upper = _clip(max(scale.v_abs_max * 2.0, 1e-9), reg_lower, reg_upper)
        initial = _clip(max(scale.v_abs_max * 0.05, reg_lower or 0.0), reg_lower, upper)
        return reg_lower, upper, initial, "Voltage-drop scale bounded from the selected voltage magnitude."

    if param_name in {"It_A"}:
        lower = _clip(max(scale.i_p50 * 1e-3, 0.0), reg_lower, reg_upper)
        upper = _clip(max(scale.i_abs_max * 2.0, lower * 10.0, 1e-15), lower, reg_upper)
        initial = _clip(max(scale.i_p90, lower), lower, upper)
        return lower, upper, initial, "Current threshold range estimated from the selected current magnitude."

    if param_name in {"Is_A"}:
        lower = _clip(max(scale.i_p50 * 1e-4, 1e-30), reg_lower, reg_upper)
        upper = _clip(max(scale.i_abs_max, lower * 10.0), lower, reg_upper)
        initial = _clip(max(scale.i_p50, lower), lower, upper)
        return lower, upper, initial, "Current softness range estimated from the selected current magnitude."

    # n/m/exponent-like parameters intentionally remain registry-controlled.
    return None


def suggest_bounds(request: BoundsSuggestionRequest) -> BoundsSuggestionResponse:
    points = _finite_selected_points(request.trace, request.config)
    scale = _trace_scale(points)
    if scale is None:
        return BoundsSuggestionResponse(status="insufficient_data", notes=["Need at least three finite V/I points inside the selected fit range."])

    suggestions: dict[str, ParameterBoundsSuggestion] = {}
    notes = [
        "Suggestions are conservative search-window estimates, not proof of physical parameter values.",
        "The UI applies them only when the current bounds still match registry defaults or when the user explicitly edits them.",
    ]
    for location in ("series", "core", "parallel"):
        for comp in getattr(request.model, location):
            for param_name in comp.params:
                suggested = _suggest_for_param(comp.function_type, comp.placement, param_name, scale)
                if suggested is None:
                    continue
                lower, upper, initial, reason = suggested
                suggestions[_key(comp.id, param_name)] = ParameterBoundsSuggestion(
                    component_id=comp.id,
                    param_name=param_name,
                    lower=lower,
                    upper=upper,
                    initial=initial,
                    source="data_suggested",
                    reason=reason,
                )

    return BoundsSuggestionResponse(suggestions=suggestions, status="ok" if suggestions else "no_applicable_parameters", notes=notes)
