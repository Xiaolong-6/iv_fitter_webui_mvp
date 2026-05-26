"""FastAPI application for the greenfield IV-fitter backend."""

from __future__ import annotations
import os
from fastapi import FastAPI, HTTPException
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
from ivfitter.io.export_result import fit_result_json_text, parameter_csv_text


app = FastAPI(title="IV-fitter Web Backend", version=__version__)

def _cors_origins() -> list[str]:
    raw = os.getenv("IVFITTER_CORS_ORIGINS", "http://127.0.0.1:5173,http://localhost:5173")
    return [origin.strip() for origin in raw.split(",") if origin.strip()]

app.add_middleware(CORSMiddleware, allow_origins=_cors_origins(), allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

MAX_IMPORT_TEXT_CHARS = int(os.getenv("IVFITTER_MAX_IMPORT_TEXT_CHARS", "5000000"))
MAX_FIT_POINTS = int(os.getenv("IVFITTER_MAX_FIT_POINTS", "50000"))

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

@app.get("/api/health")
def health() -> dict[str, str]:
    """Return service health."""
    return {"status": "ok"}

@app.get("/api/component-registry")
def get_component_registry():
    """Return function-library definitions consumed by the frontend."""
    return component_registry()

@app.post("/api/validate-model")
def validate_model(model: ModelSpec) -> list[FitWarning]:
    """Validate a ModelSpec and return physics, schema, and UX warnings."""
    return validate_model_spec(model)

@app.post("/api/equations")
def equations(model: ModelSpec):
    """Return generated equations for a ModelSpec."""
    return generate_equations(model)

@app.post("/api/topology-preview")
def topology_preview(model: ModelSpec):
    """Return user-readable topology graph preview."""
    graph = assemble_graph(model)
    return {"graph": graph, "summary": graph_text_summary(graph)}


@app.post("/api/suggest-bounds", response_model=BoundsSuggestionResponse)
def suggest_bounds_endpoint(request: BoundsSuggestionRequest) -> BoundsSuggestionResponse:
    """Return conservative data-aware bound suggestions for the selected trace/model."""
    try:
        _check_fit_size(FitRequest(trace=request.trace, model=request.model, config=request.config))
        return suggest_bounds(request)
    except (ValueError, ValidationError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

@app.post("/api/generate-synthetic-trace", response_model=SyntheticTraceResult)
def generate_synthetic_trace_endpoint(request: SyntheticTraceRequest) -> SyntheticTraceResult:
    """Forward-simulate an IV trace from the supplied ModelSpec."""
    try:
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
    except (ValueError, ValidationError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

@app.post("/api/fit")
def fit(request: FitRequest):
    """Run one local trace fit."""
    try:
        _check_fit_size(request)
        return fit_trace(request)
    except (ValueError, ValidationError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

@app.post("/api/export-report", response_model=ReportResponse)
def export_report(result: FitResult) -> ReportResponse:
    """Return a Markdown report for one fit result."""
    return ReportResponse(markdown=fit_result_markdown(result))

class ImportTraceResponse(BaseModel):
    trace: object
    quality: object

class TextResponse(BaseModel):
    text: str

class OpenImportFileDialogResponse(BaseModel):
    canceled: bool = False
    traces: list[object] = []
    selected_path: str | None = None
    default_dir: str | None = None

@app.post("/api/import-csv-text")
def import_csv_text_endpoint(payload: ImportCsvTextRequest):
    """Import CSV/TXT text and return TraceData plus import-quality summary."""
    try:
        _check_import_size(payload.text)
        trace, quality = import_csv_text(payload)
        return {"trace": trace, "quality": quality}
    except (ValueError, ValidationError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

@app.post("/api/import-csv-text-multi")
def import_csv_text_multi_endpoint(payload: ImportCsvTextRequest):
    """Import plain/HappyMeasure CSV text and return one or more traces."""
    try:
        _check_import_size(payload.text)
        return {"traces": [{"trace": trace, "quality": quality} for trace, quality in import_csv_text_multi(payload)]}
    except (ValueError, ValidationError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

@app.post("/api/open-import-file-dialog", response_model=OpenImportFileDialogResponse)
def open_import_file_dialog() -> OpenImportFileDialogResponse:
    """Open a local file picker at the demo IV traces folder when supported."""
    default_dir = resolve_default_import_dir()
    try:
        import tkinter as tk
        from tkinter import filedialog
    except Exception as exc:
        raise HTTPException(status_code=501, detail=f"Local file dialog is not available: {exc}") from exc

    root = tk.Tk()
    root.withdraw()
    root.update()
    try:
        root.attributes("-topmost", True)
        root.lift()
        root.focus_force()
        root.after(500, lambda: root.attributes("-topmost", False))
        selected = filedialog.askopenfilename(
            parent=root,
            title="Import CSV/TXT",
            initialdir=str(default_dir) if default_dir else None,
            filetypes=[
                ("IV trace files", "*.csv *.txt *.dat"),
                ("CSV files", "*.csv"),
                ("Text files", "*.txt"),
                ("DAT files", "*.dat"),
                ("All files", "*.*"),
            ],
        )
    finally:
        root.destroy()

    if not selected:
        return OpenImportFileDialogResponse(canceled=True, default_dir=str(default_dir) if default_dir else None)

    path = os.path.abspath(selected)
    if not path.lower().endswith((".csv", ".txt", ".dat")):
        raise HTTPException(status_code=422, detail="Selected file must be CSV, TXT, or DAT.")
    try:
        with open(path, "r", encoding="utf-8-sig") as handle:
            text = handle.read()
        _check_import_size(text)
        traces = [{"trace": trace, "quality": quality} for trace, quality in import_csv_text_multi(ImportCsvTextRequest(text=text, trace_id=os.path.basename(path)))]
        return OpenImportFileDialogResponse(traces=traces, selected_path=path, default_dir=str(default_dir) if default_dir else None)
    except (ValueError, ValidationError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

@app.post("/api/export-result-json", response_model=TextResponse)
def export_result_json(result: FitResult) -> TextResponse:
    """Return a reproducible FitResult JSON document."""
    return TextResponse(text=fit_result_json_text(result))

@app.post("/api/export-parameters-csv", response_model=TextResponse)
def export_parameters_csv(result: FitResult) -> TextResponse:
    """Return fitted parameters as CSV text."""
    return TextResponse(text=parameter_csv_text(result))


@app.get("/api/version")
def version() -> dict[str, str]:
    """Return backend version and schema milestone."""
    return {"version": __version__, "schema": "ModelSpec/FitResult law-form-placement + HappyMeasure multi-trace"}
