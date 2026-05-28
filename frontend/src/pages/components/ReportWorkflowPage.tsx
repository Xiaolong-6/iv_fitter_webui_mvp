import type { PointerEvent as ReactPointerEvent } from "react";
import type { FitResult, FitSessionStats, ModelSpec, ParameterResult, TraceData } from "../../model/types";
import type { FitLifecycleState } from "../../model/fitLifecycle";
import type { AppView } from "../../components/WorkflowSidebar";
import { FitProcessDiagnostics } from "../../components/FitStatusBar";
import { MathFormula } from "../../components/MathFormula";
import { fmtEng, formatValueWithUnit } from "../../model/format";
import { type Language } from "../../model/i18n";
import { fitStateText, modelSummary } from "./WorkflowStatus";

type ReportTone = "valid" | "review" | "invalid" | "none";
type ReportMode = "report" | "review" | "diagnostic" | "unavailable";

type ReportSemantics = {
  fitStatus: string;
  reportMode: string;
  mainIssue: string;
  usable: string;
  tone: ReportTone;
  mode: ReportMode;
  measuredScale: number;
  maxFitCurrent: number;
  maxResidual: number;
  nearBoundParameters: string[];
};

const REPORT_TEXT = {
  en: {
    noCompletedFit: "No completed fit yet.",
    goToFitting: "Go to Fitting",
    running: "Fit is running; report will be available after completion.",
    validFit: "Valid fit",
    needsReview: "Needs review",
    invalidFit: "Invalid fit",
    normalReport: "Validated report",
    reviewReport: "Review report",
    diagnosticOnly: "Diagnostic report only",
    unavailable: "Unavailable",
    usableYes: "Yes",
    usableNo: "No",
    noMainIssue: "No critical issue detected",
    numericalExplosion: "Numerical current explosion",
    solverFailure: "Optimizer did not produce a valid result",
    qualityGate: "Failed numerical quality checks",
    invalidTitle: "Invalid fit result",
    invalidBody: "The optimizer stopped, but the fitted result failed numerical quality checks. This result should not be used as a validated device model.",
    primaryReason: "Primary reason",
    nextStep: "Next step",
    nextStepText: "Review diagnostics, reset seeds or bounds, restrict the voltage range, or try a model with appropriate Rs/Rsh components.",
    suggestedActions: "Suggested actions",
    diagnostics: "Diagnostics grouped by root cause",
    criticalIssue: "Critical issue",
    warnings: "Warnings",
    technicalDetails: "Technical details",
    parameterSummary: "Parameter summary",
    diagnosticValues: "Values are shown for diagnostics only and were not promoted to model initials.",
    metrics: "Fit process and quality metrics",
    modelEvaluation: "Model evaluation summary",
    modelIntro: "This explains how the circuit is evaluated. For invalid fits it is shown after diagnostics because the first task is to understand why the result failed.",
    howRead: "How to read this model",
    voltageRelation: "External voltage balance",
    currentSum: "Total current",
    backendEquations: "Show technical equation details",
    exports: "Exports",
    downloadHtml: "Download HTML report",
    downloadCsv: "Download report CSV",
    downloadDiagnosticHtml: "Download diagnostic HTML",
    downloadDiagnosticCsv: "Download diagnostic CSV",
    diagnosticExportHelp: "This export is for troubleshooting only. It is not a validated fit report.",
    quickSummary: "Fit result",
    status: "Status",
    reportMode: "Report mode",
    mainIssue: "Main issue",
    maxFitCurrent: "Max fitted current",
    measuredScale: "Measured current scale",
    nearBoundParameters: "Near-bound parameters",
    usableAsReport: "Usable as validated report",
    reviewDiagnostics: "Review diagnostics",
    openBounds: "Open bounds/parameters",
    saferModel: "Try safer model",
    markdownReportText: "Markdown report text",
    noWarnings: "No warnings or errors reported by the fitting backend.",
    component: "Component",
    parameter: "Parameter",
    value: "Value",
    unit: "Unit",
    state: "Status",
    stdErr: "Std. err.",
    note: "Note",
    nearLower: "near lower bound",
    nearUpper: "near upper bound",
    weak: "large uncertainty",
    fixed: "fixed",
    fit: "fit",
    suspect: "suspect",
    collapsedOptimizer: "Optimizer message",
  },
  zh: {
    noCompletedFit: "还没有完成的拟合。",
    goToFitting: "返回拟合页",
    running: "拟合正在运行；完成后才能生成报告。",
    validFit: "有效拟合",
    needsReview: "需要复核",
    invalidFit: "无效拟合",
    normalReport: "已验证报告",
    reviewReport: "复核报告",
    diagnosticOnly: "仅诊断报告",
    unavailable: "不可用",
    usableYes: "是",
    usableNo: "否",
    noMainIssue: "未检测到关键问题",
    numericalExplosion: "数值电流爆炸",
    solverFailure: "优化器未产生有效结果",
    qualityGate: "未通过数值质量检查",
    invalidTitle: "无效拟合结果",
    invalidBody: "优化器已经停止，但拟合结果未通过数值质量检查。这个结果不能作为已验证的器件模型使用。",
    primaryReason: "主要原因",
    nextStep: "下一步",
    nextStepText: "查看 diagnostics，重置初值或边界，缩小电压范围，或尝试包含合理 Rs/Rsh 的模型。",
    suggestedActions: "建议操作",
    diagnostics: "按根因分组的 diagnostics",
    criticalIssue: "关键问题",
    warnings: "警告",
    technicalDetails: "技术细节",
    parameterSummary: "参数摘要",
    diagnosticValues: "这些数值仅用于诊断，未被提升为下一次拟合的模型初值。",
    metrics: "拟合过程和质量指标",
    modelEvaluation: "模型求解摘要",
    modelIntro: "这里解释电路模型如何求解。对于无效拟合，它放在 diagnostics 之后，因为应先理解为什么失败。",
    howRead: "如何阅读这个模型",
    voltageRelation: "外部电压平衡",
    currentSum: "总电流",
    backendEquations: "查看技术公式细节",
    exports: "导出",
    downloadHtml: "下载 HTML 报告",
    downloadCsv: "下载 CSV 报告",
    downloadDiagnosticHtml: "下载诊断 HTML",
    downloadDiagnosticCsv: "下载诊断 CSV",
    diagnosticExportHelp: "该导出仅用于排查问题，不是已验证拟合报告。",
    quickSummary: "拟合结果",
    status: "状态",
    reportMode: "报告模式",
    mainIssue: "主要问题",
    maxFitCurrent: "最大拟合电流",
    measuredScale: "实测电流尺度",
    nearBoundParameters: "贴近边界参数",
    usableAsReport: "可作为已验证报告",
    reviewDiagnostics: "查看 diagnostics",
    openBounds: "打开边界/参数",
    saferModel: "尝试更安全模型",
    markdownReportText: "Markdown 报告文本",
    noWarnings: "后端未报告 warnings 或 errors。",
    component: "组件",
    parameter: "参数",
    value: "数值",
    unit: "单位",
    state: "状态",
    stdErr: "标准误差",
    note: "说明",
    nearLower: "贴近下界",
    nearUpper: "贴近上界",
    weak: "不确定度大",
    fixed: "固定",
    fit: "拟合",
    suspect: "可疑",
    collapsedOptimizer: "优化器消息",
  },
} as const;

