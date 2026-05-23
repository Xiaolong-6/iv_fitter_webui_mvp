"""Polarity transforms shared by built-in and custom functions."""

from __future__ import annotations

import numpy as np


def polarity_argument(vj, vt: float, vs: float, polarity: str):
    """Return normalized turn-on argument u for forward, reverse, or symmetric polarity."""
    vs_safe = max(float(vs), 1e-15)
    vj_arr = np.asarray(vj, dtype=float)
    if polarity == "forward":
        return (vj_arr - vt) / vs_safe
    if polarity == "reverse":
        return (-vj_arr - vt) / vs_safe
    if polarity == "symmetric":
        return (np.abs(vj_arr) - vt) / vs_safe
    raise ValueError(f"Unsupported polarity: {polarity}")


def polarity_sign(vj, polarity: str):
    """Return current sign convention for branch functions with a polarity."""
    vj_arr = np.asarray(vj, dtype=float)
    if polarity == "forward":
        return np.ones_like(vj_arr)
    if polarity == "reverse":
        return -np.ones_like(vj_arr)
    if polarity == "symmetric":
        return np.sign(vj_arr)
    raise ValueError(f"Unsupported polarity: {polarity}")
