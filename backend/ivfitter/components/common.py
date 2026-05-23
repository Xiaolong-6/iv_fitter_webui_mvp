"""Shared numerical helpers for IV model components."""

from __future__ import annotations

import numpy as np

K_B = 1.380649e-23
Q_E = 1.602176634e-19


def thermal_voltage(temp_k: float) -> float:
    """Return kT/q in volts at temperature temp_k."""
    return K_B * float(temp_k) / Q_E


def softplus(x):
    """Numerically stable softplus function."""
    x = np.asarray(x, dtype=float)
    return np.log1p(np.exp(-np.abs(x))) + np.maximum(x, 0)


def sigmoid(x):
    """Numerically stable logistic function."""
    x = np.asarray(x, dtype=float)
    return np.where(x >= 0, 1 / (1 + np.exp(-x)), np.exp(x) / (1 + np.exp(x)))
