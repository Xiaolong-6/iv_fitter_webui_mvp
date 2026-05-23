"""Reproducible FitResult export helpers."""

from __future__ import annotations

import csv
import io

from ivfitter.core.model_spec import FitResult


def fit_result_json_text(result: FitResult) -> str:
    """Return a deterministic JSON representation of a FitResult."""
    return result.model_dump_json(indent=2)


def parameter_csv_text(result: FitResult) -> str:
    """Return fitted parameters as CSV text for spreadsheet inspection."""
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["parameter", "value", "unit", "fixed", "lower", "upper", "stderr"])
    for name, param in sorted(result.parameters.items()):
        writer.writerow([name, param.value, param.unit or "", param.fixed, param.lower, param.upper, param.stderr])
    return buf.getvalue()
