"""Reproducible FitResult export helpers."""

from __future__ import annotations

import csv
import io
from datetime import datetime, timezone
from typing import Any

from ivfitter.core.model_spec import FitResult, ParameterResult


def _finite(value: float | None) -> bool:
    try:
        return value is not None and value == value and abs(value) != float("inf")
    except Exception:
        return False


def display_number(value: float | None, unit: str | None = None, digits: int = 4) -> str:
    """Return a compact human-readable scalar for exports."""
    if value is None:
        return ""
    if not _finite(value):
        return str(value)
    if value == 0:
        text = "0"
    else:
        abs_value = abs(value)
        if unit in {"A", "Ω", "Ohm", "ohm"} or abs_value < 1e-3 or abs_value >= 1e4:
            text = f"{value:.{max(digits - 1, 0)}e}"
        else:
            text = f"{value:.{digits}g}"
    return f"{text} {unit}".strip() if unit else text


def parameter_status(param: ParameterResult) -> str:
    """Classify a parameter into a user-facing fit status."""
    if param.fixed:
        return "fixed"
    if not _finite(param.value):
        return "invalid"
    value = float(param.value)
    scale = max(abs(value), 1.0)
    near_lower = param.lower is not None and abs(value - param.lower) <= scale * 1e-6
    near_upper = param.upper is not None and abs(value - param.upper) <= scale * 1e-6
    if near_lower and param.lower is not None and value == param.lower:
        return "at lower bound"
    if near_upper and param.upper is not None and value == param.upper:
        return "at upper bound"
    if near_lower:
        return "near lower bound"
    if near_upper:
        return "near upper bound"
    if _finite(param.stderr) and value != 0 and abs(float(param.stderr) / value) > 1:
        return "weakly identified"
    return "free"


def parameter_note(name: str, param: ParameterResult) -> str:
    notes: list[str] = []
    status = parameter_status(param)
    if "bound" in status:
        notes.append("Inspect bounds before interpreting this parameter physically.")
    if status == "weakly identified":
        notes.append("Standard error is larger than the fitted value magnitude.")
    raw_name = name.split(".")[-1]
    if raw_name.lower() == "n" and _finite(param.value) and param.value > 2:
        notes.append("Ideality factor above 2; check model completeness, transport regime, or data range.")
    if "Rsh" in name and _finite(param.value) and abs(param.value) >= 1e12:
        notes.append("Very large shunt resistance; this branch may be effectively inactive.")
    return " ".join(notes)


def _component_rows(result: FitResult) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for location in ("core", "series", "parallel"):
        for comp in getattr(result.model, location):
            rows.append({
                "location": location,
                "component_id": comp.id,
                "nickname": str(comp.metadata.get("nickname", comp.id)) if comp.metadata else comp.id,
                "function_type": comp.function_type,
                "law_id": comp.law_id,
                "evaluation_form": comp.evaluation_form,
                "placement": comp.placement,
                "polarity": comp.polarity,
            })
    return rows


def structured_report(result: FitResult) -> dict[str, Any]:
    """Return a stable, software-readable report payload."""
    diagnostics = result.fit_diagnostics.model_dump(mode="json") if result.fit_diagnostics is not None else None
    parameter_rows = []
    for name, param in sorted(result.parameters.items()):
        parameter_rows.append({
            "parameter": name,
            "value": param.value,
            "display_value": display_number(param.value, param.unit),
            "unit": param.unit or "",
            "initial": _initial_value(result, name),
            "display_initial": display_number(_initial_value(result, name), param.unit),
            "lower": param.lower,
            "display_lower": display_number(param.lower, param.unit),
            "upper": param.upper,
            "display_upper": display_number(param.upper, param.unit),
            "stderr": param.stderr,
            "display_stderr": display_number(param.stderr, param.unit),
            "fixed": param.fixed,
            "status": parameter_status(param),
            "note": parameter_note(name, param),
        })
    return {
        "software": {
            "name": "IV-fitter Web UI",
            "version": result.software_version,
            "exported_at": datetime.now(timezone.utc).isoformat(),
        },
        "trace": {
            "trace_name": diagnostics.get("trace_name") if diagnostics else None,
            "voltage_range_used": diagnostics.get("voltage_range_used") if diagnostics else None,
            "points_total": diagnostics.get("points_total") if diagnostics else len(result.curves.voltage_V),
            "points_used": diagnostics.get("points_used") if diagnostics else len(result.curves.voltage_V),
            "points_excluded": diagnostics.get("points_excluded") if diagnostics else 0,
        },
        "model": {
            "software_model_version": result.model.version,
            "temperature_K": result.model.temperature_K,
            "components": _component_rows(result),
            "equations": result.equations.model_dump(mode="json"),
        },
        "fit_configuration": result.config.model_dump(mode="json"),
        "fit_quality": {
            "success": result.success,
            "message": result.message,
            "reportable": result.reportable,
            "reportability_reason": result.reportability_reason,
            "metrics": result.metrics,
        },
        "parameters": parameter_rows,
        "warnings": [warning.model_dump(mode="json") for warning in result.warnings],
        "diagnostics": diagnostics,
    }