function rt(language: Language, key: keyof typeof REPORT_TEXT.en) {
  return REPORT_TEXT[language][key] ?? REPORT_TEXT.en[key];
}

function finiteAbs(values: number[] | undefined) {
  return (values ?? []).filter(Number.isFinite).map((value) => Math.abs(value));
}

function percentile(values: number[], fraction: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.max(0, Math.min(sorted.length - 1, Math.round((sorted.length - 1) * fraction)));
  return sorted[idx];
}

function dataScale(values: number[] | undefined) {
  const abs = finiteAbs(values);
  return Math.max(percentile(abs, 0.95), percentile(abs, 0.5), 1e-30);
}

function nearBoundLabel(parameter: ParameterResult, language: Language) {
  if (parameter.fixed || !Number.isFinite(parameter.value)) return null;
  const scale = Math.max(Math.abs(parameter.value), 1);
  if (parameter.lower != null && Number.isFinite(parameter.lower) && Math.abs(parameter.value - parameter.lower) <= scale * 1e-6) return rt(language, "nearLower");
  if (parameter.upper != null && Number.isFinite(parameter.upper) && Math.abs(parameter.value - parameter.upper) <= scale * 1e-6) return rt(language, "nearUpper");
  return null;
}

function suspectLabel(parameter: ParameterResult, language: Language) {
  if (!Number.isFinite(parameter.value)) return rt(language, "suspect");
  const near = nearBoundLabel(parameter, language);
  if (near) return near;
  if (parameter.stderr != null && Number.isFinite(parameter.stderr) && parameter.value !== 0 && Math.abs(parameter.stderr / parameter.value) > 1) return rt(language, "weak");
  return parameter.fixed ? rt(language, "fixed") : rt(language, "fit");
}

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
      ? "diode-like barrier"
      : /ohmic/i.test(component?.law_id ?? "")
        ? component?.location === "series"
          ? "series resistance"
          : "leakage/shunt"
        : /shockley/i.test(component?.law_id ?? "") || component?.function_type === "diode"
          ? "Shockley diode"
          : String(component?.metadata?.display_name ?? component?.law_id ?? component?.function_type ?? "model term");
  return { componentLabel, paramLabel, kind };
}

