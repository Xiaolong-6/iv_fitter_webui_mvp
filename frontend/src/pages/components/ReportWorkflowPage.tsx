import type { PointerEvent as ReactPointerEvent } from "react";
import type { ComponentSpec, FitResult, FitSessionStats, ModelSpec, TraceData } from "../../model/types";
import type { FitLifecycleState } from "../../model/fitLifecycle";
import type { AppView } from "../../components/WorkflowSidebar";
import { FitProcessDiagnostics } from "../../components/FitStatusBar";
import { MathFormula } from "../../components/MathFormula";
import { fmtEng } from "../../model/format";
import { type Language } from "../../model/i18n";
import { fitStateText, modelSummary } from "./WorkflowStatus";

function modelEquationLines(summary: FitResult["equations"] | null | undefined) {
  if (!summary) return [] as string[];
  return [
    ...(summary.voltage_relation ?? []),
    ...(summary.series ?? []),
    ...(summary.core ?? []),
    ...(summary.parallel ?? []),
    ...(summary.auxiliary ?? []),
  ].filter(Boolean);
}

function parameterDisplayFromKey(key: string, model: ModelSpec) {
  const parts = key.split(".");
  const componentId = parts[0] ?? key;
  const paramName = parts.slice(1).join(".") || key;
  const components = [...model.series, ...model.core, ...model.parallel];
  const component = components.find((item) => item.id === componentId);
  const componentLabel = String(component?.metadata?.nickname ?? component?.id ?? componentId);
  const paramLabel = component?.params?.[paramName]?.label ?? paramName;
  const kind =
    component?.function_type === "series_diode_barrier"
      ? "Diode-like series barrier drop"
      : /ohmic/i.test(component?.law_id ?? "")
        ? component?.location === "series"
          ? "Ohmic series resistance"
          : "Ohmic leakage/current branch"
        : /shockley/i.test(component?.law_id ?? "") || component?.function_type === "diode"
          ? "Shockley diode"
          : String(component?.metadata?.display_name ?? component?.law_id ?? component?.function_type ?? "Model component");
  return { componentLabel, paramLabel, kind };
}

function parameterReliabilityNote(value: {
  value: number;
  stderr?: number | null;
  lower?: number | null;
  upper?: number | null;
  fixed?: boolean;
}) {
  if (value.fixed) return "fixed";
  const notes: string[] = [];
  if (Number.isFinite(value.stderr) && Math.abs(value.value) > 0 && Number(value.stderr) / Math.abs(value.value) > 1) notes.push("large uncertainty");
  if (value.lower != null && Number.isFinite(value.lower) && Math.abs(value.value - value.lower) <= Math.max(1e-30, Math.abs(value.lower) * 1e-4)) notes.push("near lower bound");
  if (value.upper != null && Number.isFinite(value.upper) && Math.abs(value.value - value.upper) <= Math.max(1e-30, Math.abs(value.upper) * 1e-4)) notes.push("near upper bound");
  return notes.join("; ") || "fit";
}

