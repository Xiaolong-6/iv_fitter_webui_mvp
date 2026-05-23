from ivfitter.core.fitting_engine import fit_trace
from ivfitter.core.model_spec import FitConfig, FitRequest
from test_backend_mvp import sample_model, sample_trace


def test_multistart_enabled_adds_info_warning():
    model = sample_model()
    model.parallel[0].params["Rsh_ohm"].fit = True
    req = FitRequest(trace=sample_trace(), model=model, config=FitConfig(multistart_enabled=True, seed_scale_factors=[1.0, 1.1], max_nfev=20))
    result = fit_trace(req)
    assert any(w.code == "multistart" for w in result.warnings)
    assert "multistart" in result.message


def test_residual_floor_config_is_serialized():
    config = FitConfig(residual_floor_A=1e-12)
    assert config.residual_floor_A == 1e-12


def test_deprecated_seed_scale_factors_warning():
    model = sample_model()
    req = FitRequest(trace=sample_trace(), model=model, config=FitConfig(seed_scale_factors=[1.0, 2.0], max_nfev=10))
    result = fit_trace(req)
    assert any(w.code == "deprecated_field" and "seed_scale_factors" in w.message for w in result.warnings)
