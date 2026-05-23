import numpy as np

from ivfitter.core.fit_quality import evaluate_fit_quality


def test_quality_gate_detects_current_explosion():
    measured = np.array([0.0, 1e-9, 2e-9, 3e-9])
    fitted = np.array([0.0, 1e-9, 1e23, 3e-9])
    ok, warnings = evaluate_fit_quality(fitted, measured, rmse=1e22)
    assert not ok
    assert any(w.severity == "error" for w in warnings)
    assert any(w.code == "quality_fit_current_explosion" for w in warnings)
