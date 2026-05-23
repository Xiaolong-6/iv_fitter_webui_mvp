"""ModelSpec validation with physics-oriented and UX-transparent warnings."""

from __future__ import annotations

from collections import Counter
from math import isfinite

from .component_registry import registry_by_key, registry_by_function
from .model_spec import ComponentSpec, FitWarning, ModelSpec


def _warn(code: str, message: str, severity: str = "warning") -> FitWarning:
    return FitWarning(code=code, message=message, severity=severity)  # type: ignore[arg-type]


def _component_groups(model: ModelSpec):
    for group_name in ("core", "series", "parallel"):
        for comp in getattr(model, group_name):
            yield group_name, comp


def validate_component_against_registry(comp: ComponentSpec) -> list[FitWarning]:
    """Validate one component against registry location, polarity, and parameter rules."""
    warnings: list[FitWarning] = []
    definition = registry_by_function().get(comp.function_type) or registry_by_key().get((comp.location, comp.function_type))
    if definition is None:
        return [_warn("unknown_function", f"{comp.id}: unknown function {comp.function_type}.", "error")]
    allowed = set(definition.allowed_polarities or [])
    placement = comp.placement or definition.default_placement
    if placement not in set(definition.allowed_placements):
        warnings.append(_warn("unsupported_placement", f"{comp.id}: {comp.function_type} cannot be placed as {placement!r}.", "error"))
    if allowed and comp.polarity not in allowed:
        warnings.append(_warn("unsupported_polarity", f"{comp.id}: {comp.function_type} does not allow polarity {comp.polarity!r}.", "error"))
    expected = {p.name for p in definition.parameters}
    missing = expected - set(comp.params)
    for name in sorted(missing):
        warnings.append(_warn("missing_parameter", f"{comp.id}: missing parameter {name}.", "error"))
    for name, spec in comp.params.items():
        if not isfinite(float(spec.value)):
            warnings.append(_warn("nonfinite_parameter", f"{comp.id}.{name} is not finite.", "error"))
        if spec.lower is not None and spec.value < spec.lower:
            warnings.append(_warn("parameter_below_lower", f"{comp.id}.{name} is below its lower bound.", "error"))
        if spec.upper is not None and spec.value > spec.upper:
            warnings.append(_warn("parameter_above_upper", f"{comp.id}.{name} is above its upper bound.", "error"))
        if name in {"Vs_V", "Vslope_V", "w_V", "n", "Rsh_ohm"} and spec.value <= 0:
            warnings.append(_warn("nonpositive_physical_parameter", f"{comp.id}.{name} should be positive for a physically meaningful model.", "error"))
    if comp.function_type == "soft_breakdown" and comp.polarity != "reverse":
        warnings.append(_warn("breakdown_polarity", f"{comp.id}: soft_breakdown is defined only as a reverse-bias leakage/breakdown branch.", "error"))
    return warnings


def _duplicate_signature(comp: ComponentSpec):
    # Same law/form/placement/polarity generally means the parameters are not identifiable.
    # Two diode branches can be intentionally used as a two-diode model only when users
    # give them distinct role/nickname labels.
    form = comp.evaluation_form or "auto"
    placement = comp.placement or "auto"
    polarity = comp.polarity or "none"
    law = comp.law_id or comp.function_type
    return (law, form, placement, polarity)


def validate_model_spec(model: ModelSpec) -> list[FitWarning]:
    """Return all schema, physics, and transparency warnings for a ModelSpec."""
    warnings: list[FitWarning] = []
    if model.temperature_K <= 0:
        warnings.append(_warn("nonpositive_temperature", "Temperature must be greater than 0 K for a physically meaningful diode model.", "error"))
    ids = [comp.id for _group, comp in _component_groups(model)]
    for comp_id, count in Counter(ids).items():
        if count > 1:
            warnings.append(_warn("duplicate_component_id", f"Component id {comp_id!r} appears {count} times.", "error"))
    signatures = Counter(_duplicate_signature(comp) for _group, comp in _component_groups(model))
    for sig, count in signatures.items():
        if count <= 1:
            continue
        law, form, placement, polarity = sig
        # Allow an intentional two-diode branch model when the two branches have distinct nicknames.
        matching = [comp for _group, comp in _component_groups(model) if _duplicate_signature(comp) == sig]
        nicknames = {str(comp.metadata.get("nickname") or comp.id) for comp in matching}
        is_two_diode_role = law == "shockley_diode" and form == "current_branch" and len(nicknames) == count and count <= 2
        if not is_two_diode_role:
            warnings.append(_warn(
                "duplicate_unidentifiable_component",
                f"{count} components share the same law/form/placement/polarity ({law}, {form}, {placement}, {polarity}). Remove duplicates or give them distinct polarity/role.",
                "warning",
            ))
    if not model.core:
        warnings.append(_warn("no_core", "Model has no core junction component."))
    if not any(c.function_type == "constant_rs" for c in model.series):
        warnings.append(_warn("no_rs", "Model has no constant Rs baseline.", "info"))
    for group_name, comp in _component_groups(model):
        if comp.location != group_name:
            warnings.append(_warn("location_mismatch", f"{comp.id}: stored in {group_name} but declares location {comp.location}.", "error"))
        warnings.extend(validate_component_against_registry(comp))
        if comp.function_type == "custom":
            expr = str(comp.metadata.get("expression", "")).strip()
            if not expr:
                warnings.append(_warn("custom_no_expression", f"{comp.id}: custom branch has no expression.", "error"))
            else:
                warnings.append(_warn("custom_expression", f"{comp.id}: custom expression is fitted but should be documented in exported results.", "info"))
    return warnings
