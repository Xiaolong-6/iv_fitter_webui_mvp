"""Markdown report/export helpers."""
from __future__ import annotations
from ivfitter.core.model_spec import FitResult


def fit_result_markdown(result: FitResult) -> str:
    """Return a compact reproducible Markdown report for one fit result."""
    lines: list[str] = []
    lines.append(f"# IV-fitter Web report")
    lines.append("")
    lines.append(f"Software version: `{result.software_version}`")
    lines.append(f"Success: `{result.success}`")
    lines.append(f"Reportable: `{result.reportable}`")
    lines.append(f"Reportability reason: {result.reportability_reason}")
    lines.append(f"Message: {result.message}")
    lines.append("")
    lines.append("## Metrics")
    for key, value in result.metrics.items():
        lines.append(f"- `{key}`: {value:.6g}")
    lines.append("")
    if result.fit_diagnostics is not None:
        d = result.fit_diagnostics
        lines.append("## Fit process diagnostics")
        lines.append(f"- Trace: `{d.trace_name or '—'}`")
        lines.append(f"- Model signature: `{d.model_signature or '—'}`")
        lines.append(f"- Mode / solver: `{d.fit_mode or '—'}` / `{d.solver_name or '—'}`")
        lines.append(f"- Points used: `{d.points_used}` of `{d.points_in_selected_range}` selected (`{d.points_excluded}` excluded)")
        lines.append(f"- Free parameters / DoF: `{d.free_parameter_count}` / `{d.degrees_of_freedom}`")
        lines.append(f"- Elapsed: `{d.elapsed_s:.6g} s`" if d.elapsed_s is not None else "- Elapsed: `—`")
        lines.append(f"- Function evaluations: `{d.function_evaluations}`")
        lines.append(f"- Jacobian evaluations: `{d.jacobian_evaluations}`")
        lines.append(f"- Optimizer status: `{d.optimizer_status}` — {d.optimizer_message or '—'}")
        if d.active_bounds:
            lines.append(f"- Active bounds: `{', '.join(d.active_bounds)}`")
        lines.append("- Note: relative weighted reduced chi-square is statistically strict only when residual weights represent measurement uncertainty; otherwise it is a residual-scale diagnostic.")
        lines.append("")
    lines.append("## Warnings")
    if result.warnings:
        for warning in result.warnings:
            lines.append(f"- **{warning.severity}** `{warning.code}`: {warning.message}")
    else:
        lines.append("No warnings.")
    lines.append("")
    lines.append("## Parameters")
    lines.append("| Parameter | Value | Std. err. | State | Bounds |")
    lines.append("|---|---:|---:|---|---|")
    for key, param in result.parameters.items():
        stderr = "—" if param.stderr is None else f"{param.stderr:.3g}"
        bounds = f"{param.lower if param.lower is not None else '-∞'} … {param.upper if param.upper is not None else '∞'}"
        lines.append(f"| `{key}` | {param.value:.8g} {param.unit or ''} | {stderr} | {'fixed' if param.fixed else 'fit'} | {bounds} |")
    lines.append("")
    lines.append("## Equations")
    for section in (result.equations.voltage_relation, result.equations.core, result.equations.series, result.equations.parallel, result.equations.auxiliary):
        for eq in section:
            lines.append(f"- `{eq}`")
    return "\n".join(lines) + "\n"
