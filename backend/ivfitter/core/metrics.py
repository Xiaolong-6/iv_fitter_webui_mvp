"""Fit metric and covariance helpers."""

from __future__ import annotations

import numpy as np


def fit_metrics(y_fit, y_meas, floor_A: float = 1e-15):
    residual = y_fit - y_meas
    rmse = float(np.sqrt(np.mean(residual**2))) if len(residual) else float("nan")
    denom = float(np.sqrt(np.mean(y_meas**2))) if len(y_meas) else float("nan")
    ss_res = float(np.sum(residual**2))
    ss_tot = float(np.sum((y_meas - np.mean(y_meas))**2))
    floor = max(float(floor_A), 1e-30)
    log_mask = (np.abs(y_meas) > floor) & np.isfinite(y_meas) & np.isfinite(y_fit)
    log_points_excluded = int(len(y_meas) - int(np.sum(log_mask)))
    if np.any(log_mask):
        log_fit = np.log10(np.maximum(np.abs(y_fit[log_mask]), floor))
        log_meas = np.log10(np.maximum(np.abs(y_meas[log_mask]), floor))
        log_res = log_fit - log_meas
        log_mae = float(np.mean(np.abs(log_res)))
    else:
        log_mae = float("nan")
    return {
        "linear_rmse_A": rmse,
        "normalized_rmse": rmse / denom if denom else float("nan"),
        "linear_r2": 1.0 - ss_res / ss_tot if ss_tot else float("nan"),
        "log_magnitude_mae_decades": log_mae,
        "log_points_excluded": float(log_points_excluded),
        "log_floor_A": floor,
    }


def parameter_stderr(records, jac, residual_vector):
    if jac is None or jac.size == 0 or len(records) == 0 or residual_vector is None:
        return {}
    try:
        n_obs, n_params = jac.shape
        dof = max(n_obs - n_params, 1)
        sigma2 = float(np.sum(np.asarray(residual_vector, dtype=float) ** 2) / dof)
        jtj = jac.T @ jac
        cov = sigma2 * np.linalg.pinv(jtj)
        return {key: float(np.sqrt(max(cov[idx, idx], 0.0))) for idx, (key, *_rest) in enumerate(records)}
    except Exception:
        return {}