function componentPlainRole(component: ComponentSpec, language: Language) {
  const name = String(component.metadata?.nickname ?? component.id);
  const isZh = language === "zh";
  const placement = component.placement ?? "";
  const law = component.law_id ?? component.function_type;
  const isMain = placement.includes("series") || component.location === "series";
  if (/ohmic/i.test(law)) {
    if (isMain) {
      return isZh
        ? `${name} 是主路串联电阻：它让一部分外部电压消耗在主路上，所以支路实际看到的是较小的内部结点电压 Vj。`
        : `${name} is a main-path series resistance: it consumes part of the applied voltage, so the branches see the internal junction voltage Vj rather than the raw terminal voltage.`;
    }
    return isZh
      ? `${name} 是欧姆漏电/旁路支路：它在内部结点电压 Vj 下产生近似线性的漏电流。`
      : `${name} is an Ohmic leakage/shunt branch: it adds a nearly linear leakage current evaluated at the internal junction voltage Vj.`;
  }
  if (/shockley/i.test(law) || component.function_type === "diode") {
    return isZh ? `${name} 是 Shockley 二极管支路：它在 Vj 下产生指数型结电流。` : `${name} is a Shockley diode branch: it adds the exponential junction current evaluated at Vj.`;
  }
  if (component.function_type === "series_diode_barrier") {
    return isZh ? `${name} 是主路中的类二极管势垒压降：它改变外部电压与内部 Vj 的对应关系。` : `${name} is a diode-like barrier in the main path: it changes how terminal voltage maps to the internal voltage Vj.`;
  }
  if (component.function_type.includes("photocurrent") || component.function_type.includes("bias_dependent_current")) {
    return isZh ? `${name} 是偏压相关电流支路：它在 Vj 下加入一个额外电流项，方向由 direction_sign 约定。` : `${name} is a bias-dependent current branch: it adds an extra current term at Vj, with sign controlled by direction_sign.`;
  }
  return isZh ? `${name} 是 ${isMain ? "主路" : "支路"}模型项：它通过 ${law} law 参与当前拟合。` : `${name} is a ${isMain ? "main-path" : "branch"} model term using the ${law} law.`;
}

