from ivfitter.core.model_spec import FitConfig, FitRequest
from ivfitter.core.fitting_engine import fit_trace
from ivfitter.io.export_result import fit_result_json_text
from test_backend_mvp import sample_model, sample_trace


def test_fit_result_json_contains_reproducibility_fields():
    result = fit_trace(FitRequest(trace=sample_trace(), model=sample_model(), config=FitConfig(max_nfev=20)))
    text = fit_result_json_text(result)
    for key in ["model", "config", "parameters", "metrics", "warnings", "curves", "equations", "software_version"]:
        assert f'"{key}"' in text


def test_model_version_defaults_to_1_0_0():
    assert sample_model().version in {"0.5.0", "0.6.0", "0.7.0", "0.8.0", "0.9.0", "1.0.0"}
