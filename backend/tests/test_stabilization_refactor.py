from pathlib import Path

import numpy as np

from ivfitter.core.metrics import fit_metrics
from ivfitter.core.multistart import multistart_candidates
from ivfitter.core.reportability import reportability_from_warnings
from ivfitter.core.model_spec import FitWarning, FitConfig, FitRequest, ModelSpec, TraceData, ComponentSpec, ParameterSpec
from ivfitter.core.fitting_engine import fit_trace


def test_extracted_metrics_preserve_near_zero_log_floor_behavior():
    y_meas = np.array([0.0, 1e-12, 1e-9, 1e-6])
    y_fit = np.array([0.0, 2e-12, 1.1e-9, 1.2e-6])
    metrics = fit_metrics(y_fit, y_meas, floor_A=1e-11)
    assert metrics["log_points_excluded"] == 2.0
    assert metrics["log_magnitude_mae_decades"] < 0.1


def test_extracted_multistart_candidates_are_deterministic_and_bounded():
    x0 = np.array([1e-12, 10.0])
    lower = np.array([1e-30, 0.0])
    upper = np.array([1.0, 100.0])
    first = multistart_candidates(x0, lower, upper, 8)
    second = multistart_candidates(x0, lower, upper, 8)
    assert len(first) == len(second)
    assert all(np.allclose(a, b) for a, b in zip(first, second))
    assert all(np.all(c >= lower) and np.all(c <= upper) for c in first)


def test_backend_reportability_is_error_warning_driven():
    warning = FitWarning(code="graph_solver", message="diagnostic only", severity="error")
    reportable, reason = reportability_from_warnings(True, [warning], {"linear_rmse_A": 1e-9})
    assert reportable is False
    assert "graph_solver" in reason


def test_fit_result_carries_backend_reportability_fields_for_graph_solver():
    model = ModelSpec(
        core=[ComponentSpec(id="D1", location="core", function_type="diode", law_id="shockley_diode", evaluation_form="current_branch", placement="junction_current_branch", polarity="forward", params={
            "I0_A": ParameterSpec(value=1e-12, fit=False),
            "n": ParameterSpec(value=1.5, fit=False),
        })],
        series=[],
        parallel=[],
    )
    trace = TraceData(voltage_V=[-0.1, 0.0, 0.1], current_A=[0.0, 0.0, 1e-9])
    result = fit_trace(FitRequest(trace=trace, model=model, config=FitConfig(solver_mode="graph_dc", exclude_compliance=False)))
    assert result.reportable is False
    assert "graph_solver" in result.reportability_reason


def test_frontend_model_builder_rules_are_extracted_and_imported():
    root = Path(__file__).resolve().parents[2]
    rules = root / "frontend" / "src" / "model-builder" / "rules.ts"
    mutations = root / "frontend" / "src" / "model-builder" / "mutations.ts"
    model_builder = root / "frontend" / "src" / "components" / "ModelBuilder.tsx"
    assert rules.exists()
    assert mutations.exists()
    rules_text = rules.read_text(encoding="utf-8")
    mutation_text = mutations.read_text(encoding="utf-8")
    builder_text = model_builder.read_text(encoding="utf-8")
    assert "export function definitionsForBucket" in rules_text
    assert "export function canAddComponent" in rules_text
    assert "export function addDefinitionToModel" in mutation_text
    assert "../model-builder/rules" in builder_text
    assert "../model-builder/mutations" in builder_text
    assert "function isDuplicateBlocked" not in builder_text


def test_css_model_builder_rules_are_split_out():
    root = Path(__file__).resolve().parents[2]
    style = root / "frontend" / "src" / "style.css"
    extracted = root / "frontend" / "src" / "styles" / "model-builder.css"
    assert extracted.exists()
    style_text = style.read_text(encoding="utf-8")
    base_text = (root / "frontend" / "src" / "styles" / "base-shell.css").read_text(encoding="utf-8")
    assert '@import "./styles/base-shell.css";' in style_text
    assert '@import "./model-builder.css";' in base_text
    assert ".circuit-panel-v2" in extracted.read_text(encoding="utf-8")


