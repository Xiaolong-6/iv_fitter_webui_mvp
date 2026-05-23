from ivfitter.core.component_registry import component_registry
from ivfitter.core.model_spec import ComponentSpec, ModelSpec, ParameterSpec
from ivfitter.core.topology_graph import assemble_graph
from ivfitter.core.fitting_engine import predict_current
from ivfitter.io.import_trace import ImportCsvTextRequest, import_csv_text


def test_ohmic_law_supports_voltage_drop_and_current_forms():
    entries = [e for e in component_registry() if e.law_id == "ohmic"]
    assert entries
    forms = {form for entry in entries for form in entry.available_forms}
    assert {"voltage_drop", "current_branch"}.issubset(forms)


def test_rs_and_rsh_share_ohmic_law_in_topology():
    model = ModelSpec(
        series=[ComponentSpec(id="Rs", location="series", function_type="constant_rs", law_id="ohmic", evaluation_form="voltage_drop", placement="series_voltage_drop", params={"Rs_ohm": ParameterSpec(value=10)})],
        parallel=[ComponentSpec(id="Rsh", location="parallel", function_type="shunt", law_id="ohmic", evaluation_form="current_branch", placement="parallel_current_branch", params={"Rsh_ohm": ParameterSpec(value=1e6)})],
    )
    graph = assemble_graph(model)
    laws = {c.id: c.law_id for c in graph.components}
    assert laws["Rs"] == "ohmic"
    assert laws["Rsh"] == "ohmic"


def test_happymeasure_style_import_columns():
    text = "# HappyMeasure export\nSweep index,Source Voltage (V),Measured Current (A),Time (s)\n0,0,0,0\n1,1,1e-9,0.1\n2,2,2e-9,0.2\n"
    trace, quality = import_csv_text(ImportCsvTextRequest(text=text))
    assert trace.voltage_V == [0.0, 1.0, 2.0]
    assert trace.current_A == [0.0, 1e-9, 2e-9]
    assert "Voltage" in quality.voltage_col or "voltage" in quality.voltage_col.lower()


def test_constant_rs_can_be_used_as_branch_ohmic_current_law():
    model = ModelSpec(parallel=[ComponentSpec(id="R", location="parallel", function_type="constant_rs", law_id="ohmic", evaluation_form="current_branch", placement="parallel_current_branch", params={"Rs_ohm": ParameterSpec(value=1e6)})])
    out = predict_current([0, 1], model, "legacy_composite")
    assert abs(out[1] - 1e-6) < 1e-12
