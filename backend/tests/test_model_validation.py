from ivfitter.core.model_spec import ComponentSpec, ModelSpec, ParameterSpec
from ivfitter.core.model_validation import validate_model_spec


def test_validation_rejects_wrong_soft_breakdown_polarity():
    comp = ComponentSpec(
        id="br_bad",
        location="parallel",
        function_type="soft_breakdown",
        polarity="forward",
        params={
            "I0_A": ParameterSpec(value=1e-12, lower=0),
            "Vbr_V": ParameterSpec(value=10, lower=0),
            "Vslope_V": ParameterSpec(value=1, lower=1e-9),
            "w_V": ParameterSpec(value=0.5, lower=1e-9, fit=False),
        },
    )
    warnings = validate_model_spec(ModelSpec(parallel=[comp]))
    assert any(w.code in {"unsupported_polarity", "breakdown_polarity"} for w in warnings)


def test_validation_duplicate_component_id_is_error():
    c1 = ComponentSpec(id="x", location="series", function_type="constant_rs", params={"Rs_ohm": ParameterSpec(value=1)})
    c2 = ComponentSpec(id="x", location="parallel", function_type="shunt", params={"Rsh_ohm": ParameterSpec(value=1e9)})
    warnings = validate_model_spec(ModelSpec(series=[c1], parallel=[c2]))
    assert any(w.code == "duplicate_component_id" and w.severity == "error" for w in warnings)


def test_validation_rejects_series_component_with_branch_placement():
    comp = ComponentSpec(
        id="bad_series_branch",
        location="series",
        function_type="diode",
        law_id="shockley_diode",
        evaluation_form="current_branch",
        placement="parallel_current_branch",
        polarity="forward",
        params={
            "I0_A": ParameterSpec(value=1e-12, lower=1e-30),
            "n": ParameterSpec(value=1.5, lower=0.5),
        },
    )
    warnings = validate_model_spec(ModelSpec(series=[comp]))
    assert any(w.code == "incoherent_location_placement" and w.severity == "error" for w in warnings)
    assert any(w.code == "incoherent_location_evaluation_form" and w.severity == "error" for w in warnings)


def test_validation_rejects_parallel_component_with_series_placement():
    comp = ComponentSpec(
        id="bad_parallel_series",
        location="parallel",
        function_type="constant_rs",
        law_id="ohmic",
        evaluation_form="voltage_drop",
        placement="series_voltage_drop",
        params={"Rs_ohm": ParameterSpec(value=10.0, lower=0.0)},
    )
    warnings = validate_model_spec(ModelSpec(parallel=[comp]))
    assert any(w.code == "incoherent_location_placement" and w.severity == "error" for w in warnings)
    assert any(w.code == "incoherent_location_evaluation_form" and w.severity == "error" for w in warnings)


def test_duplicate_unidentifiable_component_is_error():
    def diode(id_: str) -> ComponentSpec:
        return ComponentSpec(
            id=id_,
            location="core",
            function_type="diode",
            law_id="shockley_diode",
            evaluation_form="current_branch",
            placement="junction_current_branch",
            polarity="forward",
            params={
                "I0_A": ParameterSpec(value=1e-12, lower=1e-30),
                "n": ParameterSpec(value=1.5, lower=0.5),
            },
        )
    warnings = validate_model_spec(ModelSpec(core=[diode("D1"), diode("D2")]))
    assert any(w.code == "duplicate_unidentifiable_component" and w.severity == "error" for w in warnings)
