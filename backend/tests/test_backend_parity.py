import numpy as np
from ivfitter.core.fitting_engine import fit_trace
from ivfitter.core.model_spec import ComponentSpec, FitConfig, FitRequest, ModelSpec, ParameterSpec, TraceData


def ps(value, fit=True, lower=None, upper=None):
    return ParameterSpec(value=value, fit=fit, lower=lower, upper=upper)


def base_model():
    return ModelSpec(
        core=[ComponentSpec(id="D1", location="core", function_type="diode", params={"I0_A": ps(1e-12, True, 1e-15, 1e-9), "n": ps(1.5, True, 0.8, 3)})],
        series=[ComponentSpec(id="Rs", location="series", function_type="constant_rs", params={"Rs_ohm": ps(5, True, 0, 1000)})],
        parallel=[ComponentSpec(id="Rsh", location="parallel", function_type="shunt", params={"Rsh_ohm": ps(1e9, False)})],
    )


def test_fit_returns_branch_contributions_and_metrics():
    v = np.linspace(-1, 0.8, 30)
    i = v / 1e9 + 1e-12 * (np.exp(v/(1.5*0.02585))-1)
    req = FitRequest(trace=TraceData(voltage_V=v.tolist(), current_A=i.tolist()), model=base_model(), config=FitConfig(max_nfev=30))
    result = fit_trace(req)
    assert result.success
    assert "linear_r2" in result.metrics
    assert "D1" in result.curves.branch_currents_A
    assert len(result.curves.excluded_mask) == len(v)
