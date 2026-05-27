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

function finitePairs(x: number[], y: number[]) {
  const pairs: Array<[number, number]> = [];
  const n = Math.min(x.length, y.length);
  for (let i = 0; i < n; i++) {
    if (Number.isFinite(x[i]) && Number.isFinite(y[i])) pairs.push([x[i], y[i]]);
  }
  return pairs;
}

function range(values: number[], fallback: [number, number]): [number, number] {
  if (!values.length) return fallback;
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return fallback;
  if (min === max) { min -= 1; max += 1; }
  const pad = 0.05 * (max - min || 1);
  return [min - pad, max + pad];
}

function makeSvgPlot({ title, x, series, yLabel }: { title: string; x: number[]; yLabel: string; series: Array<{ label: string; y: number[]; color: string }> }) {
  const width = 520;
  const height = 280;
  const margin = { left: 58, right: 18, top: 38, bottom: 42 };
  const allPairs = series.flatMap((s) => finitePairs(x, s.y));
  const xs = allPairs.map(([vx]) => vx);
  const ys = allPairs.map(([, vy]) => vy);
  const [xmin, xmax] = range(xs, [-1, 1]);
  const [ymin, ymax] = range(ys, [-1, 1]);
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const sx = (v: number) => margin.left + ((v - xmin) / (xmax - xmin)) * plotW;
  const sy = (v: number) => margin.top + plotH - ((v - ymin) / (ymax - ymin)) * plotH;
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const grid = ticks.map((t) => {
    const gx = margin.left + t * plotW;
    const gy = margin.top + t * plotH;
    const xv = xmin + t * (xmax - xmin);
    const yv = ymax - t * (ymax - ymin);
    return `<line x1="${gx}" x2="${gx}" y1="${margin.top}" y2="${margin.top + plotH}" class="grid"/><line x1="${margin.left}" x2="${margin.left + plotW}" y1="${gy}" y2="${gy}" class="grid"/><text x="${gx}" y="${height - 15}" text-anchor="middle" class="tick">${escapeHtml(fmtEng(xv, 3))}</text><text x="${margin.left - 8}" y="${gy + 4}" text-anchor="end" class="tick">${escapeHtml(fmtEng(yv, 3))}</text>`;
  }).join("");
  const paths = series.map((s) => {
    const pairs = finitePairs(x, s.y).sort((a, b) => a[0] - b[0]);
    const d = pairs.map(([vx, vy], idx) => `${idx ? "L" : "M"} ${sx(vx).toFixed(2)} ${sy(vy).toFixed(2)}`).join(" ");
    return `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2.2"/><g>${pairs.filter((_, idx) => idx % Math.max(1, Math.ceil(pairs.length / 100)) === 0).map(([vx, vy]) => `<circle cx="${sx(vx).toFixed(2)}" cy="${sy(vy).toFixed(2)}" r="1.7" fill="${s.color}"/>`).join("")}</g>`;
  }).join("");
  const legend = series.map((s, idx) => `<g transform="translate(${margin.left + 8},${margin.top + 12 + idx * 17})"><rect width="10" height="10" rx="2" fill="${s.color}"/><text x="16" y="9" class="legend">${escapeHtml(s.label)}</text></g>`).join("");
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(title)}"><rect width="${width}" height="${height}" rx="14" class="plot-bg"/><text x="${margin.left}" y="24" class="plot-title">${escapeHtml(title)}</text>${grid}<line x1="${margin.left}" x2="${margin.left + plotW}" y1="${margin.top + plotH}" y2="${margin.top + plotH}" class="axis"/><line x1="${margin.left}" x2="${margin.left}" y1="${margin.top}" y2="${margin.top + plotH}" class="axis"/><text x="16" y="${margin.top + plotH / 2}" transform="rotate(-90 16 ${margin.top + plotH / 2})" class="axis-label">${escapeHtml(yLabel)}</text>${paths}${legend}</svg>`;
}

function plotSection(result: FitResult) {
  const curves = result.curves;
  const x = curves.voltage_V ?? [];
  if (!x.length) return "";
  const measured = curves.current_measured_A ?? [];
  const fit = curves.current_fit_A ?? [];
  const residual = curves.residual_A ?? [];
  const logAbs = (values: number[]) => values.map((v) => Math.log10(Math.max(Math.abs(v), 1e-30)));
  const plots = [
    makeSvgPlot({ title: "Linear I-V", x, yLabel: "Current (A)", series: [{ label: "measured", y: measured, color: "#2563eb" }, { label: "fit", y: fit, color: "#f97316" }] }),
    makeSvgPlot({ title: "Log |I|", x, yLabel: "log10(|I|)", series: [{ label: "measured", y: logAbs(measured), color: "#2563eb" }, { label: "fit", y: logAbs(fit), color: "#f97316" }] }),
    makeSvgPlot({ title: "Signed residual", x, yLabel: "Residual (A)", series: [{ label: "residual", y: residual, color: "#2563eb" }] }),
    makeSvgPlot({ title: "Log |residual|", x, yLabel: "log10(|residual|)", series: [{ label: "log residual", y: logAbs(residual), color: "#2563eb" }] }),
  ].join("");
  return `<section class="card"><h2>Plots</h2><div class="plot-grid">${plots}</div></section>`;
}

