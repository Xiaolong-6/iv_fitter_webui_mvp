from __future__ import annotations

from ivfitter.core.bounds_suggestion import BoundsSuggestionRequest, suggest_bounds
from ivfitter.core.model_spec import ComponentSpec, FitConfig, FitRequest, ModelSpec, ParameterSpec, TraceData
from ivfitter.io.export_report import fit_result_markdown
from ivfitter.core.fitting_engine import fit_trace


def _linear_trace(r_ohm: float = 1000.0) -> TraceData:
    voltage = [x * 0.1 for x in range(-20, 21)]
    current = [v / r_ohm for v in voltage]
    return TraceData(voltage_V=voltage, current_A=current, trace_id="linear")


def test_rs_suggestion_tracks_high_current_slope() -> None:
    model = ModelSpec(series=[ComponentSpec(id="rs", location="series", function_type="constant_rs", law_id="ohmic", evaluation_form="voltage_drop", placement="series_voltage_drop", params={"Rs_ohm": ParameterSpec(value=10, lower=0, upper=1e12)})])
    response = suggest_bounds(BoundsSuggestionRequest(trace=_linear_trace(1000.0), model=model, config=FitConfig(v_min=-2, v_max=2)))
    rs = response.suggestions["rs.Rs_ohm"]
    assert response.status == "ok"
    assert rs.lower == 0
    assert 1e3 <= rs.upper <= 1e6
    assert "high-current dV/dI" in rs.reason


def test_rsh_suggestion_is_wide_and_positive() -> None:
    model = ModelSpec(parallel=[ComponentSpec(id="rsh", location="parallel", function_type="shunt", law_id="ohmic", evaluation_form="current_branch", placement="parallel_current_branch", params={"Rsh_ohm": ParameterSpec(value=1e9, lower=1e-9, upper=1e18)})])
    response = suggest_bounds(BoundsSuggestionRequest(trace=_linear_trace(1e6), model=model, config=FitConfig(v_min=-2, v_max=2)))
    rsh = response.suggestions["rsh.Rsh_ohm"]
    assert rsh.lower > 0
    assert rsh.upper > rsh.lower
    assert rsh.upper / rsh.lower >= 1e3
    assert "low-voltage" in rsh.reason


def test_n_parameter_remains_registry_controlled() -> None:
    model = ModelSpec(core=[ComponentSpec(id="d1", location="core", function_type="diode", law_id="shockley_diode", evaluation_form="current_branch", placement="junction_current_branch", params={"I0_A": ParameterSpec(value=1e-12, lower=1e-30, upper=1), "n": ParameterSpec(value=1.5, lower=0.5, upper=10)})])
    response = suggest_bounds(BoundsSuggestionRequest(trace=_linear_trace(), model=model, config=FitConfig()))
    assert "d1.I0_A" in response.suggestions
    assert "d1.n" not in response.suggestions


def test_fit_result_structure_still_contains_normal_parameter_keys() -> None:
    trace = _linear_trace(2000.0)
    model = ModelSpec(series=[ComponentSpec(id="rs", location="series", function_type="constant_rs", law_id="ohmic", evaluation_form="voltage_drop", placement="series_voltage_drop", params={"Rs_ohm": ParameterSpec(value=1000, lower=0, upper=1e5)})])
    result = fit_trace(FitRequest(trace=trace, model=model, config=FitConfig(v_min=-2, v_max=2, max_nfev=20)))
    assert "rs.Rs_ohm" in result.parameters
    report = fit_result_markdown(result)
    assert "| `rs.Rs_ohm` |" in report
