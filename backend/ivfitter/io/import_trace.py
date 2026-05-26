"""CSV/TXT import helpers with quality summaries for local Web UI use."""

from __future__ import annotations

from io import StringIO
from typing import Literal

import numpy as np
import pandas as pd
from pydantic import BaseModel

from ivfitter.core.model_spec import TraceData


class ImportCsvTextRequest(BaseModel):
    """Text import payload used by the local Web UI."""

    text: str
    trace_id: str = "imported_trace"
    voltage_col: str | None = None
    current_col: str | None = None
    delimiter: str | None = None


class ImportQualitySummary(BaseModel):
    """Import quality diagnostics shown to users before fitting."""

    rows_in_file: int
    rows_imported: int
    rows_dropped: int
    voltage_col: str
    current_col: str
    voltage_min_V: float
    voltage_max_V: float
    current_min_A: float
    current_max_A: float
    warnings: list[str]


def _header_key(name: object) -> str:
    raw = str(name).lower().strip()
    raw = raw.replace("µ", "u").replace("μ", "u")
    raw = raw.replace("ma/cm²", "macm2").replace("ma/cm2", "macm2")
    raw = raw.replace("ma cm-2", "macm2").replace("ma cm^-2", "macm2")
    raw = raw.replace("ma cm2", "macm2").replace("macm-2", "macm2")
    keep = []
    for ch in raw:
        if ch.isalnum():
            keep.append(ch)
    return "".join(keep)


def _trace_name_from_header(header: object) -> str:
    cleaned = str(header).strip().replace("[", " ").replace("]", " ")
    cleaned = " ".join(cleaned.replace("_", " ").split())
    return cleaned or "imported trace"


def _is_false_current_column(header: object) -> bool:
    key = _header_key(header)
    false_exact = {
        "row", "rows", "index", "idx", "point", "pointindex", "time", "times", "elapsed",
        "elapseds", "wavelength", "wavelengthnm", "lambda", "eqe", "pce", "efficiency",
        "ff", "fillfactor", "voc", "v_oc", "jsc", "j_sc", "area", "temperature", "temp",
    }
    if key in false_exact:
        return True
    return any(token in key for token in ("wavelength", "eqe", "pce", "fillfactor", "efficiency", "voc", "jsc"))


def _is_voltage_like(header: object) -> bool:
    key = _header_key(header)
    if key in {"v", "voltage", "voltagev", "vv", "bias", "biasv", "sourcev", "setv", "smuvoltagev", "measuredvoltagev"}:
        return True
    return ("voltage" in key or "bias" in key) and ("v" in key or "volt" in key)


def _is_trace_group_col(header: object) -> bool:
    key = _header_key(header)
    return key in {"trace", "traceid", "traceindex", "tracename", "sample", "sampleid", "device", "deviceid"}


def _current_metadata(header: object) -> dict | None:
    if _is_false_current_column(header) or _is_voltage_like(header) or _is_trace_group_col(header):
        return None
    key = _header_key(header)
    is_density = (
        "currentdensity" in key
        or "macm2" in key
        or key == "j"
        or key.startswith("j")
        or "jm" in key
        or key.endswith("ja")
        or key.endswith("jma")
    )
    is_current = (
        is_density
        or key in {"i", "a", "ma", "ia", "current", "currenta", "measuredcurrenta", "smucurrenta", "ch1"}
        or "current" in key
        or key.endswith("currenta")
        or key.endswith("ia")
        or key.endswith("ma")
    )
    if not is_current:
        return None
    meta = {"y_quantity": "current_density" if is_density else "current"}
    if is_density:
        meta["y_unit"] = "mA/cm2" if "macm2" in key else ("A" if key.endswith("ja") else "current_density")
    elif key.endswith("ma") or "currentma" in key:
        meta["y_unit"] = "mA"
    elif key.endswith("a") or "currenta" in key or key == "i":
        meta["y_unit"] = "A"
    return meta


def _infer_column(columns: list[str], kind: Literal["voltage", "current"], warnings: list[str] | None = None) -> str:
    candidates = {
        "voltage": [
            "v", "voltage", "voltage_v", "bias", "bias_v", "source_v", "set_v",
            "smu_voltage_v", "measured_voltage_v", "voltage (v)", "V",
        ],
        "current": [
            "i", "current", "current_a", "measured_current_a", "smu_current_a",
            "current (a)", "ch1", "CH1", "I",
        ],
    }[kind]
    def norm(s: str) -> str:
        return s.lower().strip().replace(" ", "_").replace("/", "_").replace("-", "_")
    normalized = {norm(c): c for c in columns}
    for cand in candidates:
        key = norm(cand)
        if key in normalized:
            return normalized[key]
    if kind == "voltage":
        for original in columns:
            if _is_voltage_like(original):
                return original
    if kind == "current":
        for original in columns:
            if _current_metadata(original):
                return original
    # HappyMeasure-style names often include units and role words. Prefer explicit measured columns.
    for key, original in normalized.items():
        if kind == "voltage" and "volt" in key and ("v" in key or "bias" in key or "source" in key or "measure" in key):
            return original
        if kind == "current" and ("current" in key or key.endswith("_a") or key == "i_a"):
            return original
    # fallback: preserve compatibility, but do not silently accept ambiguous column names.
    if kind == "voltage" and columns:
        if warnings is not None:
            warnings.append(f"Could not recognize a voltage column name; automatically selected first column {columns[0]!r}.")
        return columns[0]
    if kind == "current" and len(columns) > 1:
        if warnings is not None:
            warnings.append(f"Could not recognize a current column name; automatically selected second column {columns[1]!r}.")
        return columns[1]
    raise ValueError(f"Could not infer {kind} column from {columns!r}")