export function buildHtmlReportDocument({ result, trace, markdownReport = "", appVersion = "dev", exportedAt = new Date(), includePlots = true }: { result: FitResult; trace: TraceData; markdownReport?: string; appVersion?: string; exportedAt?: Date; includePlots?: boolean }) {
  const traceName = String(trace.metadata?.trace_name ?? trace.trace_id ?? "trace");
  const metricRows = Object.entries(result.metrics ?? {}).map(([key, value]) => `<tr><th>${escapeHtml(key)}</th><td>${escapeHtml(fmtEng(Number(value), 5))}</td></tr>`).join("");
  const parameterRows = Object.entries(result.parameters ?? {}).map(([key, value]) => `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(fmtEng(value.value, 5))}</td><td>${escapeHtml(value.unit ?? "")}</td><td>${escapeHtml(value.fixed ? "fixed" : "fit")}</td><td>${escapeHtml(value.stderr == null ? "" : fmtEng(value.stderr, 4))}</td></tr>`).join("");
  const warningRows = (result.warnings ?? []).map((warning) => `<li><strong>${escapeHtml(warning.severity)}</strong> ${escapeHtml(warning.code)} — ${escapeHtml(warning.message)}</li>`).join("") || "<li>No warnings.</li>";
  const reportBody = markdownReport ? `<pre>${escapeHtml(markdownReport)}</pre>` : "";
  const badgeBg = result.reportable ? "#ecfdf5" : "#fffbeb";
  const badgeFg = result.reportable ? "#047857" : "#92400e";
  const plots = includePlots ? plotSection(result) : "";
  return `<!doctype html><html><head><meta charset="utf-8"><title>IV-fitter report — ${escapeHtml(traceName)}</title><style>body{font-family:Inter,Segoe UI,Arial,sans-serif;margin:0;background:#f5f7fb;color:#0f172a}.page{max-width:1180px;margin:0 auto;padding:32px}.hero,.card{background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:22px;margin-bottom:18px;box-shadow:0 10px 28px rgba(15,23,42,.06)}h1{margin:0 0 8px;font-size:32px}h2{font-size:20px;margin:0 0 12px}.muted{color:#64748b}.badge{display:inline-block;border-radius:999px;padding:4px 10px;background:${badgeBg};color:${badgeFg};font-weight:800}table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #e2e8f0;text-align:left;padding:8px}th{color:#475569}pre{white-space:pre-wrap;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px;overflow:auto}ul{padding-left:22px}.plot-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.plot-bg{fill:#fff}.grid{stroke:#e2e8f0;stroke-width:1}.axis{stroke:#334155;stroke-width:1.2}.tick,.legend,.axis-label{fill:#475569;font-size:11px}.plot-title{fill:#0f172a;font-weight:800;font-size:15px}@media(max-width:760px){.plot-grid{grid-template-columns:1fr}.page{padding:16px}}</style></head><body><main class="page"><section class="hero"><span class="badge">${escapeHtml(result.reportable ? "Reportable" : "Review only")}</span><h1>IV-fitter report</h1><p class="muted">Trace: ${escapeHtml(traceName)} · Model: ${escapeHtml(modelSummaryFromResult(result))} · Software: ${escapeHtml(result.software_version || appVersion)}</p><p>${escapeHtml(result.message)}</p></section>${plots}<section class="card"><h2>Fit quality metrics</h2><table>${metricRows}</table></section><section class="card"><h2>Parameters</h2><table><thead><tr><th>Parameter</th><th>Value</th><th>Unit</th><th>Status</th><th>Std. err.</th></tr></thead><tbody>${parameterRows}</tbody></table></section><section class="card"><h2>Warnings and diagnostics</h2><ul>${warningRows}</ul></section>${reportBody ? `<section class="card"><h2>Generated report text</h2>${reportBody}</section>` : ""}<section class="card muted">Exported ${escapeHtml(exportedAt.toISOString())}</section></main></body></html>`;
}
