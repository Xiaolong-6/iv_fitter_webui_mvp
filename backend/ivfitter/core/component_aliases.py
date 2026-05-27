"""Canonical component ids and legacy aliases."""

from __future__ import annotations

BIAS_DEPENDENT_CURRENT = "bias_dependent_current"
LEGACY_VOLTAGE_DEPENDENT_PHOTOCURRENT = "photocurrent_voltage_dependent"
LEGACY_ALT_VOLTAGE_DEPENDENT_PHOTOCURRENT = "voltage_dependent_photocurrent"

BIAS_DEPENDENT_CURRENT_TYPES = {
    BIAS_DEPENDENT_CURRENT,
    LEGACY_VOLTAGE_DEPENDENT_PHOTOCURRENT,
    LEGACY_ALT_VOLTAGE_DEPENDENT_PHOTOCURRENT,
}

FUNCTION_TYPE_ALIASES = {
    LEGACY_VOLTAGE_DEPENDENT_PHOTOCURRENT: BIAS_DEPENDENT_CURRENT,
    LEGACY_ALT_VOLTAGE_DEPENDENT_PHOTOCURRENT: BIAS_DEPENDENT_CURRENT,
}


def canonical_function_type(function_type: str) -> str:
    return FUNCTION_TYPE_ALIASES.get(function_type, function_type)


def canonical_law_id(law_id: str | None, function_type: str) -> str:
    if law_id in {LEGACY_VOLTAGE_DEPENDENT_PHOTOCURRENT, LEGACY_ALT_VOLTAGE_DEPENDENT_PHOTOCURRENT}:
        return BIAS_DEPENDENT_CURRENT
    return law_id or canonical_function_type(function_type)
