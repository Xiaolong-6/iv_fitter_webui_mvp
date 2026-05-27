import csv
import io
import json

import numpy as np

from ivfitter.core.fitting_engine import fit_trace
from ivfitter.core.model_spec import ComponentSpec, FitRequest, ModelSpec, ParameterSpec, TraceData
from ivfitter.io.export_result import diagnostics_json_text, parameter_csv_text, report_csv_text


def _simple_result():
    v = np.linspace(-0.5, 0.5, 12)
    i = v / 1e9
    model = ModelSpec(
        series=[ComponentSpec(id="Rs", location="series", function_type="constant_rs", params={"Rs_ohm": ParameterSpec(value=0, fit=False, unit="Ω")})],
        parallel=[ComponentSpec(id="Rsh", location="parallel", function_type="shunt", params={"Rsh_ohm": ParameterSpec(value=1e9, fit=False, unit="Ω")})],
    )
    return fit_trace(FitRequest(trace=TraceData(voltage_V=v.tolist(), current_A=i.tolist(), trace_id="demo_trace"), model=model))


def test_parameter_csv_contains_display_status_and_notes_columns():
    text = parameter_csv_text(_simple_result())
    rows = list(csv.DictReader(io.StringIO(text)))
    assert rows
    assert "display_value" in rows[0]
    assert "display_initial" in rows[0]
    assert "status" in rows[0]
    assert "note" in rows[0]


def test_sectioned_report_csv_contains_expected_sections():
    text = report_csv_text(_simple_result())
    assert "[Software]" in text
    assert "[Trace]" in text
    assert "[Model]" in text
    assert "[Fit configuration]" in text
    assert "[Fit quality]" in text
    assert "[Parameters]" in text
    assert "[Warnings]" in text
    assert "[Diagnostics]" in text


def test_diagnostics_json_is_structured_for_reproducibility():
    data = json.loads(diagnostics_json_text(_simple_result()))
    assert data["software"]["version"]
    assert "fit_configuration" in data
    assert "fit_quality" in data
    assert isinstance(data["parameters"], list)
    assert data["parameters"][0]["display_value"]
