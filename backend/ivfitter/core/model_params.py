"""Shared accessors for component parameter values."""

from __future__ import annotations


def param_value(comp, name: str, default: float = 0.0) -> float:
    spec = comp.params.get(name)
    return float(spec.value) if spec is not None else default
