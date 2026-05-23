from pathlib import Path

from ivfitter.io.import_trace import ImportCsvTextRequest, import_csv_text, import_csv_text_multi


def test_happymeasure_wide_v2_imports_multiple_traces():
    text = """# HappyMeasure combined device export
# schema,combined-v2
# format,wide-v2
# trace_count,2
# section,data
Elapsed_s,Voltage (V),T001 A [Current (A)],T002 B [Current (A)]
0,-1,-1e-9,-2e-9
1,0,0,0
2,1,1e-9,2e-9
"""
    traces = import_csv_text_multi(ImportCsvTextRequest(text=text, trace_id="hm"))
    assert len(traces) == 2
    assert traces[0][0].voltage_V == [-1.0, 0.0, 1.0]
    assert traces[1][0].current_A[-1] == 2e-9


def test_happymeasure_long_v2_imports_groups():
    text = """# HappyMeasure combined device export
# schema,combined-v2
# format,long-v2
# section,data
trace_index,device_name,operator,mode,sweep_type,point_index,elapsed_s,source_value,measured_value
1,A,,voltage,step,1,0,-1,-1e-9
1,A,,voltage,step,2,1,0,0
1,A,,voltage,step,3,2,1,1e-9
2,B,,voltage,step,1,0,-1,-2e-9
2,B,,voltage,step,2,1,0,0
2,B,,voltage,step,3,2,1,2e-9
"""
    traces = import_csv_text_multi(ImportCsvTextRequest(text=text, trace_id="hm"))
    assert len(traces) == 2
    assert traces[0][0].trace_id.startswith("T001")
    assert traces[1][0].current_A[-1] == 2e-9


def test_happymeasure_single_current_source_swaps_to_voltage_current_arrays():
    text = """# HappyMeasure measurement export
# schema,single-v2
# metadata,{"mode":"CURR","device_name":"current source"}
# section,data
Elapsed_s,Current_A,Voltage_V
0,-1e-6,-1
1,0,0
2,1e-6,1
"""
    traces = import_csv_text_multi(ImportCsvTextRequest(text=text, trace_id="hm-current"))
    assert len(traces) == 1
    trace, quality = traces[0]
    assert trace.voltage_V == [-1.0, 0.0, 1.0]
    assert trace.current_A == [-1e-6, 0.0, 1e-6]
    assert quality.voltage_col == "Voltage_V"
    assert quality.current_col == "Current_A"


def test_happymeasure_long_current_source_imports_voltage_as_measured_column():
    text = """# HappyMeasure combined device export
# schema,combined-v2
# format,long-v2
# section,data
trace_index,device_name,operator,mode,sweep_type,point_index,elapsed_s,source_value,measured_value
1,A,,CURR,STEP,1,0,-1e-6,-1
1,A,,CURR,STEP,2,1,0,0
1,A,,CURR,STEP,3,2,1e-6,1
"""
    traces = import_csv_text_multi(ImportCsvTextRequest(text=text, trace_id="hm"))
    assert len(traces) == 1
    trace, quality = traces[0]
    assert trace.voltage_V == [-1.0, 0.0, 1.0]
    assert trace.current_A == [-1e-6, 0.0, 1e-6]
    assert trace.metadata["happymeasure_mode"] == "CURR"


def test_happymeasure_wide_current_source_imports_voltage_columns_as_traces():
    text = """# HappyMeasure combined device export
# schema,combined-v2
# format,wide-v2
# section,data
Elapsed_s,Current_A,T001 A [Voltage_V],T002 B [Voltage_V]
0,-1e-6,-1,-2
1,0,0,0
2,1e-6,1,2
"""
    traces = import_csv_text_multi(ImportCsvTextRequest(text=text, trace_id="hm"))
    assert len(traces) == 2
    assert traces[0][0].voltage_V == [-1.0, 0.0, 1.0]
    assert traces[0][0].current_A == [-1e-6, 0.0, 1e-6]
    assert traces[1][0].voltage_V[-1] == 2.0


def test_happymeasure_combined_wide_fixture_imports_all_traces():
    fixture = Path(__file__).resolve().parents[2] / "examples" / "testdata" / "happymeasure_combined_wide_v2_anonymized.csv"
    text = fixture.read_text(encoding="utf-8")
    traces = import_csv_text_multi(ImportCsvTextRequest(text=text, trace_id="hm-wide-fixture"))
    assert len(traces) == 14
    first_trace, first_quality = traces[0]
    assert first_trace.trace_id.startswith("T001 Device_14")
    assert len(first_trace.voltage_V) == 95
    assert first_quality.voltage_col == "Voltage_V"
    assert first_quality.current_col == "T001 Device_14 [Current_A]"
    assert min(first_trace.voltage_V) == -20.0
    assert max(first_trace.voltage_V) == 20.0


def test_happymeasure_combined_wide_selected_columns_use_data_section_not_metadata_table():
    fixture = Path(__file__).resolve().parents[2] / "examples" / "testdata" / "happymeasure_combined_wide_v2_anonymized.csv"
    text = fixture.read_text(encoding="utf-8")
    trace, quality = import_csv_text(ImportCsvTextRequest(
        text=text,
        trace_id="selected-wide-column",
        voltage_col="Voltage_V",
        current_col="T001 Device_14 [Current_A]",
        delimiter=",",
    ))
    assert len(trace.voltage_V) == 95
    assert quality.voltage_col == "Voltage_V"
    assert quality.current_col == "T001 Device_14 [Current_A]"
    assert trace.current_A[0] == -0.0001552275


def test_happymeasure_fixture_is_full_length_and_anonymized():
    fixture = Path(__file__).resolve().parents[2] / "examples" / "testdata" / "happymeasure_combined_wide_v2_anonymized.csv"
    text = fixture.read_text(encoding="utf-8")
    public_fixture = Path(__file__).resolve().parents[2] / "frontend" / "public" / "sample_data" / "happymeasure_combined_wide_v2_anonymized.csv"
    assert public_fixture.read_text(encoding="utf-8") == text
    assert "HPQ" not in text
    assert "COM3" not in text
    assert "# trace_count,14" in text
    assert text.count("\n") + 1 >= 132
    traces = import_csv_text_multi(ImportCsvTextRequest(text=text, trace_id="hm-wide-fixture"))
    assert len(traces) == 14
    assert all(len(trace.voltage_V) == 95 for trace, _quality in traces)