function componentPlainRole(component: ModelSpec["series"][number], language: Language) {
  const name = String(component.metadata?.nickname ?? component.id);
  const isZh = language === "zh";
  const law = component.law_id ?? component.function_type;
  const isMain = (component.placement ?? "").includes("series") || component.location === "series";
  if (/ohmic/i.test(law)) {
    return isMain
      ? isZh ? `${name}: 主路串联电阻，消耗一部分外部电压。` : `${name}: main-path series resistance; it consumes part of the applied voltage.`
      : isZh ? `${name}: 欧姆漏电/旁路支路，在内部电压下产生近似线性电流。` : `${name}: Ohmic leakage/shunt branch; it adds a nearly linear current at the internal voltage.`;
  }
  if (/shockley/i.test(law) || component.function_type === "diode") return isZh ? `${name}: Shockley 二极管支路，在内部电压下产生指数结电流。` : `${name}: Shockley diode branch; it adds exponential junction current at the internal voltage.`;
  if (component.function_type === "series_diode_barrier") return isZh ? `${name}: 主路类二极管势垒，改变端口电压到内部电压的映射。` : `${name}: diode-like main-path barrier; it changes how terminal voltage maps to internal voltage.`;
  return isZh ? `${name}: ${isMain ? "主路" : "支路"}模型项，使用 ${law} law。` : `${name}: ${isMain ? "main-path" : "branch"} term using ${law}.`;
}