def _read_dataframe_from_text(payload: ImportCsvTextRequest) -> pd.DataFrame:
    sep = payload.delimiter if payload.delimiter else None
    # Prefer the explicit HappyMeasure data section when present.  A combined
    # HappyMeasure file can include a non-comment trace_metadata table before
    # the actual data table; reading the whole file with comment="#" makes
    # pandas treat that metadata table as the header, so explicit user-selected
    # columns such as Voltage_V and T001 ... [Current_A] appear "missing".
    data_text = _data_section_text(payload.text)
    return pd.read_csv(StringIO(data_text), sep=sep, engine="python")


def import_csv_text(payload: ImportCsvTextRequest) -> tuple[TraceData, ImportQualitySummary]:
    """Import CSV/TXT text and return trace data plus quality diagnostics."""
    df = _read_dataframe_from_text(payload)
    rows_in = len(df)
    warnings: list[str] = []
    vcol = payload.voltage_col or _infer_column(list(df.columns), "voltage", warnings)
    icol = payload.current_col or _infer_column(list(df.columns), "current", warnings)
    if vcol not in df.columns or icol not in df.columns:
        raise ValueError(f"Selected columns not present: {vcol!r}, {icol!r}")
    v = pd.to_numeric(df[vcol], errors="coerce").to_numpy(dtype=float)
    i = pd.to_numeric(df[icol], errors="coerce").to_numpy(dtype=float)
    finite = np.isfinite(v) & np.isfinite(i)
    if finite.sum() < len(finite):
        warnings.append(f"Dropped {int((~finite).sum())} non-finite row(s).")
    if finite.sum() == 0:
        raise ValueError("No finite voltage/current rows were found.")
    v2, i2 = v[finite], i[finite]
    if np.any(np.diff(v2) == 0):
        warnings.append("Repeated voltage values detected; fitting is allowed but residual plots may overlap.")
    lower_names = [str(c).lower() for c in df.columns]
    if any("happymeasure" in c for c in lower_names) or any("smu" in c or "sweep" in c for c in lower_names):
        warnings.append("HappyMeasure-style columns detected; confirm voltage/current sign convention before reporting.")
    quality = ImportQualitySummary(
        rows_in_file=rows_in,
        rows_imported=int(finite.sum()),
        rows_dropped=int((~finite).sum()),
        voltage_col=vcol,
        current_col=icol,
        voltage_min_V=float(np.min(v2)),
        voltage_max_V=float(np.max(v2)),
        current_min_A=float(np.min(i2)),
        current_max_A=float(np.max(i2)),
        warnings=warnings,
    )
    current_meta = _current_metadata(icol) or {}
    trace = TraceData(
        voltage_V=v2.tolist(),
        current_A=i2.tolist(),
        trace_id=payload.trace_id,
        metadata={
            "source": "text_upload",
            "voltage_col": vcol,
            "current_col": icol,
            "quality": quality.model_dump(),
            **current_meta,
        },
    )
    return trace, quality



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


def _build_trace_from_arrays(voltage, current, trace_id: str, *, metadata: dict | None = None) -> tuple[TraceData, ImportQualitySummary]:
    warnings: list[str] = []
    v = pd.to_numeric(pd.Series(voltage), errors="coerce").to_numpy(dtype=float)
    i = pd.to_numeric(pd.Series(current), errors="coerce").to_numpy(dtype=float)
    rows_in = int(min(len(v), len(i)))
    v = v[:rows_in]
    i = i[:rows_in]
    finite = np.isfinite(v) & np.isfinite(i)
    if finite.sum() < len(finite):
        warnings.append(f"Dropped {int((~finite).sum())} non-finite row(s).")
    if finite.sum() == 0:
        raise ValueError("No finite voltage/current rows were found.")
    v2, i2 = v[finite], i[finite]
    if np.any(np.diff(v2) == 0):
        warnings.append("Repeated voltage values detected; fitting is allowed but residual plots may overlap.")
    quality = ImportQualitySummary(
        rows_in_file=rows_in,
        rows_imported=int(finite.sum()),
        rows_dropped=int((~finite).sum()),
        voltage_col=str((metadata or {}).get("voltage_col", "Voltage_V")),
        current_col=str((metadata or {}).get("current_col", "Current_A")),
        voltage_min_V=float(np.min(v2)),
        voltage_max_V=float(np.max(v2)),
        current_min_A=float(np.min(i2)),
        current_max_A=float(np.max(i2)),
        warnings=warnings,
    )
    trace = TraceData(
        voltage_V=v2.tolist(),
        current_A=i2.tolist(),
        trace_id=trace_id,
        metadata={"source": "text_upload", "quality": quality.model_dump(), **(metadata or {})},
    )
    return trace, quality


