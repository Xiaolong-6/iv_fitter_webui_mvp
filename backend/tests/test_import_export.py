from ivfitter.core.model_spec import FitRequest
from ivfitter.core.fitting_engine import fit_trace
from ivfitter.io.import_trace import ImportCsvTextRequest, import_csv_text
from ivfitter.io.export_result import fit_result_json_text
from test_backend_mvp import sample_model, sample_trace


def test_import_csv_text_drops_nonfinite_rows():
    text = "V,I\n0,0\n1,1e-9\nbad,2e-9\n2,3e-9\n"
    trace, quality = import_csv_text(ImportCsvTextRequest(text=text))
    assert len(trace.voltage_V) == 3
    assert quality.rows_dropped == 1
    assert quality.voltage_col == "V"


def test_export_result_json_is_available_for_internal_reproducibility():
    result = fit_trace(FitRequest(trace=sample_trace(), model=sample_model()))
    assert '"software_version"' in fit_result_json_text(result)