function deriveReportSemantics(result: FitResult | null, language: Language): ReportSemantics {
  if (!result) {
    return { fitStatus: rt(language, "unavailable"), reportMode: rt(language, "unavailable"), mainIssue: rt(language, "noMainIssue"), usable: rt(language, "usableNo"), tone: "none", mode: "unavailable", measuredScale: 0, maxFitCurrent: 0, maxResidual: 0, nearBoundParameters: [] };
  }
  const measuredScale = dataScale(result.curves.current_measured_A);
  const maxFitCurrent = Math.max(...finiteAbs(result.curves.current_fit_A), 0);
  const maxResidual = Math.max(...finiteAbs(result.curves.residual_A), 0);
  const codes = new Set((result.warnings ?? []).map((warning) => warning.code));
  const hasError = (result.warnings ?? []).some((warning) => warning.severity === "error");
  const currentExplosion = codes.has("quality_fit_current_explosion") || maxFitCurrent > Math.max(1e3, measuredScale * 1e8);
  const residualExplosion = codes.has("quality_residual_explosion") || maxResidual > Math.max(1e3, measuredScale * 1e8);
  const rmseExplosion = codes.has("quality_rmse_explosion");
  const invalid = !result.reportable || hasError || currentExplosion || residualExplosion || rmseExplosion || !result.success;
  const nearBoundParameters = Object.entries(result.parameters ?? {})
    .filter(([, parameter]) => Boolean(nearBoundLabel(parameter, language)))
    .map(([key]) => key);
  if (invalid) {
    const mainIssue = currentExplosion || residualExplosion || rmseExplosion ? rt(language, "numericalExplosion") : !result.success ? rt(language, "solverFailure") : rt(language, "qualityGate");
    return { fitStatus: rt(language, "invalidFit"), reportMode: rt(language, "diagnosticOnly"), mainIssue, usable: rt(language, "usableNo"), tone: "invalid", mode: "diagnostic", measuredScale, maxFitCurrent, maxResidual, nearBoundParameters };
  }
  if ((result.warnings ?? []).length) {
    return { fitStatus: rt(language, "needsReview"), reportMode: rt(language, "reviewReport"), mainIssue: rt(language, "noMainIssue"), usable: rt(language, "usableYes"), tone: "review", mode: "review", measuredScale, maxFitCurrent, maxResidual, nearBoundParameters };
  }
  return { fitStatus: rt(language, "validFit"), reportMode: rt(language, "normalReport"), mainIssue: rt(language, "noMainIssue"), usable: rt(language, "usableYes"), tone: "valid", mode: "report", measuredScale, maxFitCurrent, maxResidual, nearBoundParameters };
}

function InvalidFitSummary({ result, semantics, language }: { result: FitResult; semantics: ReportSemantics; language: Language }) {
  return <div className="card invalid-fit-summary-card" id="report-diagnostics">
    <div className="invalid-fit-heading">
      <span className="report-status-pill error">{rt(language, "invalidFit")}</span>
      <h2>{rt(language, "invalidTitle")}</h2>
    </div>
    <p>{rt(language, "invalidBody")}</p>
    <div className="invalid-fit-reason-grid">
      <div><strong>{rt(language, "primaryReason")}</strong><p>{rt(language, "numericalExplosion")}: max |Ifit| = {formatValueWithUnit(semantics.maxFitCurrent, "A", 4)}, measured scale ≈ {formatValueWithUnit(semantics.measuredScale, "A", 4)}.</p></div>
      <div><strong>{rt(language, "nextStep")}</strong><p>{rt(language, "nextStepText")}</p></div>
    </div>
    <details className="technical-fit-message"><summary>{rt(language, "collapsedOptimizer")}</summary><p>{result.message}</p>{result.reportability_reason ? <p>{result.reportability_reason}</p> : null}</details>
  </div>;
}

function SuggestedFitActions({ language }: { language: Language }) {
  const actions = language === "zh" ? [
    "重置 D1 初值。",
    "收紧 I0 和 n 的上界。",
    "检查电压范围是否包含需要 Rs 的高正偏区。",
    "如果物理上预期存在串联/漏电路径，加入 Rs/Rsh。",
    "先拟合较窄电压范围。",
    "排除 compliance 限制点。",
    "如果使用 synthetic/demo 数据，确认 ground-truth model。",
  ] : [
    "Reset D1 initial guesses.",
    "Tighten upper bounds for I0 and n.",
    "Check whether the voltage range includes high-forward-bias regions that require Rs.",
    "Add Rs/Rsh components if those paths are physically expected.",
    "Fit a narrower voltage range first.",
    "Exclude compliance-limited points.",
    "For synthetic/demo data, verify the ground-truth model.",
  ];
  return <div className="card suggested-fit-actions-card"><h2>{rt(language, "suggestedActions")}</h2><ul>{actions.map((action) => <li key={action}>{action}</li>)}</ul></div>;
}

