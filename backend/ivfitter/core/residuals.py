"""Range selection and residual weighting helpers."""

from __future__ import annotations

import numpy as np
from .model_spec import FitRequest


def select_range(request: FitRequest):
    v = np.asarray(request.trace.voltage_V, dtype=float)
    i = np.asarray(request.trace.current_A, dtype=float)
    mask = np.ones(v.shape, dtype=bool)
    if request.config.v_min is not None:
        mask &= v >= request.config.v_min
    if request.config.v_max is not None:
        mask &= v <= request.config.v_max
    return v[mask], i[mask], mask


def compliance_mask(i: np.ndarray, enabled: bool) -> np.ndarray:
    if not enabled or len(i) < 8:
        return np.zeros(i.shape, dtype=bool)
    a = np.abs(i)
    high = np.quantile(a, 0.98)
    if high <= 0:
        return np.zeros(i.shape, dtype=bool)
    return a >= 0.995 * high


def weighted_residual(y_fit, y_meas, weighting: str, floor_A: float = 1e-15):
    if weighting == "symmetric_log_signed":
        scale = np.maximum(np.maximum(np.abs(y_fit), np.abs(y_meas)), max(float(floor_A), 1e-30))
        return (y_fit - y_meas) / scale
    return y_fit - y_meas
