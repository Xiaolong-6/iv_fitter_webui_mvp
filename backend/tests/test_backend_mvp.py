import numpy as np

from ivfitter.components.custom import evaluate_custom_expression
from ivfitter.core.component_registry import component_registry
from ivfitter.core.equations import generate_equations
from ivfitter.core.fitting_engine import fit_trace
from ivfitter.core.model_spec import ComponentSpec, FitConfig, FitRequest, ModelSpec, ParameterSpec, TraceData
from ivfitter.core.polarity import polarity_argument, polarity_sign


def p(value, fit=False, lower=None, upper=None, unit=None):
    return ParameterSpec(value=value, fit=fit, lower=lower, upper=upper, unit=unit)


def sample_model():
    return ModelSpec(
        core=[ComponentSpec(id="D1", location="core", function_type="diode", params={"I0_A": p(1e-12), "n": p(1.5)})],
        series=[
            ComponentSpec(id="Rs", location="series", function_type="constant_rs", params={"Rs_ohm": p(10.0)}),
            ComponentSpec(id="S1", location="series", function_type="softplus_rs_modifier", polarity="symmetric", params={"A": p(0.1), "Vt_V": p(5.0), "Vs_V": p(0.5)}),
        ],
        parallel=[ComponentSpec(id="Rsh", location="parallel", function_type="shunt", params={"Rsh_ohm": p(1e9)})],
    )


def sample_trace():
    v = np.linspace(-2.0, 2.0, 21)
    i = v / 1e9 + 1e-12 * (np.exp(np.clip(v / (1.5 * 0.02585), -40, 20)) - 1.0)
    return TraceData(voltage_V=v.tolist(), current_A=i.tolist())


def test_registry_has_core_series_parallel():
    entries = component_registry()
    keys = {(e.location, e.function_type) for e in entries}
    assert ("core", "diode") in keys
    assert ("series", "softplus_rs_modifier") in keys
    assert ("parallel", "power_law") in keys


def test_polarity_helper():
    v = np.array([-2.0, 0.0, 2.0])
    assert np.allclose(polarity_argument(v, 1.0, 1.0, "forward"), [-3, -1, 1])
    assert np.allclose(polarity_argument(v, 1.0, 1.0, "reverse"), [1, -1, -3])
    assert np.allclose(polarity_argument(v, 1.0, 1.0, "symmetric"), [1, -1, 1])
    assert np.allclose(polarity_sign(v, "reverse"), [-1, -1, -1])


def test_generate_equations_groups_by_topology():
    eq = generate_equations(sample_model())
    assert eq.voltage_relation
    assert any("D1" in row for row in eq.core)
    assert any("S1" in row for row in eq.series)
    assert any("Rsh" in row for row in eq.parallel)


def test_custom_expression_safe_eval():
    v = np.array([-1.0, 0.0, 1.0])
    out = evaluate_custom_expression(v, "s*A*softplus(u)**m", {"A": 2.0, "m": 1.0, "Vt_V": 0.0, "Vs_V": 1.0}, "forward")
    assert out.shape == v.shape
    assert out[-1] > out[0]


def test_fit_trace_smoke_with_no_free_parameters():
    model = sample_model()
    v = np.linspace(-1, 1, 11)
    trace = TraceData(voltage_V=v.tolist(), current_A=(v / 1e9).tolist())
    result = fit_trace(FitRequest(trace=trace, model=model, config=FitConfig(max_nfev=20)))
    assert result.curves.voltage_V
    assert "linear_rmse_A" in result.metrics