def test_duplicate_unidentifiable_component_makes_fit_non_reportable():
    def diode(id_: str) -> ComponentSpec:
        return ComponentSpec(
            id=id_,
            location="core",
            function_type="diode",
            law_id="shockley_diode",
            evaluation_form="current_branch",
            placement="junction_current_branch",
            polarity="forward",
            params={
                "I0_A": ParameterSpec(value=1e-12, fit=False, lower=1e-30),
                "n": ParameterSpec(value=1.5, fit=False, lower=0.5),
            },
        )
    model = ModelSpec(core=[diode("D1"), diode("D2")])
    trace = TraceData(voltage_V=[-0.1, 0.0, 0.1, 0.2], current_A=[0.0, 0.0, 1e-9, 2e-9])
    result = fit_trace(FitRequest(trace=trace, model=model, config=FitConfig(exclude_compliance=False)))
    assert result.reportable is False
    assert any(w.code == "duplicate_unidentifiable_component" and w.severity == "error" for w in result.warnings)


def test_location_placement_mismatch_makes_fit_non_reportable():
    bad = ComponentSpec(
        id="bad_series_branch",
        location="series",
        function_type="diode",
        law_id="shockley_diode",
        evaluation_form="current_branch",
        placement="parallel_current_branch",
        polarity="forward",
        params={
            "I0_A": ParameterSpec(value=1e-12, fit=False, lower=1e-30),
            "n": ParameterSpec(value=1.5, fit=False, lower=0.5),
        },
    )
    model = ModelSpec(series=[bad])
    trace = TraceData(voltage_V=[-0.1, 0.0, 0.1, 0.2], current_A=[0.0, 0.0, 1e-9, 2e-9])
    result = fit_trace(FitRequest(trace=trace, model=model, config=FitConfig(exclude_compliance=False)))
    assert result.reportable is False
    assert any(w.code == "incoherent_location_placement" and w.severity == "error" for w in result.warnings)


def test_secondary_diode_button_removed_in_favor_of_model_preset():
    root = Path(__file__).resolve().parents[2]
    model_builder = root / "frontend" / "src" / "components" / "ModelBuilder.tsx"
    text = model_builder.read_text(encoding="utf-8")
    assert "Add secondary diode D2" not in text
    assert "secondary-diode-button" not in text
    assert "canAddSecondaryDiode" not in text
    assert "Double diode model" in text
    assert "makeDoubleDiodePreset" in text


def test_plot_empty_state_has_import_shortcut():
    root = Path(__file__).resolve().parents[2]
    text = (root / "frontend" / "src" / "components" / "PlotWorkspace.tsx").read_text(encoding="utf-8")
    assert "onImportData" in text
    assert "Import data" in text
    assert "导入数据" in text


def test_collapsed_language_icon_reflects_next_language():
    root = Path(__file__).resolve().parents[2]
    text = (root / "frontend" / "src" / "components" / "WorkflowSidebar.tsx").read_text(encoding="utf-8")
    assert 'language === "en" ? "ZH" : "EN"' in text


def test_parameter_table_uses_shared_scientific_format_for_extreme_values():
    root = Path(__file__).resolve().parents[2]
    table_text = (root / "frontend" / "src" / "components" / "ParameterTable.tsx").read_text(encoding="utf-8")
    format_text = (root / "frontend" / "src" / "model" / "format.ts").read_text(encoding="utf-8")
    format_test_text = (root / "frontend" / "src" / "model" / "__tests__" / "format.test.ts").read_text(encoding="utf-8")
    assert "formatParameterNumber" in table_text
    assert "formatValueWithUnit(v, unit, 4)" in table_text
    assert "abs < 1e-3 || abs >= 1e4" in format_text
    assert "toExponential(Math.max(digits - 1, 0))" in format_text
    assert 'formatValueWithUnit(0.0000001234, "A", 4)' in format_test_text