function DiagnosticsGroup({ result, semantics, language }: { result: FitResult; semantics: ReportSemantics; language: Language }) {
  const warnings = result.warnings ?? [];
  const criticalCodes = new Set(["quality_fit_current_explosion", "quality_residual_explosion", "quality_rmse_explosion"]);
  const critical = warnings.filter((warning) => criticalCodes.has(warning.code));
  const other = warnings.filter((warning) => !criticalCodes.has(warning.code));
  const rmse = result.metrics.linear_rmse_A;
  return <div className="card grouped-diagnostics-card">
    <h2>{rt(language, "diagnostics")}</h2>
    <section className="diagnostic-root-cause critical"><h3>{rt(language, "criticalIssue")}: {semantics.mainIssue}</h3><ul>
      <li>{language === "zh" ? "拟合电流量级异常" : "Fitted current magnitude is implausible"}: max |Ifit| = {formatValueWithUnit(semantics.maxFitCurrent, "A", 4)}, measured scale ≈ {formatValueWithUnit(semantics.measuredScale, "A", 4)}.</li>
      <li>{language === "zh" ? "残差量级异常" : "Residual magnitude is implausible"}: max |residual| = {formatValueWithUnit(semantics.maxResidual, "A", 4)}.</li>
      <li>RMSE = {formatValueWithUnit(rmse, "A", 4)}.</li>
    </ul></section>
    {other.length ? <section className="diagnostic-root-cause warning"><h3>{rt(language, "warnings")}</h3><ul>{other.map((warning) => <li key={warning.code}>{warning.message}</li>)}</ul></section> : null}
    <details className="technical-diagnostic-details"><summary>{rt(language, "technicalDetails")}</summary>{warnings.length ? <ul>{warnings.map((warning, idx) => <li key={`${warning.code}-${idx}`}><code>{warning.severity} · {warning.code}</code>: {warning.message}</li>)}</ul> : <p>{rt(language, "noWarnings")}</p>}</details>
  </div>;
}

function ModelAssemblyExplanation({ model, equationLines, language, collapsed = false }: { model: ModelSpec; equationLines: string[]; language: Language; collapsed?: boolean }) {
  const isZh = language === "zh";
  const main = model.series;
  const branches = [...model.core, ...model.parallel];
  const mainNames = main.map((item) => String(item.metadata?.nickname ?? item.id)).join(" + ") || (isZh ? "无主路压降" : "no main-path drop");
  const branchNames = branches.map((item) => String(item.metadata?.nickname ?? item.id)).join(" + ") || (isZh ? "无支路" : "no current branch");
  const body = <div className="report-model-explainer">
    <p><strong>{rt(language, "howRead")}</strong>: {isZh ? `外部电压先经过主路（${mainNames}）得到内部结点电压 Vj；支路（${branchNames}）在 Vj 下产生电流并相加。` : `The external voltage first passes through the main path (${mainNames}) to get the internal junction voltage Vj. Branches (${branchNames}) generate currents at Vj and those currents are summed.`}</p>
    <div className="report-core-equations">
      <div className="report-equation-line friendly-equation"><span className="report-equation-label">{rt(language, "voltageRelation")}</span><MathFormula latex="V_{ext}=V_j+\sum_k V_{drop,k}(I,V_j)" className="report-formula" /></div>
      <div className="report-equation-line friendly-equation"><span className="report-equation-label">{rt(language, "currentSum")}</span><MathFormula latex="I=\sum_m I_{branch,m}(V_j)" className="report-formula" /></div>
    </div>
    <div className="report-component-role-grid">{[...main, ...branches].map((component) => <div key={component.id} className="report-component-role">{componentPlainRole(component, language)}</div>)}</div>
    {equationLines.length ? <details className="report-technical-equations"><summary>{rt(language, "backendEquations")}</summary><div className="technical-equation-list">{equationLines.map((line, idx) => <code key={`${line}-${idx}`}>{line}</code>)}</div></details> : null}
  </div>;
  if (collapsed) return <details className="card report-model-equation-card collapsed-model-evaluation"><summary><h2>{rt(language, "modelEvaluation")}</h2><span>{rt(language, "modelIntro")}</span></summary>{body}</details>;
  return <div className="card report-model-equation-card"><h2>{rt(language, "modelEvaluation")}</h2><p className="muted">{rt(language, "modelIntro")}</p>{body}</div>;
}

