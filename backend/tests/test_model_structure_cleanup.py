import numpy as np

from ivfitter.core.component_registry import component_registry
from ivfitter.core.fitting_engine import predict_current
from ivfitter.core.model_spec import ComponentSpec, ModelSpec, ParameterSpec
from ivfitter.core.model_validation import validate_model_spec


def p(value, lower=None, upper=None, fit=True, unit=None):
    return ParameterSpec(value=value, lower=lower, upper=upper, fit=fit, unit=unit)


def test_registry_exposes_branch_and_series_diode_forms():
    registry = {item.function_type: item for item in component_registry()}
    assert registry["diode"].default_form == "current_branch"
    assert registry["diode"].allowed_polarities == ["forward", "reverse"]
    assert registry["series_diode_barrier"].default_form == "voltage_drop"
    assert registry["series_diode_barrier"].allowed_placements == ["series_voltage_drop"]


def test_reverse_branch_diode_contributes_reverse_current():
    forward = ComponentSpec(
        id="D1", location="core", function_type="diode", law_id="shockley_diode",
        evaluation_form="current_branch", placement="junction_current_branch", polarity="forward",
        params={"I0_A": p(1e-12), "n": p(1.5)}, metadata={"nickname": "D1"},
    )
    reverse = ComponentSpec(
        id="Drev", location="parallel", function_type="diode", law_id="shockley_diode",
        evaluation_form="current_branch", placement="parallel_current_branch", polarity="reverse",
        params={"I0_A": p(1e-12), "n": p(1.5)}, metadata={"nickname": "Drev"},
    )
    model = ModelSpec(core=[forward], parallel=[reverse], temperature_K=300.0)
    current = predict_current(np.array([-0.5, 0.0, 0.5]), model)
    assert np.isfinite(current).all()
    assert current[0] < 0
    assert current[-1] > 0


def test_series_diode_barrier_predicts_finite_current():
    branch = ComponentSpec(
        id="Rsh", location="parallel", function_type="constant_rs", law_id="ohmic",
        evaluation_form="current_branch", placement="parallel_current_branch",
        params={"Rs_ohm": p(1e6)}, metadata={"nickname": "Rsh"},
    )
    barrier = ComponentSpec(
        id="B1", location="series", function_type="series_diode_barrier", law_id="shockley_diode",
        evaluation_form="voltage_drop", placement="series_voltage_drop", polarity="forward",
        params={"I0_A": p(1e-12), "n": p(1.5)}, metadata={"nickname": "Barrier1"},
    )
    model = ModelSpec(parallel=[branch], series=[barrier], temperature_K=300.0)
    current = predict_current(np.array([0.0, 0.2, 1.0]), model)
    assert np.isfinite(current).all()
    assert current[-1] > current[0]


def test_duplicate_same_law_form_placement_polarity_warns():
    r1 = ComponentSpec(
        id="Rs1", location="series", function_type="constant_rs", law_id="ohmic",
        evaluation_form="voltage_drop", placement="series_voltage_drop",
        params={"Rs_ohm": p(10.0)}, metadata={"nickname": "Rs"},
    )
    r2 = ComponentSpec(
        id="Rs2", location="series", function_type="constant_rs", law_id="ohmic",
        evaluation_form="voltage_drop", placement="series_voltage_drop",
        params={"Rs_ohm": p(20.0)}, metadata={"nickname": "Rs2"},
    )
    warnings = validate_model_spec(ModelSpec(series=[r1, r2]))
    assert any(w.code == "duplicate_unidentifiable_component" for w in warnings)
