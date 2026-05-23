import numpy as np

from ivfitter.core.fitting_engine import predict_current
from ivfitter.core.model_spec import ComponentSpec, ModelSpec, ParameterSpec
from ivfitter.core.topology_graph import assemble_graph


def test_topology_graph_assembly_has_nodes_and_placements():
    model = ModelSpec(
        core=[ComponentSpec(id="D1", location="core", function_type="diode", placement="junction_current_branch", params={"I0_A": ParameterSpec(value=1e-12), "n": ParameterSpec(value=1.5)})],
        series=[ComponentSpec(id="Rs", location="series", function_type="constant_rs", placement="series_voltage_drop", params={"Rs_ohm": ParameterSpec(value=10.0)})],
        parallel=[ComponentSpec(id="Rsh", location="parallel", function_type="shunt", placement="parallel_current_branch", params={"Rsh_ohm": ParameterSpec(value=1e9)})],
    )
    graph = assemble_graph(model)
    assert any(n.id == "junction" for n in graph.nodes)
    assert any(c.placement == "series_voltage_drop" for c in graph.components)


def test_graph_solver_matches_ohmic_shunt_without_series():
    model = ModelSpec(
        parallel=[ComponentSpec(id="Rsh", location="parallel", function_type="shunt", placement="parallel_current_branch", params={"Rsh_ohm": ParameterSpec(value=1e6)})],
    )
    v = np.array([-1.0, 0.0, 1.0])
    i = predict_current(v, model, "graph_dc")
    assert np.allclose(i, v / 1e6)

from ivfitter.core.fitting_engine import fit_trace
from ivfitter.core.model_spec import FitConfig, FitRequest, TraceData


def test_graph_dc_not_reportable_warning_is_error():
    model = ModelSpec(
        parallel=[ComponentSpec(id="Rsh", location="parallel", function_type="shunt", placement="parallel_current_branch", params={"Rsh_ohm": ParameterSpec(value=1e6)})],
    )
    trace = TraceData(voltage_V=[-1.0, 0.0, 1.0], current_A=[-1e-6, 0.0, 1e-6])
    result = fit_trace(FitRequest(trace=trace, model=model, config=FitConfig(solver_mode="graph_dc", exclude_compliance=False)))
    assert any(w.code == "graph_solver" and w.severity == "error" for w in result.warnings)
