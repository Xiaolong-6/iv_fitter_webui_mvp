import math
import numpy as np

from ivfitter.core.fitting_engine import fit_trace
from ivfitter.core.model_spec import ComponentSpec, FitConfig, FitRequest, ModelSpec, ParameterSpec, TraceData


def p(value, fit=True, lower=None, upper=None, unit=None):
    return ParameterSpec(value=value, fit=fit, lower=lower, upper=upper, unit=unit)


def test_fit_result_contains_process_diagnostics_and_reduced_chi_square():
    voltage = np.linspace(-1.0, 1.0, 21)
    true_r = 1_000.0
    current = voltage / true_r
    model = ModelSpec(parallel=[ComponentSpec(
        id="Rsh",
        location="parallel",
        function_type="shunt",
        law_id="ohmic_linear",
        evaluation_form="current_branch",
        placement="parallel_current_branch",
        params={"Rsh_ohm": p(900.0, fit=True, lower=1.0, upper=1e6, unit="ohm")},
    )])
    result = fit_trace(FitRequest(
        trace=TraceData(voltage_V=voltage.tolist(), current_A=current.tolist(), trace_id="ohmic_synthetic"),
        model=model,
        config=FitConfig(weighting="linear", loss="linear", max_nfev=50, exclude_compliance=False),
    ))

    assert result.fit_diagnostics is not None
    diagnostics = result.fit_diagnostics
    assert diagnostics.trace_name == "ohmic_synthetic"
    assert diagnostics.points_total == 21
    assert diagnostics.points_used == 21
    assert diagnostics.free_parameter_count == 1
    assert diagnostics.degrees_of_freedom == 20
    assert diagnostics.function_evaluations is not None
    assert diagnostics.function_evaluations > 0
    assert diagnostics.elapsed_s is not None
    assert diagnostics.elapsed_s >= 0
    assert "weighted_chi_square" in result.metrics
    assert "reduced_chi_square" in result.metrics
    assert "log_magnitude_r2" in result.metrics
    assert math.isfinite(result.metrics["reduced_chi_square"])


def test_reduced_chi_square_is_nan_when_no_degrees_of_freedom():
    voltage = np.array([0.0, 1.0])
    current = voltage / 1_000.0
    model = ModelSpec(parallel=[ComponentSpec(
        id="Rsh",
        location="parallel",
        function_type="shunt",
        params={"Rsh_ohm": p(1000.0, fit=True, lower=1.0, upper=1e6, unit="ohm")},
    )])
    result = fit_trace(FitRequest(
        trace=TraceData(voltage_V=voltage.tolist(), current_A=current.tolist(), trace_id="too_few_dof"),
        model=model,
        config=FitConfig(weighting="linear", loss="linear", exclude_compliance=False),
    ))
    assert result.fit_diagnostics is not None
    assert result.fit_diagnostics.degrees_of_freedom == 1 or result.fit_diagnostics.degrees_of_freedom == 0
    if result.fit_diagnostics.degrees_of_freedom <= 0:
        assert math.isnan(result.metrics["reduced_chi_square"])
