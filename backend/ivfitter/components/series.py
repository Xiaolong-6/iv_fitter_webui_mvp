"""Series-path modifiers for effective series resistance."""

from __future__ import annotations

import numpy as np
from .common import softplus
from ivfitter.core.polarity import polarity_argument


def softplus_conductance_boost(vj, A: float, Vt_V: float, Vs_V: float, polarity: str):
    """Return conductance-like boost G=A*softplus(u)."""
    u = polarity_argument(vj, Vt_V, Vs_V, polarity)
    return float(A) * softplus(u)


def apply_conductance_boost(rs_eff, boost):
    """Apply Rs_eff <- Rs_eff/(1+boost) while keeping positive finite values."""
    rs = np.asarray(rs_eff, dtype=float)
    g = np.maximum(np.asarray(boost, dtype=float), -0.999999)
    return np.maximum(rs / (1.0 + g), 1e-12)
