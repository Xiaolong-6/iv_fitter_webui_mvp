"""Parallel current branches."""

from __future__ import annotations

import numpy as np
from .common import softplus, sigmoid
from ivfitter.core.polarity import polarity_argument, polarity_sign


def shunt_current(vj, rsh_ohm: float):
    """Return linear shunt/leakage current Vj/Rsh."""
    return np.asarray(vj, dtype=float) / max(float(rsh_ohm), 1e-30)


def power_law_current(vj, A: float, Vt_V: float, Vs_V: float, m: float, polarity: str):
    """Return signed softplus power-law current branch."""
    u = polarity_argument(vj, Vt_V, Vs_V, polarity)
    s = polarity_sign(vj, polarity)
    return s * float(A) * softplus(u) ** float(m)


def soft_breakdown_current(vj, I0_A: float, Vbr_V: float, Vslope_V: float, w_V: float):
    """Return smooth reverse soft-breakdown current."""
    vj = np.asarray(vj, dtype=float)
    arg = np.clip((-vj - float(Vbr_V)) / max(float(Vslope_V), 1e-15), -700, 80)
    gate = sigmoid((-vj - float(Vbr_V)) / max(float(w_V), 1e-15))
    return -float(I0_A) * np.expm1(arg) * gate
