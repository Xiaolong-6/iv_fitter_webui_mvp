import numpy as np

from ivfitter.core.metrics import fit_metrics


def test_log_mae_excludes_near_zero_points():
    y_meas = np.array([0.0, 1e-15, 1e-9, 1e-6])
    y_fit = np.array([1e-3, 1e-3, 1.1e-9, 1.1e-6])
    metrics = fit_metrics(y_fit, y_meas, floor_A=1e-12)
    assert metrics["log_points_excluded"] == 2.0
    assert metrics["log_magnitude_mae_decades"] < 0.1
    assert metrics["log_floor_A"] == 1e-12