def _initial_value(result: FitResult, parameter_key: str) -> float | None:
    component_id, _, param_name = parameter_key.partition(".")
    for comp in [*result.model.core, *result.model.series, *result.model.parallel]:
        if comp.id == component_id and param_name in comp.params:
            return comp.params[param_name].value
    return None


def fit_result_json_text(result: FitResult) -> str:
    """Return a deterministic JSON representation of a FitResult."""
    return result.model_dump_json(indent=2)




def _section(writer: csv.writer, title: str) -> None:
    writer.writerow([])
    writer.writerow([f"[{title}]"])


def report_csv_text(result: FitResult) -> str:
    """Return a sectioned, spreadsheet-friendly fit report CSV."""
    data = structured_report(result)
    buf = io.StringIO()
    writer = csv.writer(buf)

    writer.writerow(["IV-fitter report"])
    _section(writer, "Software")
    for key, value in data["software"].items():
        writer.writerow([key, value])

    _section(writer, "Trace")
    for key, value in data["trace"].items():
        writer.writerow([key, value])

    _section(writer, "Model")
    writer.writerow(["temperature_K", data["model"]["temperature_K"]])
    writer.writerow(["component_id", "nickname", "location", "law_id", "form", "placement", "polarity"])
    for row in data["model"]["components"]:
        writer.writerow([row["component_id"], row["nickname"], row["location"], row["law_id"], row["evaluation_form"], row["placement"], row["polarity"]])
    writer.writerow(["equations"])
    for group in ("voltage_relation", "core", "series", "parallel", "auxiliary", "topology"):
        for equation in data["model"]["equations"].get(group, []):
            writer.writerow([group, equation])

    _section(writer, "Fit configuration")
    for key, value in data["fit_configuration"].items():
        writer.writerow([key, value])

    _section(writer, "Fit quality")
    writer.writerow(["success", data["fit_quality"]["success"]])
    writer.writerow(["message", data["fit_quality"]["message"]])
    writer.writerow(["reportable", data["fit_quality"]["reportable"]])
    writer.writerow(["reportability_reason", data["fit_quality"]["reportability_reason"]])
    writer.writerow(["metric", "value", "display"])
    for key, value in data["fit_quality"]["metrics"].items():
        unit = "A" if key.endswith("_A") else ""
        writer.writerow([key, value, display_number(value, unit)])

    _section(writer, "Parameters")
    writer.writerow(["parameter", "value", "display_value", "unit", "initial", "display_initial", "lower", "upper", "stderr", "display_stderr", "fixed", "status", "note"])
    for row in data["parameters"]:
        writer.writerow([row["parameter"], row["value"], row["display_value"], row["unit"], row["initial"], row["display_initial"], row["lower"], row["upper"], row["stderr"], row["display_stderr"], row["fixed"], row["status"], row["note"]])

    _section(writer, "Warnings")
    writer.writerow(["severity", "code", "message"])
    for warning in data["warnings"]:
        writer.writerow([warning["severity"], warning["code"], warning["message"]])

    _section(writer, "Diagnostics")
    diagnostics = data.get("diagnostics") or {}
    for key, value in diagnostics.items():
        writer.writerow([key, value])
    return buf.getvalue()


