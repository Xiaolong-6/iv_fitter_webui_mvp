import numpy as np

from ivfitter.core.fitting_engine import predict_current
from ivfitter.core.model_spec import ComponentSpec, FitConfig, GraphComponent, GraphNode, GraphSpec, ModelSpec, ParameterSpec
from ivfitter.core.graph_solver import solve_graph_current


def p(value, fit=False):
    return ParameterSpec(value=value, fit=fit)


def test_graph_solver_supports_custom_r_of_v_edge():
    model = ModelSpec(
        core=[], series=[], parallel=[], temperature_K=300.0,
        graph=GraphSpec(
            terminals=["anode", "cathode"], reference_node="cathode",
            nodes=[GraphNode(id="anode", role="terminal"), GraphNode(id="cathode", role="reference")],
            components=[GraphComponent(
                id="Rcustom", function_type="custom", law_id="custom_expression",
                evaluation_form="current_branch", placement="parallel_current_branch",
                node_pos="anode", node_neg="cathode",
                params={"R0": p(10.0), "A": p(0.0)},
                metadata={"behavior": "R_of_V", "expression": "R0 + A*V"},
            )],
        ),
    )
    v = np.array([0.0, 1.0, 2.0])
    i, branches = solve_graph_current(v, model)
    assert np.allclose(i, v / 10.0)
    assert np.allclose(branches["Rcustom"], v / 10.0)


def test_graph_solver_supports_custom_i_of_v_parallel_branches():
    model = ModelSpec(
        graph=GraphSpec(
            terminals=["anode", "cathode"], reference_node="cathode",
            nodes=[GraphNode(id="anode", role="terminal"), GraphNode(id="cathode", role="reference")],
            components=[
                GraphComponent(
                    id="G1", function_type="custom", law_id="custom_expression", evaluation_form="current_branch",
                    placement="parallel_current_branch", node_pos="anode", node_neg="cathode",
                    params={"G": p(0.1)}, metadata={"behavior": "I_of_V", "expression": "G*V"},
                ),
                GraphComponent(
                    id="G2", function_type="custom", law_id="custom_expression", evaluation_form="current_branch",
                    placement="parallel_current_branch", node_pos="anode", node_neg="cathode",
                    params={"G": p(0.2)}, metadata={"behavior": "I_of_V", "expression": "G*V"},
                ),
            ],
        ),
    )
    current = predict_current(np.array([1.0, 2.0]), model, solver_mode="graph_dc")
    assert np.allclose(current, [0.3, 0.6])


def test_graph_solver_supports_custom_dv_of_i():
    model = ModelSpec(
        graph=GraphSpec(
            terminals=["anode", "cathode"], reference_node="cathode",
            nodes=[GraphNode(id="anode", role="terminal"), GraphNode(id="cathode", role="reference")],
            components=[GraphComponent(
                id="Rdrop", function_type="custom", law_id="custom_expression", evaluation_form="voltage_drop",
                placement="series_voltage_drop", node_pos="anode", node_neg="cathode",
                params={"R0": p(5.0)}, metadata={"behavior": "dV_of_I", "expression": "I*R0"},
            )],
        ),
    )
    current = predict_current(np.array([0.0, 5.0, 10.0]), model, solver_mode="graph_dc")
    assert np.allclose(current, [0.0, 1.0, 2.0], equal_nan=False)