def _plain_long_multi_trace(df: pd.DataFrame, payload: ImportCsvTextRequest) -> list[tuple[TraceData, ImportQualitySummary]] | None:
    cols = list(df.columns)
    trace_cols = [c for c in cols if _is_trace_group_col(c)]
    voltage_cols = [c for c in cols if _is_voltage_like(c)]
    current_cols = [c for c in cols if _current_metadata(c)]
    if not trace_cols or not voltage_cols or not current_cols:
        return None
    trace_col = trace_cols[0]
    vcol = payload.voltage_col or voltage_cols[0]
    icol = payload.current_col or current_cols[0]
    current_meta = _current_metadata(icol) or {}
    out: list[tuple[TraceData, ImportQualitySummary]] = []
    for key, group in df.groupby(trace_col, sort=False):
        trace_id = _trace_name_from_header(key)
        trace, quality = _build_trace_from_arrays(
            group[vcol],
            group[icol],
            trace_id,
            metadata={
                "format": "plain-long",
                "trace_col": str(trace_col),
                "trace_group": str(key),
                "voltage_col": str(vcol),
                "current_col": str(icol),
                **current_meta,
            },
        )
        out.append((trace, quality))
    return out or None


def _plain_wide_multi_trace(df: pd.DataFrame, payload: ImportCsvTextRequest) -> list[tuple[TraceData, ImportQualitySummary]] | None:
    cols = list(df.columns)
    voltage_cols = [c for c in cols if _is_voltage_like(c)]
    if not voltage_cols:
        return None
    if payload.voltage_col:
        if payload.voltage_col not in cols:
            raise ValueError(f"Selected voltage column not present: {payload.voltage_col!r}")
        voltage_cols = [payload.voltage_col]
    if payload.current_col:
        current_cols = [payload.current_col]
    else:
        current_cols = [c for c in cols if c not in voltage_cols and _current_metadata(c)]
    current_cols = [c for c in current_cols if c in cols and pd.to_numeric(df[c], errors="coerce").notna().any()]
    if not current_cols:
        return None

    pair_specs: list[tuple[object, object]] = []
    if len(voltage_cols) == 1:
        pair_specs = [(voltage_cols[0], icol) for icol in current_cols]
        summary = f"Imported {len(current_cols)} traces from one voltage column."
        warning = f"Detected one voltage column and {len(current_cols)} current/current-density columns; importing each as a separate trace."
    else:
        for icol in current_cols:
            current_idx = cols.index(icol)
            prior_voltage_cols = [vcol for vcol in voltage_cols if cols.index(vcol) < current_idx]
            if prior_voltage_cols:
                pair_specs.append((prior_voltage_cols[-1], icol))
        if len(pair_specs) != len(current_cols):
            return None
        summary = f"Imported {len(pair_specs)} traces from paired voltage/current columns."
        warning = f"Detected {len(voltage_cols)} voltage columns and {len(current_cols)} current/current-density columns; importing matched pairs."

    if len(pair_specs) == 1:
        return None
    out: list[tuple[TraceData, ImportQualitySummary]] = []
    for vcol, icol in pair_specs:
        current_meta = _current_metadata(icol) or {}
        trace, quality = _build_trace_from_arrays(
            df[vcol],
            df[icol],
            _trace_name_from_header(icol),
            metadata={
                "format": "plain-wide",
                "voltage_col": str(vcol),
                "current_col": str(icol),
                "import_summary": summary,
                **current_meta,
            },
        )
        quality.warnings.append(warning)
        trace.metadata["quality"] = quality.model_dump()
        out.append((trace, quality))
    return out

