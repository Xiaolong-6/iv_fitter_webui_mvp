import numpy as np
from ivfitter.core.fitting_engine import fit_trace
from ivfitter.core.model_spec import ComponentSpec, FitRequest, ModelSpec, ParameterSpec, TraceData
from ivfitter.io.export_report import fit_result_markdown


def test_markdown_report_contains_metrics_and_parameters():
    v = np.linspace(-0.5, 0.5, 12)
    i = v / 1e9
    model = ModelSpec(series=[ComponentSpec(id="Rs", location="series", function_type="constant_rs", params={"Rs_ohm": ParameterSpec(value=0, fit=False)})], parallel=[ComponentSpec(id="Rsh", location="parallel", function_type="shunt", params={"Rsh_ohm": ParameterSpec(value=1e9, fit=False)})])
    result = fit_trace(FitRequest(trace=TraceData(voltage_V=v.tolist(), current_A=i.tolist()), model=model))
    md = fit_result_markdown(result)
    assert "## Metrics" in md
    assert "Rsh.Rsh_ohm" in md
