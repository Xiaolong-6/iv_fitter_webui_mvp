import numpy as np

from ivfitter.core.metrics import parameter_stderr


def test_parameter_stderr_uses_svd_for_rank_deficient_jacobian():
    records = [("a", None, "a", None), ("b", None, "b", None)]
    jac = np.array([[1.0, 1.0], [2.0, 2.0], [3.0, 3.0]])
    residual = np.array([1e-9, -1e-9, 0.0])

    stderr = parameter_stderr(records, jac, residual)

    assert set(stderr) == {"a", "b"}
    assert np.isfinite(stderr["a"])
    assert np.isfinite(stderr["b"])
    assert stderr["a"] >= 0.0
    assert stderr["b"] >= 0.0
