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
    assert registry["series_diode_barrier"].allowed_polarities == ["forward", "reverse"]
    assert registry["series_diode_barrier"].default_polarity == "forward"


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


def test_series_diode_barrier_polarity_controls_active_current_direction():
    forward = ComponentSpec(
        id="B1", location="series", function_type="series_diode_barrier", law_id="shockley_diode",
        evaluation_form="voltage_drop", placement="series_voltage_drop", polarity="forward",
        params={"I0_A": p(1e-12), "n": p(1.5)}, metadata={"nickname": "Barrier1"},
    )
    reverse = ComponentSpec(
        id="B1", location="series", function_type="series_diode_barrier", law_id="shockley_diode",
        evaluation_form="voltage_drop", placement="series_voltage_drop", polarity="reverse",
        params={"I0_A": p(1e-12), "n": p(1.5)}, metadata={"nickname": "Barrier1"},
    )
    branch = ComponentSpec(
        id="Rsh", location="parallel", function_type="constant_rs", law_id="ohmic",
        evaluation_form="current_branch", placement="parallel_current_branch",
        params={"Rs_ohm": p(1e6)}, metadata={"nickname": "Rsh"},
    )
    assert not any(w.code == "unsupported_polarity" and w.severity == "error" for w in validate_model_spec(ModelSpec(series=[forward], parallel=[branch])))
    assert not any(w.code == "unsupported_polarity" and w.severity == "error" for w in validate_model_spec(ModelSpec(series=[reverse], parallel=[branch])))
    current_forward = predict_current(np.array([-1.0, 0.0, 1.0]), ModelSpec(parallel=[branch], series=[forward], temperature_K=300.0))
    current_reverse = predict_current(np.array([-1.0, 0.0, 1.0]), ModelSpec(parallel=[branch], series=[reverse], temperature_K=300.0))
    assert np.isfinite(current_forward).all()
    assert np.isfinite(current_reverse).all()
    assert current_forward[-1] > current_forward[0]
    assert current_reverse[0] < current_reverse[-1]


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


def test_registry_exposes_advanced_main_path_transport_forms():
    registry = {item.function_type: item for item in component_registry()}
    softplus = registry["softplus_rs_modifier"]
    assert softplus.default_form == "conductance_modifier"
    assert "series_conductance_modifier" in softplus.allowed_placements
    custom = registry["custom"]
    assert "conductance_modifier" in custom.available_forms
    assert "series_conductance_modifier" in custom.allowed_placements
    series_power = registry["series_power_law_drop"]
    assert series_power.default_form == "voltage_drop"
    assert "series_voltage_drop" in series_power.allowed_placements
    assert "photo_modulated_main_path" not in registry
    assert "photoconductive_branch" not in registry


def test_softplus_transport_modifier_predicts_finite_current_with_rs_baseline():
    branch = ComponentSpec(
        id="Rsh", location="parallel", function_type="constant_rs", law_id="ohmic",
        evaluation_form="current_branch", placement="parallel_current_branch",
        params={"Rs_ohm": p(1e6)}, metadata={"nickname": "Rsh"},
    )
    rs = ComponentSpec(
        id="Rs", location="series", function_type="constant_rs", law_id="ohmic",
        evaluation_form="voltage_drop", placement="series_voltage_drop",
        params={"Rs_ohm": p(100.0)}, metadata={"nickname": "Rs"},
    )
    modifier = ComponentSpec(
        id="Gmod", location="series", function_type="softplus_rs_modifier", law_id="softplus_conductance_modifier",
        evaluation_form="conductance_modifier", placement="series_conductance_modifier", polarity="forward",
        params={"A": p(2.0), "Vt_V": p(0.1), "Vs_V": p(0.2)}, metadata={"nickname": "Gmod"},
    )
    model = ModelSpec(parallel=[branch], series=[rs, modifier], temperature_K=300.0)
    current = predict_current(np.array([-1.0, 0.0, 1.0]), model)
    assert np.isfinite(current).all()
    assert current[-1] > current[1]


def test_series_power_law_drop_predicts_finite_current_with_branch():
    branch = ComponentSpec(
        id="Rsh", location="parallel", function_type="constant_rs", law_id="ohmic",
        evaluation_form="current_branch", placement="parallel_current_branch",
        params={"Rs_ohm": p(1e6)}, metadata={"nickname": "Rsh"},
    )
    series_drop = ComponentSpec(
        id="Softplus1", location="series", function_type="series_power_law_drop", law_id="softplus_power_law_voltage_drop",
        evaluation_form="voltage_drop", placement="series_voltage_drop", polarity="forward",
        params={"A_V": p(0.2), "It_A": p(1e-7), "Is_A": p(1e-7), "m": p(1.0)}, metadata={"nickname": "Softplus1"},
    )
    model = ModelSpec(parallel=[branch], series=[series_drop], temperature_K=300.0)
    current = predict_current(np.array([-1.0, 0.0, 1.0]), model)
    assert np.isfinite(current).all()
    assert current[-1] > current[1]


def test_role_aware_two_diode_model_is_not_duplicate_error():
    d1 = ComponentSpec(
        id="D1", location="core", function_type="diode", law_id="shockley_diode",
        evaluation_form="current_branch", placement="junction_current_branch", polarity="forward",
        params={"I0_A": p(1e-12), "n": p(1.2)}, metadata={"nickname": "D1", "role": "primary"},
    )
    d2 = ComponentSpec(
        id="D2", location="parallel", function_type="diode", law_id="shockley_diode",
        evaluation_form="current_branch", placement="parallel_current_branch", polarity="forward",
        params={"I0_A": p(1e-10), "n": p(2.0)}, metadata={"nickname": "D2", "role": "secondary"},
    )
    warnings = validate_model_spec(ModelSpec(core=[d1], parallel=[d2]))
    assert not any(w.code == "duplicate_unidentifiable_component" for w in warnings)


def test_same_role_two_diode_model_is_duplicate_error():
    d1 = ComponentSpec(
        id="D1", location="core", function_type="diode", law_id="shockley_diode",
        evaluation_form="current_branch", placement="junction_current_branch", polarity="forward",
        params={"I0_A": p(1e-12), "n": p(1.2)}, metadata={"nickname": "D1", "role": "primary"},
    )
    d2 = ComponentSpec(
        id="D2", location="core", function_type="diode", law_id="shockley_diode",
        evaluation_form="current_branch", placement="junction_current_branch", polarity="forward",
        params={"I0_A": p(1e-10), "n": p(2.0)}, metadata={"nickname": "D2", "role": "primary"},
    )
    warnings = validate_model_spec(ModelSpec(core=[d1, d2]))
    assert any(w.code == "duplicate_unidentifiable_component" and w.severity == "error" for w in warnings)


def test_series_diode_barrier_rejects_nonpositive_i0_and_n():
    comp = ComponentSpec(
        id="B1", location="series", function_type="series_diode_barrier", law_id="shockley_diode",
        evaluation_form="voltage_drop", placement="series_voltage_drop", polarity="forward",
        params={"I0_A": p(0.0), "n": p(0.0)}, metadata={"nickname": "B1"},
    )
    warnings = validate_model_spec(ModelSpec(series=[comp]))
    assert any(w.code == "nonpositive_physical_parameter" and "I0_A" in w.message and w.severity == "error" for w in warnings)
    assert any(w.code == "nonpositive_physical_parameter" and ".n" in w.message and w.severity == "error" for w in warnings)
