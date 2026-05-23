"""Topology graph assembly from legacy ModelSpec groups.

This module is deliberately explicit: functions are equation laws; component
instances place those laws between named nodes.
"""

from __future__ import annotations

from .model_spec import ComponentSpec, GraphComponent, GraphNode, GraphSpec, ModelSpec, Placement
from .component_registry import registry_by_function


def _default_placement(comp: ComponentSpec) -> Placement:
    if comp.placement:
        return comp.placement
    definition = registry_by_function().get(comp.function_type)
    if definition:
        return definition.default_placement  # type: ignore[return-value]
    if comp.location == "series":
        return "series_voltage_drop"
    if comp.location == "core":
        return "junction_current_branch"
    return "parallel_current_branch"


def _nodes_for(comp: ComponentSpec, has_series_drop: bool) -> tuple[str, str]:
    if comp.node_pos and comp.node_neg:
        return comp.node_pos, comp.node_neg
    placement = _default_placement(comp)
    if placement == "series_voltage_drop":
        return "anode", "junction"
    if placement == "series_conductance_modifier":
        return "anode", "junction"
    if has_series_drop:
        return "junction", "cathode"
    return "anode", "cathode"


def assemble_graph(model: ModelSpec) -> GraphSpec:
    """Assemble a transparent DC topology graph from ModelSpec."""
    has_series_drop = any(_default_placement(c) == "series_voltage_drop" for c in model.series)
    node_ids = {"anode", "cathode"}
    if has_series_drop:
        node_ids.add("junction")
    components: list[GraphComponent] = []
    notes = ["Law/Form/Placement semantics: a law is a mathematical relation; a form says current vs voltage-drop evaluation; placement defines topology."]
    for comp in [*model.series, *model.core, *model.parallel]:
        placement = _default_placement(comp)
        if placement == "series_conductance_modifier":
            notes.append(f"{comp.id} modifies the effective series path and is not an independent graph edge.")
        npos, nneg = _nodes_for(comp, has_series_drop)
        node_ids.update([npos, nneg])
        definition = registry_by_function().get(comp.function_type)
        components.append(GraphComponent(
            id=comp.id,
            function_type=comp.function_type,
            law_id=comp.law_id or (definition.law_id if definition else None),
            evaluation_form=comp.evaluation_form or (definition.default_form if definition else None),
            placement=placement,
            node_pos=npos,
            node_neg=nneg,
            polarity=comp.polarity,
            params=comp.params,
            metadata=comp.metadata,
        ))
    nodes = []
    for node in sorted(node_ids):
        role = "terminal" if node == "anode" else "reference" if node == "cathode" else "internal"
        label = "External + terminal" if node == "anode" else "External reference terminal" if node == "cathode" else "Internal junction node"
        nodes.append(GraphNode(id=node, label=label, role=role))
    return GraphSpec(nodes=nodes, components=components, assembly_notes=notes)


def graph_text_summary(graph: GraphSpec) -> list[str]:
    """Return user-readable graph edges."""
    lines = [f"Terminals: {', '.join(graph.terminals)}; reference: {graph.reference_node}."]
    for comp in graph.components:
        lines.append(f"{comp.id}: law={comp.law_id or comp.function_type} | form={comp.evaluation_form or 'auto'} | placement={comp.placement} | {comp.node_pos} → {comp.node_neg}")
    lines.extend(graph.assembly_notes)
    return lines
