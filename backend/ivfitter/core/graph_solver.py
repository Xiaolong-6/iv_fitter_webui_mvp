"""Experimental DC topology graph solver.

This is not a full SPICE engine. It solves DC KCL for the graph assembled
from the current ModelSpec: terminal anode is biased at Vext, cathode is
the reference node, and internal node voltages are solved by KCL.
"""

from __future__ import annotations

import numpy as np
from scipy.optimize import root

from ivfitter.components.diode import diode_current
from ivfitter.components.parallel import shunt_current, power_law_current, soft_breakdown_current
from ivfitter.components.custom import evaluate_custom_expression
from .model_spec import GraphComponent, ModelSpec
from .topology_graph import assemble_graph


def _p(comp: GraphComponent, name: str, default: float = 0.0) -> float:
    spec = comp.params.get(name)
    return float(spec.value) if spec is not None else default


def _edge_current(comp: GraphComponent, v_component: np.ndarray, temperature_K: float) -> np.ndarray:
    ft = comp.function_type
    if ft == "diode":
        return diode_current(v_component, _p(comp, "I0_A", 1e-12), _p(comp, "n", 1.5), temperature_K)
    if ft == "shunt":
        return shunt_current(v_component, _p(comp, "Rsh_ohm", _p(comp, "Rs_ohm", 1e30)))
    if ft == "constant_rs":
        # Registry parameter name retained as Rs_ohm even when used as a generic ohmic law.
        r = max(_p(comp, "Rs_ohm", _p(comp, "Rsh_ohm", 1e30)), 1e-30)
        return v_component / r
    if ft == "power_law":
        return power_law_current(v_component, _p(comp, "A", 0.0), _p(comp, "Vt_V", 0.0), _p(comp, "Vs_V", 1.0), _p(comp, "m", 1.0), comp.polarity or "forward")
    if ft == "soft_breakdown":
        return soft_breakdown_current(v_component, _p(comp, "I0_A", 0.0), _p(comp, "Vbr_V", 10.0), _p(comp, "Vslope_V", 1.0), _p(comp, "w_V", 0.5))
    if ft == "custom":
        expr = comp.metadata.get("expression", "s*A*softplus(u)**m")
        params = {name: spec.value for name, spec in comp.params.items()}
        return evaluate_custom_expression(v_component, str(expr), params, comp.polarity or "forward")
    return np.zeros_like(v_component, dtype=float)


def _solve_one(v_ext: float, model: ModelSpec, guess: np.ndarray | None = None) -> tuple[float, dict[str, float], np.ndarray]:
    graph = assemble_graph(model)
    internal = [n.id for n in graph.nodes if n.role == "internal"]
    node_index = {node: idx for idx, node in enumerate(internal)}
    def voltages(x: np.ndarray) -> dict[str, float]:
        vals = {"anode": float(v_ext), "cathode": 0.0}
        vals.update({node: float(x[idx]) for node, idx in node_index.items()})
        return vals
    if not internal:
        vals = {"anode": float(v_ext), "cathode": 0.0}
        total = 0.0
        branches = {}
        for comp in graph.components:
            if comp.placement == "series_conductance_modifier":
                continue
            cur = float(_edge_current(comp, np.array([vals[comp.node_pos] - vals[comp.node_neg]]), model.temperature_K)[0])
            branches[comp.id] = cur
            if comp.node_pos == "anode": total += cur
            elif comp.node_neg == "anode": total -= cur
        return total, branches, np.array([])
    def residual(x: np.ndarray) -> np.ndarray:
        vals = voltages(x)
        kcl = np.zeros(len(internal), dtype=float)
        for comp in graph.components:
            if comp.placement == "series_conductance_modifier":
                continue
            vp = vals.get(comp.node_pos, 0.0)
            vn = vals.get(comp.node_neg, 0.0)
            cur = float(_edge_current(comp, np.array([vp - vn]), model.temperature_K)[0])
            if comp.node_pos in node_index:
                kcl[node_index[comp.node_pos]] += cur
            if comp.node_neg in node_index:
                kcl[node_index[comp.node_neg]] -= cur
        return kcl
    x0 = guess if guess is not None and len(guess) == len(internal) else np.full(len(internal), v_ext / 2.0)
    sol = root(residual, x0, method="hybr")
    if not (sol.success and np.all(np.isfinite(sol.x)) and np.all(np.isfinite(residual(sol.x)))):
        branches = {comp.id: float("nan") for comp in graph.components if comp.placement != "series_conductance_modifier"}
        return float("nan"), branches, x0
    x = sol.x
    vals = voltages(x)
    total = 0.0
    branches = {}
    for comp in graph.components:
        if comp.placement == "series_conductance_modifier":
            continue
        cur = float(_edge_current(comp, np.array([vals[comp.node_pos] - vals[comp.node_neg]]), model.temperature_K)[0])
        branches[comp.id] = cur
        if comp.node_pos == "anode": total += cur
        elif comp.node_neg == "anode": total -= cur
    return total, branches, x


def solve_graph_current(voltage_v, model: ModelSpec) -> tuple[np.ndarray, dict[str, np.ndarray]]:
    currents = []
    branch_lists: dict[str, list[float]] = {}
    guess = None
    for v in np.asarray(voltage_v, dtype=float):
        total, branches, guess = _solve_one(float(v), model, guess)
        currents.append(total)
        for key, value in branches.items():
            branch_lists.setdefault(key, []).append(value)
        for key in list(branch_lists):
            if key not in branches:
                branch_lists[key].append(0.0)
    return np.asarray(currents, dtype=float), {k: np.asarray(vals, dtype=float) for k, vals in branch_lists.items()}
