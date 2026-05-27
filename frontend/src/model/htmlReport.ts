import type { FitResult, TraceData } from "./types";
import { fmtEng } from "./format";

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

function modelSummaryFromResult(result: FitResult) {
  const components = [...result.model.series, ...result.model.core, ...result.model.parallel];
  return components.map((component) => String(component.metadata?.nickname ?? component.id)).join(" + ") || "No model";
}

export function buildHtmlReportDocument({ result, trace, markdownReport = "", appVersion = "dev", exportedAt = new Date() }: { result: FitResult; trace: TraceData; markdownReport?: string; appVersion?: string; exportedAt?: Date }) {
  const traceName = String(trace.metadata?.trace_name ?? trace.trace_id ?? "trace");
  const metricRows = Object.entries(result.metrics ?? {}).map(([key, value]) => `<tr><th>${escapeHtml(key)}</th><td>${escapeHtml(fmtEng(Number(value), 5))}</td></tr>`).join("");
  const parameterRows = Object.entries(result.parameters ?? {}).map(([key, value]) => `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(fmtEng(value.value, 5))}</td><td>${escapeHtml(value.unit ?? "")}</td><td>${escapeHtml(value.fixed ? "fixed" : "fit")}</td><td>${escapeHtml(value.stderr == null ? "" : fmtEng(value.stderr, 4))}</td></tr>`).join("");
  const warningRows = (result.warnings ?? []).map((warning) => `<li><strong>${escapeHtml(warning.severity)}</strong> ${escapeHtml(warning.code)} — ${escapeHtml(warning.message)}</li>`).join("") || "<li>No warnings.</li>";
  const reportBody = markdownReport ? `<pre>${escapeHtml(markdownReport)}</pre>` : "";
  const badgeBg = result.reportable ? "#ecfdf5" : "#fffbeb";
  const badgeFg = result.reportable ? "#047857" : "#92400e";
  return `<!doctype html><html><head><meta charset="utf-8"><title>IV-fitter report — ${escapeHtml(traceName)}</title><style>body{font-family:Inter,Segoe UI,Arial,sans-serif;margin:0;background:#f5f7fb;color:#0f172a}.page{max-width:1080px;margin:0 auto;padding:32px}.hero,.card{background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:22px;margin-bottom:18px;box-shadow:0 10px 28px rgba(15,23,42,.06)}h1{margin:0 0 8px;font-size:32px}h2{font-size:20px;margin:0 0 12px}.muted{color:#64748b}.badge{display:inline-block;border-radius:999px;padding:4px 10px;background:${badgeBg};color:${badgeFg};font-weight:800}table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #e2e8f0;text-align:left;padding:8px}th{color:#475569}pre{white-space:pre-wrap;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px;overflow:auto}ul{padding-left:22px}</style></head><body><main class="page"><section class="hero"><span class="badge">${escapeHtml(result.reportable ? "Reportable" : "Review only")}</span><h1>IV-fitter report</h1><p class="muted">Trace: ${escapeHtml(traceName)} · Model: ${escapeHtml(modelSummaryFromResult(result))} · Software: ${escapeHtml(result.software_version || appVersion)}</p><p>${escapeHtml(result.message)}</p></section><section class="card"><h2>Fit quality metrics</h2><table>${metricRows}</table></section><section class="card"><h2>Parameters</h2><table><thead><tr><th>Parameter</th><th>Value</th><th>Unit</th><th>Status</th><th>Std. err.</th></tr></thead><tbody>${parameterRows}</tbody></table></section><section class="card"><h2>Warnings and diagnostics</h2><ul>${warningRows}</ul></section>${reportBody ? `<section class="card"><h2>Generated report text</h2>${reportBody}</section>` : ""}<section class="card muted">Exported ${escapeHtml(exportedAt.toISOString())}</section></main></body></html>`;
}