function ParameterSummary({ result, language, diagnosticOnly }: { result: FitResult; language: Language; diagnosticOnly: boolean }) {
  const entries = Object.entries(result.parameters ?? {});
  return <div className="card report-parameter-summary-card" id="report-parameters"><h2>{rt(language, "parameterSummary")}</h2>{diagnosticOnly ? <p className="diagnostic-only-note">{rt(language, "diagnosticValues")}</p> : null}<div className="table-wrap"><table className="parameter-table compact-parameter-table report-parameter-table"><thead><tr><th>{rt(language, "component")}</th><th>{rt(language, "parameter")}</th><th>{rt(language, "value")}</th><th>{rt(language, "unit")}</th><th>{rt(language, "state")}</th><th>{rt(language, "stdErr")}</th><th>{rt(language, "note")}</th></tr></thead><tbody>{entries.map(([key, parameter]) => { const display = parameterDisplayFromKey(key, result.model); const note = suspectLabel(parameter, language); const near = nearBoundLabel(parameter, language); return <tr key={key} className={near ? "near-bound-row" : !Number.isFinite(parameter.value) ? "suspect-row" : ""}><td><strong>{display.componentLabel}</strong><br /><span className="muted">{display.kind}</span></td><td>{display.paramLabel}</td><td>{formatValueWithUnit(parameter.value, parameter.unit, 4)}</td><td>{parameter.unit ?? ""}</td><td>{parameter.fixed ? rt(language, "fixed") : rt(language, "fit")}</td><td>{parameter.stderr == null ? "—" : formatValueWithUnit(parameter.stderr, parameter.unit, 3)}</td><td><span className={near ? "parameter-badge amber" : note === rt(language, "fit") || note === rt(language, "fixed") ? "parameter-badge neutral" : "parameter-badge amber"}>{note}</span></td></tr>; })}</tbody></table></div></div>;
}

function QuickSummary({ result, semantics, setActiveView, language }: { result: FitResult | null; semantics: ReportSemantics; setActiveView: (view: AppView) => void; language: Language }) {
  return <div className="card report-metadata-card compact-report-summary-card"><h2>{rt(language, "quickSummary")}</h2><div className="report-side-facts decision-summary">
    <span><strong>{rt(language, "status")}</strong>{semantics.fitStatus}</span>
    <span><strong>{rt(language, "reportMode")}</strong>{semantics.reportMode}</span>
    <span><strong>{rt(language, "mainIssue")}</strong>{semantics.mainIssue}</span>
    <span><strong>{rt(language, "maxFitCurrent")}</strong>{result ? formatValueWithUnit(semantics.maxFitCurrent, "A", 3) : "—"}</span>
    <span><strong>{rt(language, "measuredScale")}</strong>{result ? formatValueWithUnit(semantics.measuredScale, "A", 3) : "—"}</span>
    <span><strong>{rt(language, "nearBoundParameters")}</strong>{semantics.nearBoundParameters.length ? semantics.nearBoundParameters.join(", ") : "—"}</span>
    <span><strong>{rt(language, "usableAsReport")}</strong>{semantics.usable}</span>
  </div><div className="report-side-action-links"><button type="button" onClick={() => document.getElementById("report-diagnostics")?.scrollIntoView({ behavior: "smooth", block: "start" })}>{rt(language, "reviewDiagnostics")}</button><button type="button" onClick={() => setActiveView("fitting")}>{rt(language, "openBounds")}</button><button type="button" onClick={() => setActiveView("model")}>{rt(language, "saferModel")}</button></div></div>;
}

