"""HappyMeasure CSV section and source-mode helpers for import_trace."""

from __future__ import annotations

def _metadata_lines(text: str) -> list[str]:
    return [line.strip() for line in text.splitlines() if line.strip().startswith("#")]
def _metadata_value(lines: list[str], key: str) -> str:
    key_l = key.lower()
    import csv
    for line in lines:
        row = next(csv.reader([line.lstrip("# ")]))
        if row and row[0].strip().lower() == key_l:
            return row[1].strip() if len(row) > 1 else ""
    return ""
def _data_section_text(text: str) -> str:
    lines = text.splitlines()
    start = -1
    import csv
    for idx, line in enumerate(lines):
        if not line.strip().startswith("#"):
            continue
        row = next(csv.reader([line.lstrip("# ")]))
        if len(row) >= 2 and row[0].strip().lower() == "section" and row[1].strip().lower() == "data":
            start = idx + 1
    selected = lines[start:] if start >= 0 else [ln for ln in lines if not ln.strip().startswith("#")]
    return "\n".join(ln for ln in selected if ln.strip() and not ln.strip().startswith("#"))
def _norm_col_name(name: object) -> str:
    return str(name).lower().strip().replace(" ", "_").replace("/", "_").replace("-", "_").replace("(", "").replace(")", "")
def _mode_is_current_source(mode: object, source_col: object | None = None, measured_col: object | None = None) -> bool:
    """Return True when HappyMeasure source_value is current and measured_value is voltage."""
    mode_s = str(mode or "").strip().lower()
    if mode_s in {"curr", "current", "current_source", "current-source"}:
        return True
    if mode_s in {"volt", "voltage", "voltage_source", "voltage-source"}:
        return False
    src = _norm_col_name(source_col or "")
    meas = _norm_col_name(measured_col or "")
    return ("current" in src or src.endswith("_a")) and ("volt" in meas or meas.endswith("_v"))
