"""Equation, law/form/placement, and topology summary generation."""

from __future__ import annotations

from .model_spec import EquationSummary, ModelSpec
from .topology_graph import assemble_graph, graph_text_summary
from .component_registry import registry_by_function



def _component_equation(comp) -> str:
    nick = comp.metadata.get("nickname") or comp.id
    if comp.function_type == "photocurrent_constant":
        return f"I_{nick} = direction_sign * Iph0"
    if comp.function_type == "photocurrent_voltage_dependent":
        return f"I_{nick}(V_j) = direction_sign * [Iph0*(1 + gain_per_V*|V_j|) + Aph*sp((|V_j|-Vt_ph)/Vs_ph)^m_ph]"
    if comp.function_type == "photoconductive_branch":
        return f"I_{nick} = Gph * V_j"
    if comp.function_type == "series_diode_barrier":
        return f"V_drop,{nick} = n V_T ln(I/I0 + 1)"
    if comp.function_type == "photo_modulated_main_path":
        return f"V_drop,{nick} = I * R0/(1 + photo_gain)"
    definition = registry_by_function().get(comp.function_type)
    return definition.equation_template if definition else comp.function_type


def _branch_symbol(comp) -> str:
    nick = comp.metadata.get("nickname") or comp.id
    if comp.function_type == "diode":
        return f"I_{nick}"
    if comp.function_type in {"photocurrent_constant", "photocurrent_voltage_dependent"}:
        return f"I_{nick}"
    if comp.function_type == "photoconductive_branch":
        return f"I_{nick}"
    if comp.function_type in {"shunt", "constant_rs"}:
        return f"I_{nick}"
    return f"I_{nick}"

def _law_line(comp) -> str:
    definition = registry_by_function().get(comp.function_type)
    law = comp.law_id or (definition.law_id if definition else comp.function_type)
    form = comp.evaluation_form or (definition.default_form if definition else "auto")
    placement = comp.placement or (definition.default_placement if definition else "auto")
    equation = _component_equation(comp)
    nickname = comp.metadata.get("nickname") or comp.id
    param_text = ", ".join(f"{getattr(spec, 'label', None) or name}={spec.value:g}{spec.unit or ''}" for name, spec in comp.params.items())
    if form == "voltage_drop":
        role = "main-path voltage drop: it changes V_j before branch currents are evaluated"
    elif form == "current_branch":
        role = "branch current: it adds to terminal current at the component voltage"
    elif form == "conductance_modifier":
        role = "series-path modifier: it changes an existing voltage-drop path"
    else:
        role = "implicit/custom relation"
    return f"{comp.id}: nick={nickname}; law={law}; form={form}; placement={placement}; {role}; {equation}; parameters: {param_text}"


def _equivalent_circuit_line(model: ModelSpec) -> str:
    series = " + ".join(c.id for c in model.series) or "no main-path drop"
    branches = " || ".join([c.id for c in [*model.core, *model.parallel]]) or "no current branch"
    return f"Equivalent circuit: terminal+ -> [{series}] -> junction; junction branches to terminal-: {branches}."


def _solution_line(model: ModelSpec) -> str:
    branch_ids = ", ".join(c.id for c in [*model.core, *model.parallel]) or "branch terms"
    series_ids = ", ".join(c.id for c in model.series) or "0"
    return f"How it is solved: for each V_ext, solve F(I)=I - Σ I_branch(V_ext - ΣV_drop(I)) = 0 using series terms [{series_ids}] and branch terms [{branch_ids}]."


def generate_equations(model: ModelSpec) -> EquationSummary:
    """Generate display equations grouped by model role plus topology."""
    eq = EquationSummary(
        title="Composite IV model with Law / Form / Placement semantics",
        voltage_relation=[
            _equivalent_circuit_line(model),
            "Generic one-junction composite: V_j = V_ext - Σ V_drop,k(I)",
            "Terminal current: I = " + (" + ".join(_branch_symbol(c) for c in [*model.core, *model.parallel]) or "0"),
            "Model-specific branch laws: " + ("; ".join(_component_equation(c) for c in [*model.core, *model.parallel]) or "no current branches"),
            "Model-specific main path: " + ("; ".join(_component_equation(c) for c in model.series) or "no main-path voltage drop"),
            _solution_line(model),
        ],
        auxiliary=[
            "Law = mathematical relation, e.g. Ohmic: V = I R ⇔ I = V/R.",
            "Form = evaluation form, e.g. voltage_drop or current_branch.",
            "Placement = topology connection, e.g. main path or junction branch.",
            "V_T = k_B T / q; sp(x)=ln(1+e^x); S(x)=1/(1+e^{-x}).",
        ],
    )
    for comp in model.core:
        eq.core.append(_law_line(comp))
    for comp in model.series:
        eq.series.append(_law_line(comp))
    for comp in model.parallel:
        eq.parallel.append(_law_line(comp))
    graph = assemble_graph(model)
    eq.topology = graph_text_summary(graph)
    return eq
