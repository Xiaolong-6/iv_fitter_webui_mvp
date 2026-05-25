import numpy as np
import pytest
from fastapi.testclient import TestClient

from ivfitter.api.main import app
from ivfitter.core.fitting_engine import fit_trace
from ivfitter.core.model_spec import ComponentSpec, FitConfig, FitRequest, ModelSpec, ParameterSpec
from ivfitter.core.synthetic_trace import (
    SyntheticArtifactConfig,
    SyntheticNoiseConfig,
    build_voltage_sweep,
    generate_synthetic_trace,
)


def p(value, fit=False, lower=None, upper=None, unit=None):
    return ParameterSpec(value=value, fit=fit, lower=lower, upper=upper, unit=unit)


def ohmic_model(r_ohm: float = 1000.0) -> ModelSpec:
    return ModelSpec(
        parallel=[
            ComponentSpec(
                id="Rsh",
                location="parallel",
                function_type="shunt",
                law_id="ohmic",
                evaluation_form="current_branch",
                placement="parallel_current_branch",
                params={"Rsh_ohm": p(r_ohm, lower=1e-9, upper=1e12, unit="ohm")},
            )
        ],
        version="test",
    )


def generate(**kwargs):
    return generate_synthetic_trace(
        model=kwargs.get("model", ohmic_model()),
        voltage_start=kwargs.get("voltage_start", -1.0),
        voltage_stop=kwargs.get("voltage_stop", 1.0),
        voltage_step=kwargs.get("voltage_step", 0.5),
        noise_config=kwargs.get("noise_config", SyntheticNoiseConfig()),
        artifact_config=kwargs.get("artifact_config", SyntheticArtifactConfig()),
        trace_name=kwargs.get("trace_name", "synthetic"),
        seed=kwargs.get("seed"),
    )


def test_voltage_sweep_increasing_and_decreasing_ranges():
    assert np.allclose(build_voltage_sweep(-1.0, 1.0, 0.5), [-1.0, -0.5, 0.0, 0.5, 1.0])
    assert np.allclose(build_voltage_sweep(1.0, -1.0, 0.5), [1.0, 0.5, 0.0, -0.5, -1.0])


def test_voltage_sweep_rejects_invalid_step_and_excessive_count():
    with pytest.raises(ValueError, match="step"):
        build_voltage_sweep(0.0, 1.0, 0.0)
    with pytest.raises(ValueError, match="too many"):
        build_voltage_sweep(0.0, 2.0, 0.0001)


def test_seeded_noise_is_deterministic():
    noise = SyntheticNoiseConfig(mode="gaussian_absolute", noise_level_A=1e-9)
    a = generate(noise_config=noise, seed=123).current_A
    b = generate(noise_config=noise, seed=123).current_A
    c = generate(noise_config=noise, seed=124).current_A
    assert a == b
    assert a != c


def test_shape_metadata_and_parameter_keys_are_preserved():
    model = ohmic_model()
    result = generate(model=model, voltage_start=-1.0, voltage_stop=1.0, voltage_step=1.0)
    assert len(result.voltage_V) == len(result.current_A) == 3
    assert result.metadata["synthetic"] is True
    assert result.metadata["ground_truth_parameters"] == {"Rsh.Rsh_ohm": 1000.0}
    assert list(model.parallel[0].params.keys()) == ["Rsh_ohm"]


def test_compliance_clips_current_to_limit():
    result = generate(
        model=ohmic_model(10.0),
        voltage_start=-1.0,
        voltage_stop=1.0,
        voltage_step=0.5,
        artifact_config=SyntheticArtifactConfig(compliance_enabled=True, compliance_current_A=0.02),
    )
    assert max(abs(i) for i in result.current_A) <= 0.02
    assert result.metadata["artifact_config"]["compliance_enabled"] is True


def test_generated_trace_is_fit_request_compatible():
    model = ohmic_model()
    synthetic = generate(model=model, voltage_start=-1.0, voltage_stop=1.0, voltage_step=0.2)
    fit_result = fit_trace(FitRequest(
        trace={
            "voltage_V": synthetic.voltage_V,
            "current_A": synthetic.current_A,
            "trace_id": synthetic.trace_name,
            "metadata": synthetic.metadata,
        },
        model=model,
        config=FitConfig(max_nfev=20),
    ))
    assert "Rsh.Rsh_ohm" in fit_result.parameters


def test_generate_synthetic_trace_api_response_schema():
    response = TestClient(app).post("/api/generate-synthetic-trace", json={
        "model": ohmic_model().model_dump(mode="json"),
        "voltage_start": 0,
        "voltage_stop": 1,
        "voltage_step": 0.5,
        "noise_config": {"mode": "none"},
        "artifact_config": {"compliance_enabled": False},
        "trace_name": "api_synthetic",
        "seed": None,
    })
    assert response.status_code == 200
    payload = response.json()
    assert payload["trace_name"] == "api_synthetic"
    assert payload["voltage_V"] == [0.0, 0.5, 1.0]
    assert len(payload["current_A"]) == 3
    assert payload["metadata"]["synthetic"] is True
    assert payload["metadata"]["ground_truth_parameters"]["Rsh.Rsh_ohm"] == 1000.0
