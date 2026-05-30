"""FastAPI application for the greenfield IV-fitter backend."""

from __future__ import annotations
import asyncio
import hmac
import json
import logging
import ntpath
import os
import subprocess
import sys
import threading
import time
from contextlib import contextmanager
from typing import NoReturn

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ValidationError

from ivfitter import __version__
from ivfitter.core.component_registry import component_registry
from ivfitter.core.equations import generate_equations
from ivfitter.core.topology_graph import assemble_graph, graph_text_summary
from ivfitter.core.fitting_engine import fit_trace
from ivfitter.core.model_spec import FitRequest, FitWarning, FitResult, ModelSpec
from ivfitter.core.bounds_suggestion import BoundsSuggestionRequest, BoundsSuggestionResponse, suggest_bounds
from ivfitter.core.synthetic_trace import SyntheticTraceRequest, SyntheticTraceResult, generate_synthetic_trace
from ivfitter.core.model_validation import validate_model_spec
from ivfitter.io.export_report import fit_result_markdown
from ivfitter.io.default_import_dir import resolve_default_import_dir
from ivfitter.io.import_trace import ImportCsvTextRequest, import_csv_text, import_csv_text_multi
from ivfitter.io.export_result import fit_result_json_text, report_csv_text


app = FastAPI(title="IV-fitter Web Backend", version=__version__)
LOGGER = logging.getLogger(__name__)


def _cors_origins() -> list[str]:
    raw = os.getenv("IVFITTER_CORS_ORIGINS", "http://127.0.0.1:5173,http://localhost:5173")
    return [origin.strip() for origin in raw.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "X-IVFITTER-API-Key"],
)

def _api_token() -> str | None:
    token = os.getenv("IVFITTER_API_TOKEN", "").strip()
    return token or None


def _debug_errors_enabled() -> bool:
    return os.getenv("IVFITTER_DEBUG_ERRORS", "").strip().lower() in {"1", "true", "yes", "on"}


def _raise_internal_error(exc: Exception, context: str) -> NoReturn:
    LOGGER.exception("%s", context)
    detail = str(exc) if _debug_errors_enabled() else "Internal server error. See backend log for details."
    raise HTTPException(status_code=500, detail=detail) from exc




def _is_loopback_request(request: Request) -> bool:
    host = (request.client.host if request.client else "").strip().lower()
    return host in {"127.0.0.1", "::1", "localhost", "testclient"}


def _require_loopback_for_local_file_dialog(request: Request) -> None:
    """Keep the server-side file picker unavailable to remote LAN clients.

    The dialog opens on the backend host and reads a selected local file from
    that same host.  Desktop localhost use remains unchanged, while LAN clients
    must use paste/upload text endpoints instead of remotely triggering local
    server file access.
    """
    if not _is_loopback_request(request):
        raise HTTPException(status_code=403, detail="Local file dialog is only available from localhost.")

def _public_selected_name(path: str) -> str:
    # ntpath handles both POSIX and Windows separators on every platform.
    return ntpath.basename(path)


@app.middleware("http")
async def require_api_token_when_configured(request: Request, call_next):
    """Require a simple API token only when IVFITTER_API_TOKEN is configured.

    The default desktop workflow remains frictionless on localhost. LAN/dev
    launchers can set IVFITTER_API_TOKEN and the frontend sends the same value
    as X-IVFITTER-API-Key. Health/version remain open for diagnostics.
    """
    token = _api_token()
    if token and request.method.upper() != "OPTIONS" and request.url.path not in {"/api/health", "/api/version", "/api/v2/health", "/api/v2/version"}:
        supplied = request.headers.get("X-IVFITTER-API-Key", "")
        if not hmac.compare_digest(supplied, token):
            return JSONResponse(status_code=401, content={"detail": "Missing or invalid IV-fitter API token."})
    return await call_next(request)


MAX_IMPORT_TEXT_CHARS = int(os.getenv("IVFITTER_MAX_IMPORT_TEXT_CHARS", "5000000"))
MAX_FIT_POINTS = int(os.getenv("IVFITTER_MAX_FIT_POINTS", "50000"))
MAX_CONCURRENT_CPU_REQUESTS = max(1, int(os.getenv("IVFITTER_MAX_CONCURRENT_FITS", "2")))
FILE_DIALOG_TIMEOUT_S = float(os.getenv("IVFITTER_FILE_DIALOG_TIMEOUT_S", "30"))
_CPU_SEMAPHORE = threading.BoundedSemaphore(MAX_CONCURRENT_CPU_REQUESTS)
_RATE_LIMIT_LOCK = threading.Lock()
_RATE_LIMIT_BUCKETS: dict[str, tuple[float, float]] = {}


