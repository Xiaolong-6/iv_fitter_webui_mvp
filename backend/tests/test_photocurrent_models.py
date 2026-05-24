import numpy as np

from ivfitter.core.component_registry import component_registry
from ivfitter.core.equations import generate_equations
from ivfitter.core import fitting_engine
from ivfitter.core.fitting_engine import predict_current, fit_trace
from ivfitter.core.model_spec import ComponentSpec, FitConfig, FitRequest, ModelSpec, ParameterSpec, TraceData


def p(value, fit=False, lower=None, upper=None, unit=None):
    return ParameterSpec(value=value, fit=fit, lower=lower, upper=upper, unit=unit)


def test_registry_contains_photocurrent_laws():
    laws = {entry.law_id for entry in component_registry()}
    assert "photocurrent_constant" in laws
    assert "photocurrent_voltage_dependent" in laws
    assert "photoconductive_branch" not in laws
    assert "photo_modulated_main_path" not in laws


def test_constant_photocurrent_branch_formula_and_prediction():
    model = ModelSpec(parallel=[ComponentSpec(
        id="Iph", location="parallel", function_type="photocurrent_constant",
        law_id="photocurrent_constant", evaluation_form="current_branch", placement="parallel_current_branch",
        params={"Iph0_A": p(2e-9), "direction_sign": p(-1.0)},
    )])
    out = predict_current([-1, 0, 1], model)
    assert np.allclose(out, [-2e-9, -2e-9, -2e-9])
    eq = generate_equations(model)
    joined = "\n".join(eq.voltage_relation + eq.parallel)
    assert "Iph0" in joined
    assert "I_Iph" in joined or "Iph" in joined


def test_voltage_dependent_photocurrent_branch_finite_prediction():
    model = ModelSpec(parallel=[ComponentSpec(
        id="IphV", location="parallel", function_type="photocurrent_voltage_dependent",
        law_id="photocurrent_voltage_dependent", evaluation_form="current_branch", placement="parallel_current_branch",
        params={
            "Iph0_A": p(1e-9),
            "gain_per_V": p(0.5),
            "Aph": p(1e-12),
            "Vt_ph_V": p(1.0),
            "Vs_ph_V": p(0.5),
            "m_ph": p(1.0),
            "direction_sign": p(-1.0),
        },
    )])
    out = predict_current([-2, 0, 2], model)
    assert np.all(np.isfinite(out))
    assert abs(out[0]) > abs(out[1])
    assert abs(out[2]) > abs(out[1])


def test_implicit_solver_failure_still_returns_warning_and_nan_no_fallback(monkeypatch):
    model = ModelSpec(parallel=[ComponentSpec(
        id="Iph", location="parallel", function_type="photocurrent_constant",
        law_id="photocurrent_constant", evaluation_form="current_branch", placement="parallel_current_branch",
        params={"Iph0_A": p(1e-9), "direction_sign": p(-1.0)},
    )])
    monkeypatch.setattr(fitting_engine, "solve_vj", lambda voltage, model: np.full(len(voltage), np.nan))
    trace = TraceData(voltage_V=[0.0, 0.1, 0.2, 0.3], current_A=[0.0, 0.0, 0.0, 0.0])
    result = fitting_engine.fit_trace(FitRequest(trace=trace, model=model, config=FitConfig(exclude_compliance=False)))
    assert not result.success
    assert any(w.code == "junction_solver_failed" for w in result.warnings)
    assert any(not np.isfinite(x) for x in result.curves.current_fit_A)


def test_photocurrent_bound_and_dark_first_guidance_warnings():
    model = ModelSpec(parallel=[ComponentSpec(
        id="Iph", location="parallel", function_type="photocurrent_constant",
        law_id="photocurrent_constant", evaluation_form="current_branch", placement="parallel_current_branch",
        params={"Iph0_A": ParameterSpec(value=0.0, lower=0.0, upper=1e-6, fit=True), "direction_sign": p(-1.0)},
    )])
    trace = TraceData(voltage_V=[-1.0, 0.0, 1.0, 2.0], current_A=[0.0, 0.0, 0.0, 0.0])
    result = fit_trace(FitRequest(trace=trace, model=model, config=FitConfig(max_nfev=10, exclude_compliance=False)))
    codes = {w.code for w in result.warnings}
    assert "photocurrent_dark_first_guidance" in codes
    assert "photocurrent_parameter_near_bound" in codes

from ivfitter.core.model_validation import validate_model_spec


def test_negative_photocurrent_parameter_rejected():
    model = ModelSpec(parallel=[ComponentSpec(
        id="Iph", location="parallel", function_type="photocurrent_constant",
        law_id="photocurrent_constant", evaluation_form="current_branch", placement="parallel_current_branch",
        params={"Iph0_A": p(-1e-9), "direction_sign": p(-1.0)},
    )])
    warnings = validate_model_spec(model)
    assert any(w.code == "negative_photocurrent_parameter" and w.severity == "error" for w in warnings)


def test_direction_sign_zero_rejected():
    model = ModelSpec(parallel=[ComponentSpec(
        id="Iph", location="parallel", function_type="photocurrent_constant",
        law_id="photocurrent_constant", evaluation_form="current_branch", placement="parallel_current_branch",
        params={"Iph0_A": p(1e-9), "direction_sign": p(0.0)},
    )])
    warnings = validate_model_spec(model)
    assert any(w.code == "invalid_direction_sign" and w.severity == "error" for w in warnings)


def test_photocurrent_dark_first_guidance_is_validation_warning():
    model = ModelSpec(parallel=[ComponentSpec(
        id="Iph", location="parallel", function_type="photocurrent_constant",
        law_id="photocurrent_constant", evaluation_form="current_branch", placement="parallel_current_branch",
        params={"Iph0_A": p(1e-9), "direction_sign": p(-1.0)},
    )])
    warnings = validate_model_spec(model)
    assert any(w.code == "photocurrent_dark_first_guidance" and w.severity == "warning" for w in warnings)


def test_voltage_dependent_photocurrent_negative_gain_cannot_flip_direction():
    import numpy as np
    from ivfitter.core.evaluation import photocurrent_voltage_dependent
    from ivfitter.core.model_spec import ComponentSpec, ParameterSpec

    comp = ComponentSpec(
        id="iphv",
        location="parallel",
        function_type="photocurrent_voltage_dependent",
        law_id="photocurrent_voltage_dependent",
        evaluation_form="current_branch",
        placement="parallel_current_branch",
        polarity="symmetric",
        params={
            "Iph0_A": ParameterSpec(value=1e-9, lower=0.0),
            "gain_per_V": ParameterSpec(value=-100.0),
            "Aph": ParameterSpec(value=0.0, lower=0.0, fit=False),
            "Vt_ph_V": ParameterSpec(value=1.0, lower=0.0, fit=False),
            "Vs_ph_V": ParameterSpec(value=1.0, lower=1e-9, fit=False),
            "m_ph": ParameterSpec(value=1.0, lower=0.05, fit=False),
            "direction_sign": ParameterSpec(value=1.0, lower=-1.0, upper=1.0, fit=False),
        },
    )
    current = photocurrent_voltage_dependent(np.array([0.0, 0.1, 1.0]), comp)
    assert np.all(current >= 0.0)
    assert current[-1] == 0.0