export function ReportWorkflowPage({ selectedTrace, hasSelectedTrace, model, result, report, reportMessage, isFitting, fitLifecycle, fitPromotionNotice, fitSessionStats, onExportReportCsv, onExportReportHtml, setActiveView, language, appVersion, leftPct, onResizeStart }: { selectedTrace: TraceData; hasSelectedTrace: boolean; model: ModelSpec; result: FitResult | null; report: string; reportMessage: string; reportAvailable: boolean; isFitting: boolean; fitLifecycle: FitLifecycleState; fitPromotionNotice: string | null; fitSessionStats: FitSessionStats; onExportReportCsv: () => void; onExportReportHtml: () => void; setActiveView: (view: AppView) => void; language: Language; appVersion: string; leftPct: number; onResizeStart: (event: ReactPointerEvent<HTMLDivElement>) => void; }) {
  const verdict = fitStateText(result, isFitting, fitLifecycle);
  const equationLines = modelEquationLines(result?.equations ?? null);
  const traceName = hasSelectedTrace ? String(selectedTrace.metadata?.trace_name ?? selectedTrace.trace_id) : "No trace loaded";
  const semantics = deriveReportSemantics(result, language);
  const invalid = semantics.mode === "diagnostic" && result;

  return <section className="workflow-page report-page scroll-page report-page-two-column resizable-report-grid scientific-report-page" style={{ gridTemplateColumns: `minmax(520px, ${leftPct}fr) 8px minmax(300px, ${100 - leftPct}fr)` }}>
    <main className="report-main-column">
      <div className={`card report-status-card normalized-report-status ${semantics.tone}`}><div className="report-status-header"><div><h2>{semantics.fitStatus}</h2><p className="muted">{traceName} · {modelSummary(model)} · v{appVersion}</p></div><span className={`report-status-pill ${semantics.tone === "valid" ? "ok" : semantics.tone === "invalid" ? "error" : semantics.tone === "review" ? "warning" : "muted"}`}>{result ? semantics.reportMode : verdict}</span></div>{!result && !isFitting ? <div className="workflow-empty-state inline compact-empty-state"><p>{rt(language, "noCompletedFit")}</p><button type="button" className="primary" onClick={() => setActiveView("fitting")}>{rt(language, "goToFitting")}</button></div> : null}{isFitting ? <p className="fit-primary-message info">{rt(language, "running")}</p> : null}{result && !invalid ? <p>{result.message}</p> : null}{result?.reportability_reason && !invalid ? <p className="muted">{result.reportability_reason}</p> : null}</div>
      {result ? invalid ? <><InvalidFitSummary result={result} semantics={semantics} language={language} /><SuggestedFitActions language={language} /><DiagnosticsGroup result={result} semantics={semantics} language={language} />{fitPromotionNotice ? <div className="fit-full-note">{fitPromotionNotice}</div> : null}<ParameterSummary result={result} language={language} diagnosticOnly /><div className="card report-fit-diagnostics-card"><h2>{rt(language, "metrics")}</h2><FitProcessDiagnostics result={result} language={language} sessionStats={fitSessionStats} /></div><ModelAssemblyExplanation model={model} equationLines={equationLines.length ? equationLines : [modelSummary(model)]} language={language} collapsed /></> : <><ModelAssemblyExplanation model={model} equationLines={equationLines.length ? equationLines : [modelSummary(model)]} language={language} />{fitPromotionNotice ? <div className="fit-full-note">{fitPromotionNotice}</div> : null}<FitProcessDiagnostics result={result} language={language} sessionStats={fitSessionStats} /><DiagnosticsGroup result={result} semantics={semantics} language={language} /><ParameterSummary result={result} language={language} diagnosticOnly={false} /></> : null}
    </main>
    <div className="pane-resizer" role="separator" aria-label="Resize Report page columns" onPointerDown={onResizeStart} />
    <aside className="report-side-column"><QuickSummary result={result} semantics={semantics} setActiveView={setActiveView} language={language} /><div className={`card report-export-card report-export-sidebar-card ${invalid ? "diagnostic-export" : ""}`}><h2>{rt(language, "exports")}</h2>{invalid ? <p className="diagnostic-export-help">{rt(language, "diagnosticExportHelp")}</p> : null}<div className="report-actions report-export-actions-grid"><button type="button" className="primary" disabled={!result} onClick={onExportReportHtml}>{invalid ? rt(language, "downloadDiagnosticHtml") : rt(language, "downloadHtml")}</button><button type="button" disabled={!report} onClick={onExportReportCsv}>{invalid ? rt(language, "downloadDiagnosticCsv") : rt(language, "downloadCsv")}</button></div>{reportMessage ? <p className="muted">{reportMessage}</p> : null}</div>{report ? <details className="card report-text-card report-preview-card collapsed-raw-report"><summary>{rt(language, "markdownReportText")}</summary><pre className="report-text-preview user-report-preview">{report}</pre></details> : null}</aside>
  </section>;
}