@contextmanager
def _cpu_endpoint_slot(endpoint_label: str):
    """Bound local CPU-heavy endpoints so accidental multi-clicks cannot saturate the host."""
    acquired = _CPU_SEMAPHORE.acquire(blocking=False)
    if not acquired:
        raise HTTPException(
            status_code=503,
            detail=f"{endpoint_label} is busy. Try again after the current compute job finishes.",
            headers={"Retry-After": "2"},
        )
    try:
        yield
    finally:
        _CPU_SEMAPHORE.release()


def _rate_limit_per_minute() -> int:
    try:
        return max(0, int(os.getenv("IVFITTER_RATE_LIMIT_PER_MIN", "600")))
    except ValueError:
        return 600


@app.middleware("http")
async def local_rate_limit_guard(request: Request, call_next):
    """Lightweight token-bucket guard for runaway local/LAN automation.

    Set IVFITTER_RATE_LIMIT_PER_MIN=0 to disable. Health/version and CORS
    preflight remain unthrottled for diagnostics and browser startup.
    """
    if request.method.upper() == "OPTIONS" or request.url.path in {"/api/health", "/api/version", "/api/v2/health", "/api/v2/version"}:
        return await call_next(request)
    limit = _rate_limit_per_minute()
    if limit <= 0:
        return await call_next(request)
    key = request.client.host if request.client else "unknown"
    now = time.monotonic()
    capacity = float(limit)
    refill_per_s = capacity / 60.0
    with _RATE_LIMIT_LOCK:
        tokens, last_seen = _RATE_LIMIT_BUCKETS.get(key, (capacity, now))
        tokens = min(capacity, tokens + max(0.0, now - last_seen) * refill_per_s)
        if tokens < 1.0:
            retry_after = max(1, int((1.0 - tokens) / refill_per_s) + 1)
            _RATE_LIMIT_BUCKETS[key] = (tokens, now)
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many IV-fitter API requests. Please slow down."},
                headers={"Retry-After": str(retry_after)},
            )
        _RATE_LIMIT_BUCKETS[key] = (tokens - 1.0, now)
    return await call_next(request)

def _check_import_size(text: str) -> None:
    if len(text) > MAX_IMPORT_TEXT_CHARS:
        raise HTTPException(status_code=413, detail=f"CSV text is too large ({len(text)} characters). Limit is {MAX_IMPORT_TEXT_CHARS} characters.")

def _check_fit_size(request: FitRequest) -> None:
    n_v = len(request.trace.voltage_V)
    n_i = len(request.trace.current_A)
    if max(n_v, n_i) > MAX_FIT_POINTS:
        raise HTTPException(status_code=413, detail=f"Trace has too many points ({max(n_v, n_i)}). Limit is {MAX_FIT_POINTS} points.")


class ReportResponse(BaseModel):
    markdown: str

@app.get("/api/v2/health")
@app.get("/api/health")
def health() -> dict[str, str]:
    """Return service health."""
    return {"status": "ok"}

@app.get("/api/v2/component-registry")
@app.get("/api/component-registry")
def get_component_registry():
    """Return function-library definitions consumed by the frontend."""
    return component_registry()

@app.post("/api/v2/validate-model")
@app.post("/api/validate-model")
def validate_model(model: ModelSpec) -> list[FitWarning]:
    """Validate a ModelSpec and return physics, schema, and UX warnings."""
    return validate_model_spec(model)

@app.post("/api/v2/equations")
@app.post("/api/equations")
def equations(model: ModelSpec):
    """Return generated equations for a ModelSpec."""
    return generate_equations(model)

@app.post("/api/v2/topology-preview")
@app.post("/api/topology-preview")
def topology_preview(model: ModelSpec):
    """Return user-readable topology graph preview."""
    graph = assemble_graph(model)
    return {"graph": graph, "summary": graph_text_summary(graph)}


