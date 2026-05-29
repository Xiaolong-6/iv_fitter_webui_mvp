import warnings

import numpy as np
from fastapi.testclient import TestClient

from ivfitter.api import main
from ivfitter.api.main import app
from ivfitter.core.evaluation import softplus


def test_api_token_is_optional_by_default(monkeypatch):
    monkeypatch.delenv("IVFITTER_API_TOKEN", raising=False)
    client = TestClient(app)
    assert client.get("/api/component-registry").status_code == 200


def test_api_token_protects_api_when_configured(monkeypatch):
    monkeypatch.setenv("IVFITTER_API_TOKEN", "test-token")
    client = TestClient(app)

    assert client.get("/api/health").status_code == 200
    assert client.get("/api/component-registry").status_code == 401
    response = client.get("/api/component-registry", headers={"X-IVFITTER-API-Key": "test-token"})
    assert response.status_code == 200


def test_internal_errors_are_sanitized_by_default(monkeypatch):
    monkeypatch.delenv("IVFITTER_API_TOKEN", raising=False)
    monkeypatch.delenv("IVFITTER_DEBUG_ERRORS", raising=False)
    monkeypatch.setattr(main, "suggest_bounds", lambda request: (_ for _ in ()).throw(RuntimeError("sensitive internal detail")))
    client = TestClient(app)

    response = client.post("/api/suggest-bounds", json={"trace": {"voltage_V": [0, 1], "current_A": [0, 1e-9]}, "model": {}, "config": {}})

    assert response.status_code == 500
    assert response.json()["detail"] == "Internal server error. See backend log for details."
    assert "sensitive internal detail" not in response.text


def test_internal_errors_can_be_verbose_in_debug_mode(monkeypatch):
    monkeypatch.delenv("IVFITTER_API_TOKEN", raising=False)
    monkeypatch.setenv("IVFITTER_DEBUG_ERRORS", "1")
    monkeypatch.setattr(main, "suggest_bounds", lambda request: (_ for _ in ()).throw(RuntimeError("debug detail")))
    client = TestClient(app)

    response = client.post("/api/suggest-bounds", json={"trace": {"voltage_V": [0, 1], "current_A": [0, 1e-9]}, "model": {}, "config": {}})

    assert response.status_code == 500
    assert "debug detail" in response.json()["detail"]


def test_open_import_dialog_public_name_strips_absolute_path():
    assert main._public_selected_name(r"C:\\Users\\person\\secret\\trace.csv") == "trace.csv"
    assert main._public_selected_name("/home/person/secret/trace.csv") == "trace.csv"


def test_softplus_extreme_negative_values_do_not_warn():
    values = np.array([-1000.0, -600.0, -500.0, -1.0, 0.0, 1.0])
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        out = softplus(values)
    assert not caught
    assert out[0] == 0.0
    assert 0.0 < out[1] < 1e-250
    assert np.all(np.isfinite(out))


def test_local_file_dialog_rejects_non_loopback_request():
    class DummyClient:
        host = "192.168.1.50"

    class DummyRequest:
        client = DummyClient()

    try:
        main._require_loopback_for_local_file_dialog(DummyRequest())
    except Exception as exc:
        assert getattr(exc, "status_code", None) == 403
        assert "localhost" in getattr(exc, "detail", "")
    else:
        raise AssertionError("remote local-file-dialog request was not rejected")


def test_local_file_dialog_allows_loopback_request():
    class DummyClient:
        host = "127.0.0.1"

    class DummyRequest:
        client = DummyClient()

    main._require_loopback_for_local_file_dialog(DummyRequest())


def test_cors_methods_are_explicit_not_wildcard(monkeypatch):
    monkeypatch.delenv("IVFITTER_API_TOKEN", raising=False)
    client = TestClient(app)
    response = client.options(
        "/api/component-registry",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,x-ivfitter-api-key",
        },
    )
    assert response.status_code == 200
    allow_methods = response.headers.get("access-control-allow-methods", "")
    assert "POST" in allow_methods
    assert "GET" in allow_methods
    assert "DELETE" not in allow_methods
