import numpy as np

from ivfitter.core.fitting_engine import fit_trace, predict_current
from ivfitter.core.model_spec import (
    ComponentSpec,
    FitConfig,
    FitRequest,
    GraphComponent,
    GraphNode,
    GraphSpec,
    ModelSpec,
    ParameterSpec,
    TraceData,
)


def _simple_graph_component(polarity="forward"):
    return GraphComponent(
        id="Icustom",
        function_type="custom",
        law_id="custom_expression",
        evaluation_form="current_branch",
        placement="parallel_current_branch",
        node_pos="V",
        node_neg="GND",
        polarity=polarity,
        params={"A": ParameterSpec(value=2e-6, fit=False, unit="A/V")},
        metadata={"behavior": "I_of_V", "expression": "A*exp(V)", "templateKey": "custom", "source": "schematic_v3"},
    )


def test_graph_dc_reverse_polarity_changes_custom_branch_orientation():
    forward = ModelSpec(
        graph=GraphSpec(
            terminals=["V"],
            reference_node="GND",
            nodes=[GraphNode(id="V", role="terminal"), GraphNode(id="GND", role="reference")],
            components=[_simple_graph_component("forward")],
            schema_version="schematic_v3",
        )
    )
    reverse = ModelSpec(
        graph=GraphSpec(
            terminals=["V"],
            reference_node="GND",
            nodes=[GraphNode(id="V", role="terminal"), GraphNode(id="GND", role="reference")],
            components=[_simple_graph_component("reverse")],
            schema_version="schematic_v3",
        )
    )

    voltage = np.array([1.0])
    assert predict_current(voltage, forward, "graph_dc")[0] > 0
    assert predict_current(voltage, reverse, "graph_dc")[0] < 0


def test_graph_dc_fit_uses_graph_params_not_legacy_ghost_params():
    legacy = ComponentSpec(
        id="Rsh",
        location="parallel",
        function_type="shunt",
        placement="parallel_current_branch",
        params={"Rsh_ohm": ParameterSpec(value=1.0, lower=0.1, upper=10.0, fit=True, unit="ohm")},
    )
    graph = GraphSpec(
        terminals=["V"],
        reference_node="GND",
        nodes=[GraphNode(id="V", role="terminal"), GraphNode(id="GND", role="reference")],
        components=[
            GraphComponent(
                id="Rsh",
                function_type="custom",
                law_id="custom_expression",
                evaluation_form="current_branch",
                placement="parallel_current_branch",
                node_pos="V",
                node_neg="GND",
                polarity="forward",
                params={"Rsh": ParameterSpec(value=5e5, lower=1e3, upper=1e9, fit=True, unit="ohm")},
                metadata={"behavior": "R_of_V", "expression": "Rsh", "templateKey": "resistance", "source": "schematic_v3"},
            )
        ],
        schema_version="schematic_v3",
    )
    model = ModelSpec(parallel=[legacy], graph=graph)
    voltage = [-1.0, -0.5, 0.0, 0.5, 1.0]
    current = [v / 1e6 for v in voltage]

    result = fit_trace(
        FitRequest(
            trace=TraceData(voltage_V=voltage, current_A=current, trace_id="graph-contract"),
            model=model,
            config=FitConfig(solver_mode="graph_dc", exclude_compliance=False, max_nfev=80),
        )
    )

    assert "Rsh.Rsh" in result.parameters
    assert "Rsh.Rsh_ohm" not in result.parameters
    assert abs(result.parameters["Rsh.Rsh"].value - 1e6) / 1e6 < 1e-2