function equationDisplayParts(line: string) {
  const [prefix, ...rest] = line.split(":");
  const body = rest.length ? rest.join(":").trim() : line.trim();
  const label = rest.length ? prefix.trim() : "Equation";
  const latex = body
    .replace(/V_ext/g, "V_{ext}")
    .replace(/V_j/g, "V_j")
    .replace(/V_T/g, "V_T")
    .replace(/Σ/g, "\\sum")
    .replace(/I_branch/g, "I_{branch}")
    .replace(/I_([A-Za-z0-9]+)/g, "I_{$1}")
    .replace(/V_drop,([A-Za-z0-9_]+)/g, "V_{drop,$1}")
    .replace(/R_eff,([A-Za-z0-9_]+)/g, "R_{eff,$1}")
    .replace(/sp\(/g, "\\operatorname{softplus}(")
    .replace(/ln\(/g, "\\ln(")
    .replace(/exp\(/g, "\\exp(");
  const likelyFormula = /[=+\-*/^]|V_\{|I_\{|R_\{|\\sum|\\ln|\\operatorname/.test(latex);
  return { label, body, latex, likelyFormula };
}

function ReportEquationLine({ line }: { line: string }) {
  const parts = equationDisplayParts(line);
  return (
    <div className="report-equation-line">
      <span className="report-equation-label">{parts.label}</span>
      {parts.likelyFormula ? <MathFormula latex={parts.latex} className="report-formula" /> : <p>{parts.body}</p>}
    </div>
  );
}

function ModelAssemblyExplanation({ model, equationLines, language }: { model: ModelSpec; equationLines: string[]; language: Language }) {
  const isZh = language === "zh";
  const main = model.series;
  const branches = [...model.core, ...model.parallel];
  const mainNames = main.map((item) => String(item.metadata?.nickname ?? item.id)).join(" + ") || (isZh ? "无主路压降" : "no main-path drop");
  const branchNames = branches.map((item) => String(item.metadata?.nickname ?? item.id)).join(" + ") || (isZh ? "无支路" : "no current branch");
  return (
    <div className="report-model-explainer">
      <div className="report-model-plain-summary">
        <strong>{isZh ? "读法" : "How to read this model"}</strong>
        <p>
          {isZh
            ? `端口电压先经过主路（${mainNames}）得到内部结点电压 Vj；然后支路（${branchNames}）在 Vj 下产生电流并相加。`
            : `The terminal voltage first passes through the main path (${mainNames}) to give the internal junction voltage Vj. The branches (${branchNames}) then generate currents at Vj, and those branch currents are summed.`}
        </p>
      </div>
      <div className="report-core-equations">
        <div className="report-equation-line friendly-equation">
          <span className="report-equation-label">{isZh ? "电压关系" : "Voltage relation"}</span>
          <MathFormula latex="V_{ext}=V_j+\sum_k V_{drop,k}(I,V_j)" className="report-formula" />
        </div>
        <div className="report-equation-line friendly-equation">
          <span className="report-equation-label">{isZh ? "电流求和" : "Current sum"}</span>
          <MathFormula latex="I=\sum_m I_{branch,m}(V_j)" className="report-formula" />
        </div>
      </div>
      <div className="report-component-role-grid">
        {[...main, ...branches].map((component) => <div key={component.id} className="report-component-role">{componentPlainRole(component, language)}</div>)}
      </div>
      {equationLines.length ? (
        <details className="report-technical-equations">
          <summary>{isZh ? "查看后端技术公式摘要" : "Show backend technical equation summary"}</summary>
          <div className="report-equation-list technical-equation-list">
            {equationLines.map((line, idx) => <ReportEquationLine key={`${line}-${idx}`} line={line} />)}
          </div>
        </details>
      ) : null}
    </div>
  );
}

export function ReportWorkflowPage({
  selectedTrace,
  hasSelectedTrace,
  model,
  result,
  report,
  reportMessage,
  isFitting,
  fitLifecycle,
  fitPromotionNotice,
  fitSessionStats,
  onExportReportCsv,
  onExportReportHtml,
  setActiveView,
  language,
  appVersion,
  leftPct,
  onResizeStart,
}: {
  selectedTrace: TraceData;
  hasSelectedTrace: boolean;
  model: ModelSpec;
  result: FitResult | null;
  report: string;
  reportMessage: string;
  reportAvailable: boolean;
  isFitting: boolean;
  fitLifecycle: FitLifecycleState;
  fitPromotionNotice: string | null;
  fitSessionStats: FitSessionStats;
  onExportReportCsv: () => void;
  onExportReportHtml: () => void;
  setActiveView: (view: AppView) => void;
  language: Language;
  appVersion: string;
  leftPct: number;
  onResizeStart: (event: ReactPointerEvent<HTMLDivElement>) => void;
}) {
  const verdict = fitStateText(result, isFitting, fitLifecycle);
  const metricEntries = result ? Object.entries(result.metrics ?? {}) : [];
  const parameterEntries = result ? Object.entries(result.parameters ?? {}) : [];
  const equationLines = modelEquationLines(result?.equations ?? null);
  const traceName = hasSelectedTrace ? String(selectedTrace.metadata?.trace_name ?? selectedTrace.trace_id) : "No trace loaded";
  const reportStatus = result ? (result.reportable ? "Reportable" : "Review required") : isFitting ? "Running" : "Unavailable";

  return (
    <section
      className="workflow-page report-page scroll-page report-page-two-column resizable-report-grid scientific-report-page"
      style={{ gridTemplateColumns: `minmax(520px, ${leftPct}fr) 8px minmax(300px, ${100 - leftPct}fr)` }}
    >
      <main className="report-main-column">
        <div className="card report-status-card">
          <div className="report-status-header">
            <div>
              <h2>Fit quality: {reportStatus}</h2>
              <p className="muted">{traceName} · {modelSummary(model)} · v{appVersion}</p>
            </div>
            <span className={result?.reportable ? "report-status-pill ok" : result ? "report-status-pill warning" : "report-status-pill muted"}>{verdict}</span>
          </div>
          {!result && !isFitting ? (
            <div className="workflow-empty-state inline compact-empty-state">
              <p>No completed fit yet.</p>
              <button type="button" className="primary" onClick={() => setActiveView("fitting")}>Go to Fitting</button>
            </div>
          ) : null}
          {isFitting ? <p className="fit-primary-message info">Fit is running; report will be available after completion.</p> : null}
          {result ? <p>{result.message}</p> : null}
          {result?.reportability_reason ? <p className="muted">{result.reportability_reason}</p> : null}
        </div>

        {result ? (
          <div className="card report-model-equation-card">
            <h2>{language === "zh" ? "模型如何产生这条拟合曲线" : "How the model produces this fit"}</h2>
            <p className="muted">
              {language === "zh"
                ? "这里用用户语言说明主路、内部结点电压和支路电流的关系；技术公式可展开查看。"
                : "This section explains the fitted circuit in user-facing terms: main path, internal junction voltage, branch currents, and the equations behind them."}
            </p>
            <ModelAssemblyExplanation model={model} equationLines={equationLines.length ? equationLines : [modelSummary(model)]} language={language} />
          </div>
        ) : null}

        {fitPromotionNotice ? <div className="fit-full-note">{fitPromotionNotice}</div> : null}

        {result ? (
          <>
            <FitProcessDiagnostics result={result} language={language} sessionStats={fitSessionStats} />
            <div className="card report-diagnostics-card">
              <h2>Diagnostics</h2>
              {(result.warnings ?? []).length ? (
                <div className="report-warning-list">
                  {result.warnings.map((warning, idx) => (
                    <div className={`report-warning-item ${warning.severity}`} key={`${warning.code}-${idx}`}>
                      <strong>{warning.severity.toUpperCase()} · {warning.code}</strong>
                      <p>{warning.message}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">No warnings or errors reported by the fitting backend.</p>
              )}
            </div>

            <div className="card report-parameter-summary-card">
              <h2>Parameter summary</h2>
              <div className="table-wrap">
                <table className="parameter-table compact-parameter-table report-parameter-table">
                  <thead>
                    <tr><th>Component</th><th>Parameter</th><th>Value</th><th>Unit</th><th>Status</th><th>Std. err.</th><th>Note</th></tr>
                  </thead>
                  <tbody>
                    {parameterEntries.map(([key, value]) => {
                      const display = parameterDisplayFromKey(key, result.model);
                      return (
                        <tr key={key}>
                          <td><strong>{display.componentLabel}</strong><br /><span className="muted">{display.kind}</span></td>
                          <td>{display.paramLabel}</td>
                          <td>{fmtEng(value.value, 5)}</td>
                          <td>{value.unit ?? ""}</td>
                          <td>{value.fixed ? "fixed" : "fit"}</td>
                          <td>{value.stderr == null ? "-" : fmtEng(value.stderr, 4)}</td>
                          <td>{parameterReliabilityNote(value)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </main>
      <div className="pane-resizer" role="separator" aria-label="Resize Report page columns" onPointerDown={onResizeStart} />

      <aside className="report-side-column">
        <div className="card report-export-card report-export-sidebar-card">
          <h2>Exports</h2>
          <div className="report-actions report-export-actions-grid">
            <button type="button" className="primary" disabled={!result} onClick={onExportReportHtml}>{language === "zh" ? "下载 HTML 报告" : "Download HTML report"}</button>
            <button type="button" disabled={!report} onClick={onExportReportCsv}>{language === "zh" ? "下载 CSV 报告" : "Download report CSV"}</button>
          </div>
          {reportMessage ? <p className="muted">{reportMessage}</p> : null}
        </div>

        <div className="card report-metadata-card compact-report-summary-card">
          <h2>Quick summary</h2>
          <div className="report-side-facts">
            <span><strong>Status</strong>{reportStatus}</span>
            <span><strong>Warnings</strong>{result?.warnings.length ?? 0}</span>
            <span><strong>Metrics</strong>{metricEntries.length}</span>
            <span><strong>Parameters</strong>{parameterEntries.length}</span>
          </div>
        </div>

        {report ? (
          <details className="card report-text-card report-preview-card collapsed-raw-report">
            <summary>Markdown report text</summary>
            <pre className="report-text-preview user-report-preview">{report}</pre>
          </details>
        ) : null}
      </aside>
    </section>
  );
}
