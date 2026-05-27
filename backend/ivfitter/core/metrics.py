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
        log_ss_res = float(np.sum(log_res**2))
        log_ss_tot = float(np.sum((log_meas - np.mean(log_meas))**2))
        log_r2 = 1.0 - log_ss_res / log_ss_tot if log_ss_tot else float("nan")
    else:
        log_mae = float("nan")
        log_r2 = float("nan")
    return {
        "linear_rmse_A": rmse,
        "normalized_rmse": rmse / denom if denom else float("nan"),
        "linear_r2": 1.0 - ss_res / ss_tot if ss_tot else float("nan"),
        "log_magnitude_mae_decades": log_mae,
        "log_magnitude_r2": log_r2,
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
        _u, singular_values, vh = np.linalg.svd(np.asarray(jac, dtype=float), full_matrices=False)
        if singular_values.size == 0:
            return {}
        tol = np.finfo(float).eps * max(n_obs, n_params) * float(singular_values[0])
        inv_s2 = np.array([1.0 / (s * s) if s > tol else 0.0 for s in singular_values], dtype=float)
        cov = sigma2 * ((vh.T * inv_s2) @ vh)
        return {key: float(np.sqrt(max(cov[idx, idx], 0.0))) for idx, (key, *_rest) in enumerate(records)}
    except Exception:
        return {}
