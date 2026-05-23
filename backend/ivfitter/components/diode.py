"""Core diode current components."""

from __future__ import annotations

import numpy as np
from .common import thermal_voltage


def diode_current(vj, i0: float, n: float, temp_k: float):
    """Return Shockley diode current for junction voltage vj."""
    vt = thermal_voltage(temp_k)
    n_safe = max(float(n), 1e-9)
    arg = np.clip(np.asarray(vj, dtype=float) / (n_safe * vt), -700, 80)
    return float(i0) * np.expm1(arg)