def import_csv_text_multi(payload: ImportCsvTextRequest) -> list[tuple[TraceData, ImportQualitySummary]]:
    """Import plain or HappyMeasure single/wide/long CSV text as one or more traces."""
    comments = _metadata_lines(payload.text)
    schema = _metadata_value(comments, "schema")
    fmt = _metadata_value(comments, "format")
    data_text = _data_section_text(payload.text)
    if not data_text.strip():
        raise ValueError("No data section found in CSV text.")
    df = pd.read_csv(StringIO(data_text), sep=payload.delimiter if payload.delimiter else None, engine="python")

    def build_trace(vcol: str, icol: str, trace_id: str, extra_meta: dict | None = None) -> tuple[TraceData, ImportQualitySummary]:
        sub_text = df[[vcol, icol]].to_csv(index=False)
        req = ImportCsvTextRequest(text=sub_text, trace_id=trace_id, voltage_col=vcol, current_col=icol, delimiter=",")
        trace, quality = import_csv_text(req)
        trace.metadata.update({"happymeasure_schema": schema, "happymeasure_format": fmt, **(extra_meta or {})})
        return trace, quality

    cols = list(df.columns)
    norm = {str(c).lower().strip().replace(" ", "_"): c for c in cols}
    plain_long = _plain_long_multi_trace(df, payload)
    if plain_long is not None:
        return plain_long
    if fmt == "long-v2" or {"trace_index", "source_value", "measured_value"}.issubset(set(norm)):
        trace_col = norm.get("trace_index")
        name_col = norm.get("device_name")
        mode_col = norm.get("mode")
        source_col = norm.get("source_value")
        measured_col = norm.get("measured_value")
        out: list[tuple[TraceData, ImportQualitySummary]] = []
        for key, group in df.groupby(trace_col, sort=False):
            name = str(group[name_col].iloc[0]) if name_col else f"Trace {key}"
            mode = str(group[mode_col].iloc[0]) if mode_col else ""
            current_source = _mode_is_current_source(mode, source_col, measured_col)
            if current_source:
                voltage = group[measured_col]
                current = group[source_col]
                vcol, icol = str(measured_col), str(source_col)
            else:
                voltage = group[source_col]
                current = group[measured_col]
                vcol, icol = str(source_col), str(measured_col)
            trace_id = f"T{int(key):03d} {name}" if str(key).isdigit() else f"T{key} {name}"
            trace, quality = _build_trace_from_arrays(
                voltage, current, trace_id,
                metadata={
                    "happymeasure_schema": schema,
                    "happymeasure_format": "long-v2",
                    "happymeasure_mode": mode or ("CURR" if current_source else "VOLT"),
                    "trace_index": str(key),
                    "voltage_col": vcol,
                    "current_col": icol,
                },
            )
            if current_source:
                quality.warnings.append("HappyMeasure current-source trace converted to IV-fitter voltage/current arrays.")
                trace.metadata["quality"] = quality.model_dump()
            out.append((trace, quality))
        if not out:
            raise ValueError("No HappyMeasure long-v2 traces found.")
        return out
    if fmt == "wide-v2" or any(str(c).startswith("T") and "[" in str(c) for c in cols):
        xcol = cols[1] if str(cols[0]).lower().strip() == "elapsed_s" and len(cols) > 2 else (payload.voltage_col or _infer_column(cols, "voltage"))
        out = []
        for icol in cols:
            if icol == xcol or str(icol).lower().strip() == "elapsed_s":
                continue
            if not pd.to_numeric(df[icol], errors="coerce").notna().any():
                continue
            current_source = _mode_is_current_source("", xcol, icol)
            if current_source:
                voltage = df[icol]
                current = df[xcol]
                vcol, ccol = str(icol), str(xcol)
            else:
                voltage = df[xcol]
                current = df[icol]
                vcol, ccol = str(xcol), str(icol)
            trace, quality = _build_trace_from_arrays(
                voltage, current, str(icol).replace("[", " ").replace("]", "").strip(),
                metadata={
                    "happymeasure_schema": schema,
                    "happymeasure_format": "wide-v2",
                    "happymeasure_mode": "CURR" if current_source else "VOLT",
                    "voltage_col": vcol,
                    "current_col": ccol,
                },
            )
            if current_source:
                quality.warnings.append("HappyMeasure current-source wide trace converted to IV-fitter voltage/current arrays.")
                trace.metadata["quality"] = quality.model_dump()
            out.append((trace, quality))
        if not out:
            raise ValueError("No HappyMeasure wide-v2 measured trace columns found.")
        return out
    plain_wide = _plain_wide_multi_trace(df, payload)
    if plain_wide is not None:
        return plain_wide
    trace, quality = import_csv_text(payload)
    trace.metadata.update({"happymeasure_schema": schema, "happymeasure_format": fmt or "single-v2" if schema else "plain"})
    return [(trace, quality)]


def import_csv(path: str, voltage_col: str = "V", current_col: str = "I") -> TraceData:
    """Import a CSV file path using explicit column names."""
    text = open(path, "r", encoding="utf-8").read()
    trace, _quality = import_csv_text(ImportCsvTextRequest(text=text, trace_id=path, voltage_col=voltage_col, current_col=current_col))
    return trace