@app.post("/api/v2/suggest-bounds", response_model=BoundsSuggestionResponse)
@app.post("/api/suggest-bounds", response_model=BoundsSuggestionResponse)
def suggest_bounds_endpoint(request: BoundsSuggestionRequest) -> BoundsSuggestionResponse:
    """Return conservative data-aware bound suggestions for the selected trace/model."""
    try:
        with _cpu_endpoint_slot("Bounds suggestion"):
            _check_fit_size(FitRequest(trace=request.trace, model=request.model, config=request.config))
            return suggest_bounds(request)
    except HTTPException:
        raise
    except (ValueError, ValidationError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        _raise_internal_error(exc, "Unhandled API error")

@app.post("/api/v2/generate-synthetic-trace", response_model=SyntheticTraceResult)
@app.post("/api/generate-synthetic-trace", response_model=SyntheticTraceResult)
def generate_synthetic_trace_endpoint(request: SyntheticTraceRequest) -> SyntheticTraceResult:
    """Forward-simulate an IV trace from the supplied ModelSpec."""
    try:
        with _cpu_endpoint_slot("Synthetic trace generation"):
            return generate_synthetic_trace(
                model=request.model,
                voltage_start=request.voltage_start,
                voltage_stop=request.voltage_stop,
                voltage_step=request.voltage_step,
                noise_config=request.noise_config,
                artifact_config=request.artifact_config,
                trace_name=request.trace_name,
                seed=request.seed,
            )
    except HTTPException:
        raise
    except (ValueError, ValidationError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        _raise_internal_error(exc, "Unhandled API error")

@app.post("/api/v2/fit")
@app.post("/api/fit")
def fit(request: FitRequest):
    """Run one local trace fit."""
    try:
        with _cpu_endpoint_slot("Fit"):
            _check_fit_size(request)
            return fit_trace(request)
    except HTTPException:
        raise
    except (ValueError, ValidationError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        _raise_internal_error(exc, "Unhandled API error")

@app.post("/api/v2/export-report", response_model=ReportResponse)
@app.post("/api/export-report", response_model=ReportResponse)
def export_report(result: FitResult) -> ReportResponse:
    """Return a Markdown report for one fit result."""
    return ReportResponse(markdown=fit_result_markdown(result))

class TextResponse(BaseModel):
    text: str

class OpenImportFileDialogResponse(BaseModel):
    canceled: bool = False
    traces: list[object] = []
    selected_path: str | None = None
    selected_name: str | None = None
    default_dir: str | None = None
    summary: str | None = None
    warnings: list[str] = []


def _multi_import_response(items) -> dict:
    traces = [{"trace": trace, "quality": quality} for trace, quality in items]
    seen_warnings: dict[str, None] = {}
    for _trace, quality in items:
        for warning in getattr(quality, "warnings", []) or []:
            seen_warnings[str(warning)] = None
    warnings = list(seen_warnings)
    summary = None
    if len(items) > 1:
        first_meta = getattr(items[0][0], "metadata", {}) or {}
        summary = first_meta.get("import_summary") if isinstance(first_meta, dict) else None
        if not summary:
            summary = f"Imported {len(items)} traces."
    return {"traces": traces, "summary": summary, "warnings": warnings}

@app.post("/api/v2/import-csv-text")
@app.post("/api/import-csv-text")
def import_csv_text_endpoint(payload: ImportCsvTextRequest):
    """Import CSV/TXT text and return TraceData plus import-quality summary."""
    try:
        _check_import_size(payload.text)
        trace, quality = import_csv_text(payload)
        return {"trace": trace, "quality": quality}
    except HTTPException:
        raise
    except (ValueError, ValidationError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        _raise_internal_error(exc, "Unhandled API error")

@app.post("/api/v2/import-csv-text-multi")
@app.post("/api/import-csv-text-multi")
def import_csv_text_multi_endpoint(payload: ImportCsvTextRequest):
    """Import plain/HappyMeasure CSV text and return one or more traces."""
    try:
        _check_import_size(payload.text)
        return _multi_import_response(import_csv_text_multi(payload))
    except HTTPException:
        raise
    except (ValueError, ValidationError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        _raise_internal_error(exc, "Unhandled API error")

def _open_file_dialog_subprocess(default_dir) -> str:
    """Open tkinter in a child process so the API worker is bounded by a timeout."""
    script = '\nimport json\nimport sys\ntry:\n    import tkinter as tk\n    from tkinter import filedialog\n    initialdir = sys.argv[1] or None\n    root = tk.Tk()\n    root.withdraw()\n    root.update()\n    try:\n        root.attributes("-topmost", True)\n        root.lift()\n        root.focus_force()\n        root.after(500, lambda: root.attributes("-topmost", False))\n        selected = filedialog.askopenfilename(\n            parent=root,\n            title="Import CSV/TXT",\n            initialdir=initialdir,\n            filetypes=[\n                ("IV trace files", "*.csv *.txt *.dat"),\n                ("CSV files", "*.csv"),\n                ("Text files", "*.txt"),\n                ("DAT files", "*.dat"),\n                ("All files", "*.*"),\n            ],\n        )\n    finally:\n        root.destroy()\n    print(json.dumps({"selected": selected}))\nexcept Exception as exc:\n    print(json.dumps({"error": str(exc)}))\n    raise SystemExit(2)\n'
    try:
        completed = subprocess.run(
            [sys.executable, "-c", script, str(default_dir) if default_dir else ""],
            capture_output=True,
            text=True,
            timeout=FILE_DIALOG_TIMEOUT_S,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        raise HTTPException(status_code=408, detail="Local file dialog timed out. Use drag-and-drop, file upload, or paste import instead.") from exc
    payload_text = (completed.stdout or "").strip().splitlines()[-1] if (completed.stdout or "").strip() else "{}"
    try:
        payload = json.loads(payload_text)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=501, detail="Local file dialog did not return a valid selection payload.") from exc
    if completed.returncode != 0 or payload.get("error"):
        raise HTTPException(status_code=501, detail=f"Local file dialog is not available: {payload.get('error') or completed.stderr.strip()}")
    return str(payload.get("selected") or "")


@app.post("/api/v2/open-import-file-dialog", response_model=OpenImportFileDialogResponse)
@app.post("/api/open-import-file-dialog", response_model=OpenImportFileDialogResponse)
async def open_import_file_dialog(request: Request) -> OpenImportFileDialogResponse:
    """Open a local file picker at the demo IV traces folder when supported."""
    _require_loopback_for_local_file_dialog(request)
    default_dir = resolve_default_import_dir()
    selected = await asyncio.to_thread(_open_file_dialog_subprocess, default_dir)

    if not selected:
        return OpenImportFileDialogResponse(canceled=True, default_dir=str(default_dir) if default_dir else None)

    path = os.path.abspath(selected)
    if not path.lower().endswith((".csv", ".txt", ".dat")):
        raise HTTPException(status_code=422, detail="Selected file must be CSV, TXT, or DAT.")
    try:
        with open(path, "r", encoding="utf-8-sig") as handle:
            text = handle.read()
        _check_import_size(text)
        imported = _multi_import_response(import_csv_text_multi(ImportCsvTextRequest(text=text, trace_id=os.path.basename(path))))
        selected_name = _public_selected_name(path)
        return OpenImportFileDialogResponse(
            traces=imported["traces"],
            selected_path=selected_name,
            selected_name=selected_name,
            default_dir=str(default_dir) if default_dir else None,
            summary=imported.get("summary"),
            warnings=imported.get("warnings", []),
        )
    except HTTPException:
        raise
    except (ValueError, ValidationError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        _raise_internal_error(exc, "Unhandled API error")


@app.post("/api/v2/export-report-csv", response_model=TextResponse)
@app.post("/api/export-report-csv", response_model=TextResponse)
def export_report_csv(result: FitResult) -> TextResponse:
    """Return a sectioned, spreadsheet-friendly fit report CSV."""
    return TextResponse(text=report_csv_text(result))


@app.post("/api/v2/export-result-json", response_model=TextResponse)
@app.post("/api/export-result-json", response_model=TextResponse)
def export_result_json(result: FitResult) -> TextResponse:
    """Return a reproducible FitResult JSON document."""
    return TextResponse(text=fit_result_json_text(result))



@app.get("/api/v2/version")
@app.get("/api/version")
def version() -> dict[str, str]:
    """Return backend version and schema milestone."""
    return {"version": __version__, "schema": "ModelSpec/FitResult law-form-placement + HappyMeasure multi-trace"}
