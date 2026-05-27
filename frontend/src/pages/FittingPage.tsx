import { useEffect, useMemo, useRef, useState } from "react";
import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";
import type {
  ComponentSpec,
  EquationSummary,
  FitConfig,
  FitResult,
  FitSessionStats,
  FunctionDefinition,
  ModelSpec,
  TraceData,
} from "../model/types";
import {
  equations,
  exportReport,
  exportReportCsv,
  fitTrace,
  getRegistry,
  suggestBounds,
} from "../api/client";
import {
  emptyTrace,
  estimateResidualFloorA,
  updateComponent,
} from "../model/utils";
import {
  countGroundTruthMatches,
  restoreModelParameterValues,
  seedModelFromFittedValues,
  seedModelFromGroundTruthParameters,
} from "../model/parameterGrouping";
import {
  applyDataBoundsSuggestions,
  type DataBoundsApplicationReport,
} from "../model/boundsSuggestion";
import { WorkflowSidebar, type AppView } from "../components/WorkflowSidebar";
import { UserDocumentationPage } from "../components/UserDocumentationPage";
import { ModelBuilder } from "../components/ModelBuilder";
import { PlotWorkspace } from "../components/PlotWorkspace";
import {
  FitDiagnostics,
  FitProcessDiagnostics,
  FitStatusBar,
} from "../components/FitStatusBar";
import { ParameterTable } from "../components/ParameterTable";
import { DataImportWorkspace } from "../components/DataImportWorkspace";
import {
  FitConfigPanel,
  type FitDrawerMode,
} from "../components/FitConfigPanel";
import { EquationPreview } from "../components/EquationPreview";
import { SyntheticTraceTool } from "../components/SyntheticTraceTool";
import { MathFormula } from "../components/MathFormula";
import { ErrorBoundary } from "../components/ErrorBoundary";
import type { Language } from "../model/i18n";
import { t } from "../model/i18n";
import {
  buildReportBaseName,
  emptyReportArtifacts,
} from "../model/reportArtifacts";
import {
  canGenerateReport,
  createCancelledLifecycle,
  createErrorLifecycle,
  createRunningLifecycle,
  createTimeoutLifecycle,
  nextRunId,
  shouldAcceptRunResult,
  type FitLifecycleState,
} from "../model/fitLifecycle";
import { fmtEng } from "../model/format";
import { buildHtmlReportDocument } from "../model/htmlReport";

const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? "dev";

const initialModel: ModelSpec = {
  core: [
    {
      id: "D1",
      location: "core",
      function_type: "diode",
      law_id: "shockley_diode",
      evaluation_form: "current_branch",
      placement: "junction_current_branch",
      polarity: "forward",
      params: {
        I0_A: {
          value: 1e-12,
          lower: 1e-30,
          upper: 1,
          fit: true,
          unit: "A",
          label: "I0",
        },
        n: { value: 1.5, lower: 0.5, upper: 10, fit: true, label: "n" },
      },
      metadata: { nickname: "D1", role: "primary" },
    },
  ],
  series: [
    {
      id: "ohmic_1",
      location: "series",
      function_type: "constant_rs",
      law_id: "ohmic",
      evaluation_form: "voltage_drop",
      placement: "series_voltage_drop",
      params: {
        Rs_ohm: {
          value: 10,
          lower: 0,
          upper: 1e9,
          fit: true,
          unit: "Ω",
          label: "Rs",
        },
      },
      metadata: { nickname: "Rs" },
    },
  ],
  parallel: [
    {
      id: "ohmic_2",
      location: "parallel",
      function_type: "constant_rs",
      law_id: "ohmic",
      evaluation_form: "current_branch",
      placement: "parallel_current_branch",
      params: {
        Rs_ohm: {
          value: 1e9,
          lower: 1e3,
          upper: 1e18,
          fit: true,
          unit: "Ω",
          label: "Rsh",
        },
      },
      metadata: { nickname: "Rsh" },
    },
  ],
  temperature_K: 300,
  version: APP_VERSION,
};

const initialConfig: FitConfig = {
  weighting: "symmetric_log_signed",
  loss: "soft_l1",
  fit_speed: "full",
  exclude_compliance: true,
  max_nfev: 200,
  residual_floor_A: 1e-15,
  multistart_enabled: false,
  multistart_n_seeds: 12,
  run_timeout_s: 60,
  solver_mode: "legacy_composite",
};

type ZoomStyle = CSSProperties & { "--app-zoom": number };

function modelSummary(model: ModelSpec) {
  const names = [...model.series, ...model.core, ...model.parallel].map(
    (component) =>
      String(component.metadata?.nickname ?? component.id ?? component.law_id),
  );
  return names.length ? names.join(" + ") : "No model";
}

function fitStateText(
  result: FitResult | null,
  isFitting: boolean,
  lifecycle: FitLifecycleState,
) {
  if (isFitting) return "Running";
  if (result) {
    if (result.success && result.reportable) return "Converged";
    if (result.success) return "Gate failed";
    return "Failed";
  }
  if (lifecycle.kind === "cancelled") return "Cancelled";
  if (lifecycle.kind === "timeout") return "Timeout";
  if (lifecycle.kind === "error") return "Error";
  return "Not run";
}

function nextStepText(
  hasSelectedTrace: boolean,
  result: FitResult | null,
  isFitting: boolean,
  lifecycle: FitLifecycleState,
) {
  if (!hasSelectedTrace) return "Next: Go to Data";
  if (isFitting) return "Next: Wait for completion";
  if (lifecycle.kind === "error") return "Next: Review diagnostics";
  if (!result) return "Next: Go to Fitting";
  return result.success ? "Next: Review Report" : "Next: Review diagnostics";
}

function WorkflowContextBar({
  selectedTrace,
  hasSelectedTrace,
  model,
  result,
  isFitting,
  lifecycle,
  reportAvailable,
}: {
  selectedTrace: TraceData;
  hasSelectedTrace: boolean;
  model: ModelSpec;
  result: FitResult | null;
  isFitting: boolean;
  lifecycle: FitLifecycleState;
  reportAvailable: boolean;
}) {
  return (
    <section className="workflow-context-bar" aria-label="Project context">
      <span>
        <strong>Trace:</strong>{" "}
        {hasSelectedTrace
          ? String(selectedTrace.metadata?.trace_name ?? selectedTrace.trace_id)
          : "No trace loaded"}
      </span>
      <span>
        <strong>Model:</strong> {modelSummary(model)}
      </span>
      <span>
        <strong>Fit:</strong> {fitStateText(result, isFitting, lifecycle)}
      </span>
      <span>
        <strong>Report:</strong>{" "}
        {reportAvailable
          ? result?.reportable
            ? "Available"
            : "Review only"
          : "Not available"}
      </span>
      <span className="workflow-next-step">
        {nextStepText(hasSelectedTrace, result, isFitting, lifecycle)}
      </span>
    </section>
  );
}

function StartHerePage({
  setActiveView,
  hasSelectedTrace,
  result,
  isFitting,
  reportAvailable,
}: {
  setActiveView: (view: AppView) => void;
  hasSelectedTrace: boolean;
  result: FitResult | null;
  isFitting: boolean;
  reportAvailable: boolean;
}) {
  const steps = [
    {
      title: "Data",
      text: "Import and choose a trace.",
      view: "data" as AppView,
      status: hasSelectedTrace ? "Loaded" : "Needed",
    },
    {
      title: "Model",
      text: "Build the circuit model.",
      view: "model" as AppView,
      status: "Ready",
    },
    {
      title: "Fitting",
      text: "Run and inspect the fit.",
      view: "fitting" as AppView,
      status: isFitting ? "Running" : result ? "Done" : "Not run",
    },
    {
      title: "Report",
      text: "Review and export results.",
      view: "report" as AppView,
      status: reportAvailable ? "Available" : "Unavailable",
    },
  ];
  return (
    <section className="workflow-page scroll-page start-page minimal-start-page">
      <div className="minimal-hero">
        <div className="hero-kicker">Circuit-based I-V fitting</div>
        <h2>Welcome to IV-fitter</h2>
        <p>
          Import I-V data, build a model, run the fit, and export a reproducible
          report.
        </p>
        <div className="hero-actions">
          <button
            type="button"
            className="primary hero-primary"
            onClick={() => setActiveView("data")}
          >
            Start with data
          </button>
          <button type="button" onClick={() => setActiveView("help")}>
            Open help
          </button>
        </div>
      </div>
      <div className="minimal-workflow-head">
        <div>
          <h3>Workflow</h3>
          <p>Four pages, one fitting path.</p>
        </div>
        <div className="workflow-mini-path">
          Data → Model → Fitting → Report
        </div>
      </div>
      <div className="minimal-workflow-grid">
        {steps.map((step, idx) => (
          <article
            className="minimal-workflow-card"
            key={step.title}
            onClick={() => setActiveView(step.view)}
            role="button"
            tabIndex={0}
          >
            <span className="minimal-step-index">{idx + 1}</span>
            <span className="minimal-step-status">{step.status}</span>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
          </article>
        ))}
      </div>
      <div className="minimal-current-state">
        <strong>Current state</strong>
        <span>Trace: {hasSelectedTrace ? "loaded" : "no trace loaded"}</span>
        <span>Model: Rs + D1 + Rsh</span>
        <span>
          Fit: {isFitting ? "running" : result ? "complete" : "not run"}
        </span>
        <span>Report: {reportAvailable ? "available" : "unavailable"}</span>
      </div>
    </section>
  );
}

function PageSection({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="workspace-section open">
      <div className="workspace-section-head static-head">
        <span>{title}</span>
        {action ? <div className="workspace-section-head-action">{action}</div> : null}
      </div>
      <div className="workspace-section-body">{children}</div>
    </section>
  );
}

function ModelWorkflowPage({
  model,
  setModel,
  registry,
  equationSummary,
  result,
  language,
  isFitting,
  leftPct,
  onResizeStart,
  syntheticTool,
}: {
  model: ModelSpec;
  setModel: (model: ModelSpec) => void;
  registry: FunctionDefinition[];
  equationSummary: EquationSummary | null;
  result: FitResult | null;
  language: Language;
  isFitting: boolean;
  leftPct: number;
  onResizeStart: (event: ReactPointerEvent<HTMLDivElement>) => void;
  syntheticTool?: ReactNode;
}) {
  return (
    <section className="workflow-page model-page">
      <div
        className="workflow-two-column resizable-workflow-grid"
        style={{
          gridTemplateColumns: `minmax(320px, ${leftPct}fr) 8px minmax(420px, ${100 - leftPct}fr)`,
        }}
      >
        <PageSection title={t(language, "modelBuilder")} action={syntheticTool}>
          <ErrorBoundary label="Model builder">
            <ModelBuilder
              model={model}
              registry={registry}
              onChange={setModel}
              language={language}
              disabled={isFitting}
            />
          </ErrorBoundary>
        </PageSection>
        <div
          className="pane-resizer"
          role="separator"
          aria-label="Resize Model page columns"
          onPointerDown={onResizeStart}
        />
        <PageSection title={t(language, "equationPreview")}>
          <ErrorBoundary label="Equation preview">
            <EquationPreview
              equations={equationSummary}
              model={model}
              result={result}
              language={language}
            />
          </ErrorBoundary>
        </PageSection>
      </div>
    </section>
  );
}

function FittingWorkflowPage({
  selectedTrace,
  selectedTraceId,
  traces,
  setSelectedTraceId,
  setActiveView,
  config,
  setConfig,
  autoVoltageRange,
  fitDrawerMode,
  setFitDrawerMode,
  fitActions,
  fitStatus,
  fitMessages,
  fitPromotionNotice,
  result,
  registry,
  model,
  updateParameterModel,
  canRestoreInitialValues,
  onRestoreInitialValues,
  onApplyDataBounds,
  canSeedSyntheticGroundTruth,
  onSeedSyntheticGroundTruth,
  dataBoundsReport,
  isFitting,
  language,
  leftPct,
  onResizeStart,
}: {
  selectedTrace: TraceData;
  selectedTraceId: string | null;
  traces: TraceData[];
  setSelectedTraceId: (id: string) => void;
  setActiveView: (view: AppView) => void;
  config: FitConfig;
  setConfig: (config: FitConfig) => void;
  autoVoltageRange: { vMin: number | null; vMax: number | null };
  fitDrawerMode: FitDrawerMode;
  setFitDrawerMode: (mode: FitDrawerMode) => void;
  fitActions: ReactNode;
  fitStatus: ReactNode;
  fitMessages: ReactNode;
  fitPromotionNotice: string | null;
  result: FitResult | null;
  registry: FunctionDefinition[];
  model: ModelSpec;
  updateParameterModel: (model: ModelSpec) => void;
  canRestoreInitialValues: boolean;
  onRestoreInitialValues: () => void;
  onApplyDataBounds: () => void;
  canSeedSyntheticGroundTruth: boolean;
  onSeedSyntheticGroundTruth: () => void;
  dataBoundsReport: DataBoundsApplicationReport | null;
  isFitting: boolean;
  language: Language;
  leftPct: number;
  onResizeStart: (event: ReactPointerEvent<HTMLDivElement>) => void;
}) {
  const hasTrace = selectedTrace.voltage_V.length > 0;
  return (
    <section className="workflow-page fitting-page">
      {!hasTrace ? (
        <div className="card workflow-empty-state">
          <h2>No trace loaded</h2>
          <p>Import data before running a fit.</p>
          <button
            type="button"
            className="primary"
            onClick={() => setActiveView("data")}
          >
            Go to Data
          </button>
        </div>
      ) : null}
      <div
        className="fitting-workflow-grid resizable-fitting-grid"
        style={{
          "--fit-grid-template": `minmax(270px, ${leftPct}fr) 8px minmax(520px, ${100 - leftPct}fr)`,
        } as CSSProperties}
      >
        <aside className="fitting-control-column">
          <ErrorBoundary label="Fit config panel">
            <FitConfigPanel
              config={config}
              onChange={setConfig}
              language={language}
              disabled={isFitting}
              drawerMode={fitDrawerMode}
              onDrawerModeChange={setFitDrawerMode}
              autoVoltageRange={autoVoltageRange}
              actionDock={<div className="fit-action-row">{fitActions}</div>}
              statusDock={fitStatus}
              messageDock={fitMessages}
              detailsDock={null}
              hasDetails={false}
            />
          </ErrorBoundary>
        </aside>
        <div
          className="pane-resizer"
          role="separator"
          aria-label="Resize Fitting setup and results columns"
          onPointerDown={onResizeStart}
        />
        <main className="fitting-results-column">
          <PageSection title={t(language, "plots")}>
            <ErrorBoundary label="Plot workspace">
              <PlotWorkspace
                traces={traces}
                selectedTraceId={selectedTraceId}
                onSelectTrace={setSelectedTraceId}
                onImportData={() => setActiveView("data")}
                result={result}
                language={language}
                disabled={isFitting}
              />
            </ErrorBoundary>
          </PageSection>
          <PageSection title={t(language, "parameters")}>
            <ErrorBoundary label="Parameter table">
              <ParameterTable
                result={result}
                model={model}
                registry={registry}
                onModelChange={updateParameterModel}
                language={language}
                canRestoreInitialValues={canRestoreInitialValues}
                onRestoreInitialValues={onRestoreInitialValues}
                onApplyDataBounds={onApplyDataBounds}
                canSeedSyntheticGroundTruth={canSeedSyntheticGroundTruth}
                onSeedSyntheticGroundTruth={onSeedSyntheticGroundTruth}
                dataBoundsReport={dataBoundsReport}
                disabled={isFitting}
              />
            </ErrorBoundary>
          </PageSection>
        </main>
      </div>
    </section>
  );
}

function modelEquationLines(summary: EquationSummary | null | undefined) {
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
  const componentLabel = String(
    component?.metadata?.nickname ?? component?.id ?? componentId,
  );
  const paramLabel = component?.params?.[paramName]?.label ?? paramName;
  const kind =
    component?.function_type === "series_diode_barrier"
      ? "Diode-like series barrier drop"
      : /ohmic/i.test(component?.law_id ?? "")
        ? component?.location === "series"
          ? "Ohmic series resistance"
          : "Ohmic leakage/current branch"
        : /shockley/i.test(component?.law_id ?? "") ||
            component?.function_type === "diode"
          ? "Shockley diode"
          : String(
              component?.metadata?.display_name ??
                component?.law_id ??
                component?.function_type ??
                "Model component",
            );
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
  if (
    Number.isFinite(value.stderr) &&
    Math.abs(value.value) > 0 &&
    Number(value.stderr) / Math.abs(value.value) > 1
  )
    notes.push("large uncertainty");
  if (
    value.lower != null &&
    Number.isFinite(value.lower) &&
    Math.abs(value.value - value.lower) <=
      Math.max(1e-30, Math.abs(value.lower) * 1e-4)
  )
    notes.push("near lower bound");
  if (
    value.upper != null &&
    Number.isFinite(value.upper) &&
    Math.abs(value.value - value.upper) <=
      Math.max(1e-30, Math.abs(value.upper) * 1e-4)
  )
    notes.push("near upper bound");
  return notes.join("; ") || "fit";
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
  return <div className="report-equation-line">
    <span className="report-equation-label">{parts.label}</span>
    {parts.likelyFormula ? <MathFormula latex={parts.latex} className="report-formula" /> : <p>{parts.body}</p>}
  </div>;
}
function ReportWorkflowPage({
  selectedTrace,
  hasSelectedTrace,
  model,
  result,
  report,
  reportMessage,
  reportAvailable,
  isFitting,
  fitLifecycle,
  fitPromotionNotice,
  fitSessionStats,
  onExportReportCsv,
  onExportReportHtml,
  setActiveView,
  language,
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
  dismissedWarningKey: string;
  setDismissedWarningKey: (key: string) => void;
  openAndScroll: (sectionId: string) => void;
  makeReport: () => void;
  onExportReportCsv: () => void;
  onExportReportHtml: () => void;
  setActiveView: (view: AppView) => void;
  language: Language;
  leftPct: number;
  onResizeStart: (event: ReactPointerEvent<HTMLDivElement>) => void;
}) {
  const verdict = fitStateText(result, isFitting, fitLifecycle);
  const metricEntries = result ? Object.entries(result.metrics ?? {}) : [];
  const parameterEntries = result
    ? Object.entries(result.parameters ?? {})
    : [];
  const equationLines = modelEquationLines(result?.equations ?? null);
  const traceName = hasSelectedTrace
    ? String(selectedTrace.metadata?.trace_name ?? selectedTrace.trace_id)
    : "No trace loaded";
  const reportStatus = result
    ? result.reportable
      ? "Reportable"
      : "Review required"
    : isFitting
      ? "Running"
      : "Unavailable";

  return (
    <section
      className="workflow-page report-page scroll-page report-page-two-column resizable-report-grid scientific-report-page"
      style={{
        gridTemplateColumns: `minmax(520px, ${leftPct}fr) 8px minmax(300px, ${100 - leftPct}fr)`,
      }}
    >
      <main className="report-main-column">
        <div className="card report-status-card">
          <div className="report-status-header">
            <div>
              <h2>Fit quality: {reportStatus}</h2>
              <p className="muted">
                {traceName} · {modelSummary(model)} · v{APP_VERSION}
              </p>
            </div>
            <span
              className={
                result?.reportable
                  ? "report-status-pill ok"
                  : result
                    ? "report-status-pill warning"
                    : "report-status-pill muted"
              }
            >
              {verdict}
            </span>
          </div>
          {!result && !isFitting ? (
            <div className="workflow-empty-state inline compact-empty-state">
              <p>No completed fit yet.</p>
              <button
                type="button"
                className="primary"
                onClick={() => setActiveView("fitting")}
              >
                Go to Fitting
              </button>
            </div>
          ) : null}
          {isFitting ? (
            <p className="fit-primary-message info">
              Fit is running; report will be available after completion.
            </p>
          ) : null}
          {result ? <p>{result.message}</p> : null}
          {result?.reportability_reason ? (
            <p className="muted">{result.reportability_reason}</p>
          ) : null}
        </div>

        {result ? (
          <div className="card report-model-equation-card">
            <h2>Model and equations</h2>
            <p className="muted">This is the model used for the current fit.</p>
            <div className="report-equation-list">
              {equationLines.length ? (
                equationLines.map((line, idx) => (
                  <ReportEquationLine key={`${line}-${idx}`} line={line} />
                ))
              ) : (
                <ReportEquationLine line={modelSummary(model)} />
              )}
            </div>
          </div>
        ) : null}

        {fitPromotionNotice ? (
          <div className="fit-full-note">{fitPromotionNotice}</div>
        ) : null}

        {result ? (
          <>
            <FitProcessDiagnostics
              result={result}
              language={language}
              sessionStats={fitSessionStats}
            />
            <div className="card report-diagnostics-card">
              <h2>Diagnostics</h2>
              {(result.warnings ?? []).length ? (
                <div className="report-warning-list">
                  {result.warnings.map((warning, idx) => (
                    <div
                      className={`report-warning-item ${warning.severity}`}
                      key={`${warning.code}-${idx}`}
                    >
                      <strong>
                        {warning.severity.toUpperCase()} · {warning.code}
                      </strong>
                      <p>{warning.message}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">
                  No warnings or errors reported by the fitting backend.
                </p>
              )}
            </div>

            <div className="card report-parameter-summary-card">
              <h2>Parameter summary</h2>
              <div className="table-wrap">
                <table className="parameter-table compact-parameter-table report-parameter-table">
                  <thead>
                    <tr>
                      <th>Component</th>
                      <th>Parameter</th>
                      <th>Value</th>
                      <th>Unit</th>
                      <th>Status</th>
                      <th>Std. err.</th>
                      <th>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parameterEntries.map(([key, value]) => {
                      const display = parameterDisplayFromKey(
                        key,
                        result.model,
                      );
                      return (
                        <tr key={key}>
                          <td>
                            <strong>{display.componentLabel}</strong>
                            <br />
                            <span className="muted">{display.kind}</span>
                          </td>
                          <td>{display.paramLabel}</td>
                          <td>{fmtEng(value.value, 5)}</td>
                          <td>{value.unit ?? ""}</td>
                          <td>{value.fixed ? "fixed" : "fit"}</td>
                          <td>
                            {value.stderr == null
                              ? "-"
                              : fmtEng(value.stderr, 4)}
                          </td>
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
      <div
        className="pane-resizer"
        role="separator"
        aria-label="Resize Report page columns"
        onPointerDown={onResizeStart}
      />

      <aside className="report-side-column">
        <div className="card report-export-card report-export-sidebar-card">
          <h2>Exports</h2>
          <div className="report-actions report-export-actions-grid">
            <button
              type="button"
              className="primary"
              disabled={!result}
              onClick={onExportReportHtml}
            >
              {language === "zh" ? "下载 HTML 报告" : "Download HTML report"}
            </button>
            <button
              type="button"
              disabled={!report}
              onClick={onExportReportCsv}
            >
              {language === "zh" ? "下载 CSV 报告" : "Download report CSV"}
            </button>
          </div>
          {reportMessage ? <p className="muted">{reportMessage}</p> : null}
        </div>

        <div className="card report-metadata-card compact-report-summary-card">
          <h2>Quick summary</h2>
          <div className="report-side-facts">
            <span>
              <strong>Status</strong>
              {reportStatus}
            </span>
            <span>
              <strong>Warnings</strong>
              {result?.warnings.length ?? 0}
            </span>
            <span>
              <strong>Metrics</strong>
              {metricEntries.length}
            </span>
            <span>
              <strong>Parameters</strong>
              {parameterEntries.length}
            </span>
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

function isBackendConnectionError(message: string | null) {
  if (!message) return false;
  return /failed to fetch|networkerror|load failed|backend|connection/i.test(
    message,
  );
}

function BackendConnectionBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  const help =
    "Check that the backend window is running, then open http://127.0.0.1:8000/api/health. For phone testing, also check firewall and use the LAN address printed by 04c_run_lan_dev.bat.";

  function startPaneResize(
    event: ReactPointerEvent<HTMLDivElement>,
    setter: (value: number) => void,
    min = 26,
    max = 78,
  ) {
    const container = event.currentTarget.parentElement;
    if (!container) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const rect = container.getBoundingClientRect();
    const onMove = (move: PointerEvent) => {
      const pct = ((move.clientX - rect.left) / Math.max(1, rect.width)) * 100;
      setter(Math.min(max, Math.max(min, Number(pct.toFixed(1)))));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  }

  return (
    <div className="backend-banner" role="alert">
      <div>
        <strong>Backend connection problem</strong>
        <p>
          IV-fitter could not reach the local fitting backend. The browser UI
          loaded, but fitting/import API calls are not available yet.
        </p>
        <small>{message}</small>
      </div>
      <div className="backend-banner-actions">
        <button className="primary" onClick={onRetry}>
          Retry
        </button>
        <button onClick={() => window.alert(help)}>Help</button>
      </div>
    </div>
  );
}

function warningDismissKey(result: FitResult | null) {
  return result
    ? [
        result.success ? "success" : "failed",
        result.reportable ? "reportable" : "not-reportable",
        result.reportability_reason ?? result.message,
        result.metrics.linear_rmse_A,
        ...result.warnings.map((w) => `${w.severity}:${w.code}:${w.message}`),
      ].join("|")
    : "";
}

function selectedTraceGroundTruth(
  trace: TraceData,
): Record<string, unknown> | null {
  const metadata = trace.metadata ?? {};
  if (metadata.synthetic !== true) return null;
  const raw = metadata.ground_truth_parameters;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

function fitResultIsSafeToPromote(fit: FitResult): boolean {
  if (!fit.success || !fit.reportable) return false;
  const normalizedRmse = fit.metrics.normalized_rmse;
  const logMae = fit.metrics.log_magnitude_mae_decades;
  const severeWarnings = fit.warnings.some(
    (warning) =>
      warning.severity === "error" ||
      [
        "parameter_bound",
        "model_not_reportable",
        "junction_solver_failed",
        "graph_solver_kcl_failed",
      ].includes(warning.code),
  );
  if (severeWarnings) return false;
  if (Number.isFinite(normalizedRmse) && normalizedRmse > 0.25) return false;
  if (Number.isFinite(logMae) && logMae > 0.5) return false;
  if (
    (fit.fit_diagnostics?.active_bounds?.length ?? 0) > 0 &&
    Number.isFinite(normalizedRmse) &&
    normalizedRmse > 0.05
  )
    return false;
  return true;
}

function updateModelParameter(
  model: ModelSpec,
  componentId: string,
  paramName: string,
  patch: Partial<ComponentSpec["params"][string]>,
) {
  for (const location of ["core", "series", "parallel"] as const) {
    const comp = model[location].find((item) => item.id === componentId);
    if (!comp || !comp.params[paramName]) continue;
    const next = {
      ...comp,
      params: {
        ...comp.params,
        [paramName]: { ...comp.params[paramName], ...patch },
      },
    };
    return updateComponent(model, location, componentId, next);
  }
  return model;
}

export function FittingPage() {
  const [registry, setRegistry] = useState<FunctionDefinition[]>([]);
  const [traces, setTraces] = useState<TraceData[]>([]);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [model, setModel] = useState<ModelSpec>(initialModel);
  const [preFitInitialModel, setPreFitInitialModel] =
    useState<ModelSpec | null>(null);
  const [config, setConfig] = useState<FitConfig>(initialConfig);
  const [fitDrawerMode, setFitDrawerMode] = useState<FitDrawerMode>("none");
  const [result, setResult] = useState<FitResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fitPromotionNotice, setFitPromotionNotice] = useState<string | null>(
    null,
  );
  const [noTraceRunAttempted, setNoTraceRunAttempted] = useState(false);
  const [isFitting, setIsFitting] = useState(false);
  const [fitStartedAt, setFitStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [fitLifecycle, setFitLifecycle] = useState<FitLifecycleState>({
    kind: "idle",
  });
  const abortFitRef = useRef<AbortController | null>(null);
  const fitRunSeqRef = useRef(0);
  const activeFitRunIdRef = useRef<number | null>(null);
  const cancelledFitRunIdsRef = useRef(new Set<number>());
  const [reportArtifacts, setReportArtifacts] = useState(emptyReportArtifacts);
  const report = reportArtifacts.report;
  const reportMessage = reportArtifacts.message;
  const [equationSummary, setEquationSummary] =
    useState<EquationSummary | null>(null);
  const [zoom, setZoom] = useState(0.92);
  const [activeView, setActiveView] = useState<AppView>("start");
  const [modelPanePct, setModelPanePct] = useState(42);
  const [fittingPanePct, setFittingPanePct] = useState(28);
  const [reportPanePct, setReportPanePct] = useState(72);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [language, setLanguage] = useState<Language>("en");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    fitSetup: true,
    model: false,
    plots: false,
    parameters: false,
    preview: false,
  });
  const [dismissedWarningKey, setDismissedWarningKey] = useState("");
  const [dataBoundsReport, setDataBoundsReport] =
    useState<DataBoundsApplicationReport | null>(null);
  const [fitSessionStats, setFitSessionStats] = useState<FitSessionStats>({
    fitsRun: 0,
    totalFunctionEvaluations: 0,
    totalElapsedS: 0,
    totalRootSolverFailures: 0,
  });

  useEffect(() => {
    getRegistry()
      .then(setRegistry)
      .catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    if (!isFitting || fitStartedAt === null) return;
    const timer = window.setInterval(() => {
      setElapsedSeconds(
        Math.max(0, Math.floor((Date.now() - fitStartedAt) / 1000)),
      );
    }, 500);
    return () => window.clearInterval(timer);
  }, [isFitting, fitStartedAt]);

  useEffect(() => {
    setDismissedWarningKey("");
  }, [warningDismissKey(result)]);

  const selectedTrace =
    traces.find((t) => t.trace_id === selectedTraceId) ??
    traces[0] ??
    emptyTrace();
  const hasSelectedTrace = selectedTrace.voltage_V.length > 0;
  const syntheticGroundTruth = selectedTraceGroundTruth(selectedTrace);
  const canSeedSyntheticGroundTruth = syntheticGroundTruth
    ? countGroundTruthMatches(model, syntheticGroundTruth) > 0
    : false;

  const autoVoltageRange = useMemo(() => {
    const finite = selectedTrace.voltage_V.filter(Number.isFinite);
    if (!finite.length) return { vMin: null, vMax: null };
    return { vMin: Math.min(...finite), vMax: Math.max(...finite) };
  }, [selectedTrace]);
  const selectedTraceDataKey = useMemo(() => {
    const v = selectedTrace.voltage_V;
    const i = selectedTrace.current_A;
    return [
      selectedTrace.trace_id,
      v.length,
      i.length,
      v[0],
      v[v.length - 1],
      i[0],
      i[i.length - 1],
    ].join("|");
  }, [selectedTrace]);

  useEffect(() => {
    setDataBoundsReport(null);
    if (!selectedTrace.voltage_V.length) return;
    const nextFloor = estimateResidualFloorA(selectedTrace);
    setConfig((current) =>
      current.residual_floor_A === nextFloor
        ? current
        : { ...current, residual_floor_A: nextFloor },
    );
  }, [selectedTraceDataKey, selectedTrace]);

  useEffect(() => {
    const controller = new AbortController();
    const handle = window.setTimeout(() => {
      equations(model, controller.signal)
        .then(setEquationSummary)
        .catch((e) => {
          if (e instanceof DOMException && e.name === "AbortError") return;
          if (
            typeof e === "object" &&
            e !== null &&
            "name" in e &&
            (e as { name?: string }).name === "AbortError"
          )
            return;
          console.warn("Equation preview failed", e);
          setEquationSummary(null);
        });
    }, 250);
    return () => {
      controller.abort();
      window.clearTimeout(handle);
    };
  }, [model]);

  useEffect(() => {
    function onWheel(event: WheelEvent) {
      if (!event.ctrlKey) return;
      event.preventDefault();
      setZoom((current) => {
        const next = current + (event.deltaY > 0 ? -0.04 : 0.04);
        return Math.min(1.6, Math.max(0.55, Number(next.toFixed(2))));
      });
    }
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, []);

  async function applyDataBounds() {
    if (!selectedTrace.voltage_V.length) {
      setError(
        language === "zh"
          ? "没有选中 trace，无法推荐边界。"
          : "No selected trace; data bounds were not applied.",
      );
      return;
    }
    try {
      const response = await suggestBounds(selectedTrace, model, config);
      const applied = applyDataBoundsSuggestions(model, registry, response);
      setModel(applied.model);
      setReportArtifacts(emptyReportArtifacts);
      setDataBoundsReport(applied.report);
      setOpenSections((current) => ({ ...current, parameters: true }));
    } catch (e) {
      setError(
        language === "zh"
          ? `边界推荐失败：${String(e)}`
          : `Bounds suggestion failed: ${String(e)}`,
      );
    }
  }

  async function runFit() {
    if (isFitting) return;
    const runId = nextRunId(fitRunSeqRef.current);
    fitRunSeqRef.current = runId;
    activeFitRunIdRef.current = runId;
    cancelledFitRunIdsRef.current.delete(runId);
    setError(null);
    setFitPromotionNotice(null);
    setResult(null);
    setReportArtifacts(emptyReportArtifacts);
    setDataBoundsReport(null);
    setDismissedWarningKey("");
    setActiveView("fitting");
    if (!selectedTrace.voltage_V.length) {
      activeFitRunIdRef.current = null;
      setResult(null);
      setNoTraceRunAttempted(true);
      setFitLifecycle({
        kind: "error",
        runId,
        message: t(language, "noTraceError"),
      });
      setError(t(language, "noTraceError"));
      return;
    }
    setNoTraceRunAttempted(false);
    const modelBeforeFit = structuredClone(model) as ModelSpec;
    setPreFitInitialModel(modelBeforeFit);
    const timeoutS = Math.max(1, Number(config.run_timeout_s ?? 60));
    const controller = new AbortController();
    abortFitRef.current = controller;
    const startedAt = Date.now();
    setElapsedSeconds(0);
    setFitStartedAt(startedAt);
    setFitLifecycle(createRunningLifecycle(runId, startedAt, timeoutS));
    setIsFitting(true);
    const timeoutId = window.setTimeout(() => {
      if (
        !shouldAcceptRunResult({
          activeRunId: activeFitRunIdRef.current,
          runId,
        })
      )
        return;
      cancelledFitRunIdsRef.current.add(runId);
      activeFitRunIdRef.current = null;
      controller.abort();
      setIsFitting(false);
      setFitStartedAt(null);
      setElapsedSeconds(timeoutS);
      setFitLifecycle(createTimeoutLifecycle(runId, timeoutS));
      setError(
        language === "zh"
          ? `拟合超过 ${timeoutS} 秒，已中止请求；本次结果不会写入界面。`
          : `Fit exceeded ${timeoutS} s. The request was stopped and this run result will not update the interface.`,
      );
    }, timeoutS * 1000);
    try {
      const fit = await fitTrace(
        selectedTrace,
        modelBeforeFit,
        { ...config, run_timeout_s: timeoutS },
        controller.signal,
      );
      if (
        !shouldAcceptRunResult({
          activeRunId: activeFitRunIdRef.current,
          runId,
          cancelledRunIds: cancelledFitRunIdsRef.current,
        })
      )
        return;
      setResult(fit);
      const diag = fit.fit_diagnostics;
      setFitSessionStats((current) => ({
        fitsRun: current.fitsRun + 1,
        totalFunctionEvaluations:
          current.totalFunctionEvaluations +
          Math.max(0, Math.round(diag?.function_evaluations ?? 0)),
        totalElapsedS: Number(
          (current.totalElapsedS + Math.max(0, diag?.elapsed_s ?? 0)).toFixed(
            3,
          ),
        ),
        totalRootSolverFailures:
          current.totalRootSolverFailures +
          Math.max(0, Math.round(diag?.root_solver_failures ?? 0)),
      }));
      setDataBoundsReport(null);
      if (fitResultIsSafeToPromote(fit)) {
        setModel(seedModelFromFittedValues(modelBeforeFit, fit));
        setFitPromotionNotice(null);
      } else {
        setFitPromotionNotice(
          language === "zh"
            ? "本次拟合数值上结束，但质量门控未通过；fitted values 已显示，但没有自动写回下一次初值。可尝试恢复初值、应用数据建议边界，或使用 synthetic 真值作为初值。"
            : "Fit ended numerically, but quality gating did not pass; fitted values are shown but were not promoted to the next initials. Try restoring initials, applying data bounds, or seeding from synthetic ground truth.",
        );
      }
      setOpenSections((current) => ({
        ...current,
        plots: true,
        parameters: true,
      }));
      try {
        const autoReport = await exportReport(fit);
        if (
          shouldAcceptRunResult({
            activeRunId: activeFitRunIdRef.current,
            runId,
            cancelledRunIds: cancelledFitRunIdsRef.current,
          })
        ) {
          setReportArtifacts({
            report: autoReport.markdown,
            message:
              language === "zh"
                ? "报告已自动更新。"
                : "Report updated automatically after fit completion.",
          });
        }
      } catch {
        if (
          shouldAcceptRunResult({
            activeRunId: activeFitRunIdRef.current,
            runId,
            cancelledRunIds: cancelledFitRunIdsRef.current,
          })
        ) {
          setReportArtifacts({
            report: "",
            message:
              language === "zh"
                ? "拟合完成，但报告自动更新失败。"
                : "Fit completed, but automatic report update failed.",
          });
        }
      }
      setFitLifecycle({ kind: "idle" });
    } catch (e) {
      if (
        !shouldAcceptRunResult({
          activeRunId: activeFitRunIdRef.current,
          runId,
          cancelledRunIds: cancelledFitRunIdsRef.current,
        })
      )
        return;
      if (e instanceof DOMException && e.name === "AbortError") {
        cancelledFitRunIdsRef.current.add(runId);
        activeFitRunIdRef.current = null;
        setFitLifecycle(createCancelledLifecycle(runId, elapsedSeconds));
        setError(
          language === "zh"
            ? "拟合请求已中止。本次结果不会写入界面。"
            : "Fit request was aborted. This run result will not update the interface.",
        );
      } else {
        const message = String(e);
        setFitLifecycle(createErrorLifecycle(runId, message));
        setError(message);
      }
    } finally {
      window.clearTimeout(timeoutId);
      if (abortFitRef.current === controller) abortFitRef.current = null;
      if (activeFitRunIdRef.current === runId) activeFitRunIdRef.current = null;
      if (
        activeFitRunIdRef.current === runId ||
        fitRunSeqRef.current === runId
      ) {
        setIsFitting(false);
        setFitStartedAt(null);
      }
    }
  }

  function stopFit() {
    const runId = activeFitRunIdRef.current;
    if (runId !== null) cancelledFitRunIdsRef.current.add(runId);
    activeFitRunIdRef.current = null;
    abortFitRef.current?.abort();
    setIsFitting(false);
    setFitStartedAt(null);
    setFitLifecycle(
      createCancelledLifecycle(runId ?? fitRunSeqRef.current, elapsedSeconds),
    );
    setError(
      language === "zh"
        ? "已停止当前拟合请求。本次结果不会写入界面。"
        : "Current fit request stopped. This run result will not update the interface.",
    );
  }

  function seedFromSyntheticGroundTruth() {
    const groundTruth = selectedTraceGroundTruth(selectedTrace);
    if (!groundTruth) return;
    setModel((current) =>
      seedModelFromGroundTruthParameters(current, groundTruth),
    );
    setFitPromotionNotice(
      language === "zh"
        ? "已从当前 synthetic trace metadata 恢复初值。"
        : "Initial values restored from the active synthetic trace ground truth metadata.",
    );
    setDataBoundsReport(null);
    setOpenSections((current) => ({ ...current, parameters: true }));
  }

  async function makeReport() {
    if (!result) return;
    const r = await exportReport(result);
    setReportArtifacts({
      report: r.markdown,
      message:
        language === "zh"
          ? "报告已生成。可下载 HTML 或完整 CSV 报告。"
          : "Report generated. You can download the HTML or full CSV report.",
    });
    setActiveView("report");
  }

  function downloadText(filename: string, text: string, mimeType: string) {
    const blob = new Blob([text], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setReportArtifacts((current) => ({
      ...current,
      message: `${language === "zh" ? "已导出" : "Exported"}: ${filename}`,
    }));
  }

  function reportBaseName(suffix: string) {
    return buildReportBaseName({
      traceId: selectedTrace.trace_id,
      traceName: String(selectedTrace.metadata?.trace_name ?? "trace"),
      suffix,
    });
  }

  async function downloadReportCsv() {
    if (!result) return;
    const r = await exportReportCsv(result);
    downloadText(
      reportBaseName("report.csv"),
      r.text,
      "text/csv;charset=utf-8",
    );
  }

  function buildHtmlReport() {
    if (!result) return "";
    return buildHtmlReportDocument({
      result,
      trace: selectedTrace,
      markdownReport: report,
      appVersion: APP_VERSION,
      includePlots: true,
    });
  }

  function downloadReportHtml() {
    if (!result) return;
    downloadText(
      reportBaseName("report.html"),
      buildHtmlReport(),
      "text/html;charset=utf-8",
    );
  }
  function openAndScroll(sectionId: string) {
    setActiveView(sectionId === "model" ? "model" : "fitting");
    setOpenSections((current) => ({ ...current, [sectionId]: true }));
    window.setTimeout(
      () =>
        document
          .getElementById(`section-${sectionId}`)
          ?.scrollIntoView({ block: "start", behavior: "smooth" }),
      50,
    );
  }

  const reportAvailable = canGenerateReport({
    hasSelectedTrace,
    isFitting,
    hasResult: result !== null,
    lifecycle: fitLifecycle,
  });

  const fitStatusNode = (
    <FitStatusBar
      result={result}
      language={language}
      isFitting={isFitting}
      elapsedSeconds={elapsedSeconds}
      lifecycleStatus={fitLifecycle}
    />
  );

  const fitActionsNode = (
    <>
      <button
        className={hasSelectedTrace ? "primary" : "fit-action-unavailable"}
        disabled={isFitting || !hasSelectedTrace}
        title={
          !hasSelectedTrace ? "Import data before running a fit." : undefined
        }
        onClick={runFit}
      >
        <span className="button-icon" aria-hidden="true">
          ▶
        </span>
        {t(language, "runFit")}
      </button>
      <button
        className={isFitting ? "danger-soft active" : "danger-soft"}
        disabled={!isFitting}
        onClick={stopFit}
      >
        <span className="button-icon" aria-hidden="true">
          ■
        </span>
        {language === "zh" ? "停止拟合" : "Stop fit"}
      </button>
      <button
        disabled={!reportAvailable}
        title={
          !reportAvailable ? "Available after a completed fit." : undefined
        }
        onClick={makeReport}
      >
        <span className="button-icon" aria-hidden="true">
          ▣
        </span>
        {t(language, "report")}
      </button>
    </>
  );

  const fitMessagesNode = (
    <>
      {!selectedTrace.voltage_V.length && !error ? (
        <div className="fit-primary-message empty">
          <strong>No trace loaded.</strong>
          <span>Import data or load a synthetic example before fitting.</span>
        </div>
      ) : null}
      {fitPromotionNotice ? (
        <div className="fit-primary-message warning">
          <strong>Gate failed:</strong>
          <span>fitted values were not promoted to initials.</span>
        </div>
      ) : null}
      {isFitting ? (
        <div className="fit-primary-message info">
          Fitting is running; Stop fit aborts the current request and ignores
          late results.
        </div>
      ) : null}
      {error ? (
        isBackendConnectionError(error) ? (
          <BackendConnectionBanner message={error} onRetry={runFit} />
        ) : (
          <div
            className={
              noTraceRunAttempted
                ? "warning error validation fit-primary-message"
                : "warning error fit-primary-message"
            }
          >
            {error}
          </div>
        )
      ) : null}
    </>
  );

  const zoomControl = (
    <div
      className="zoom-control sidebar-zoom-control"
      title={t(language, "appZoomHelp")}
    >
      <button
        onClick={() =>
          setZoom((z) => Math.max(0.55, Number((z - 0.06).toFixed(2))))
        }
      >
        −
      </button>
      <span>{Math.round(zoom * 100)}%</span>
      <button
        onClick={() =>
          setZoom((z) => Math.min(1.6, Number((z + 0.06).toFixed(2))))
        }
      >
        +
      </button>
    </div>
  );

  function startPaneResize(
    event: ReactPointerEvent<HTMLDivElement>,
    setter: (value: number) => void,
    min = 26,
    max = 78,
  ) {
    const container = event.currentTarget.parentElement;
    if (!container) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const rect = container.getBoundingClientRect();
    const onMove = (move: PointerEvent) => {
      const pct = ((move.clientX - rect.left) / Math.max(1, rect.width)) * 100;
      setter(Math.min(max, Math.max(min, Number(pct.toFixed(1)))));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  }

  return (
    <div
      className={sidebarCollapsed ? "app sidebar-collapsed" : "app"}
      style={{ "--app-zoom": zoom } as ZoomStyle}
    >
      <WorkflowSidebar
        activeView={activeView}
        onSelect={setActiveView}
        version={APP_VERSION}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
        language={language}
        onLanguageChange={setLanguage}
        zoomControl={zoomControl}
      />
      <main className="workspace workflow-shell">
        {activeView !== "start" ? (
          <WorkflowContextBar
            selectedTrace={selectedTrace}
            hasSelectedTrace={hasSelectedTrace}
            model={model}
            result={result}
            isFitting={isFitting}
            lifecycle={fitLifecycle}
            reportAvailable={reportAvailable}
          />
        ) : null}
        {activeView === "start" ? (
          <StartHerePage
            setActiveView={setActiveView}
            hasSelectedTrace={hasSelectedTrace}
            result={result}
            isFitting={isFitting}
            reportAvailable={reportAvailable}
          />
        ) : activeView === "data" ? (
          <DataImportWorkspace
            traces={traces}
            selectedTraceId={selectedTraceId}
            onTraces={(next) => {
              setTraces(next);
              setResult(null);
              setReportArtifacts(emptyReportArtifacts);
              setDataBoundsReport(null);
            }}
            onSelectTrace={(id) => {
              setSelectedTraceId(id);
              setResult(null);
              setReportArtifacts(emptyReportArtifacts);
              setDataBoundsReport(null);
              setNoTraceRunAttempted(false);
            }}
            model={model}
            language={language}
          />
        ) : activeView === "model" ? (
          <ModelWorkflowPage
            model={model}
            setModel={(next) => {
              setModel(next);
              setPreFitInitialModel(null);
              setResult(null);
              setReportArtifacts(emptyReportArtifacts);
              setDataBoundsReport(null);
            }}
            registry={registry}
            equationSummary={equationSummary}
            result={result}
            language={language}
            isFitting={isFitting}
            leftPct={modelPanePct}
            onResizeStart={(event) =>
              startPaneResize(event, setModelPanePct, 28, 65)
            }
            syntheticTool={
              <SyntheticTraceTool
                traces={traces}
                onTraces={(next) => {
                  setTraces(next);
                  setResult(null);
                  setReportArtifacts(emptyReportArtifacts);
                  setDataBoundsReport(null);
                }}
                onSelectTrace={(id) => {
                  setSelectedTraceId(id);
                  setResult(null);
                  setReportArtifacts(emptyReportArtifacts);
                  setDataBoundsReport(null);
                  setNoTraceRunAttempted(false);
                }}
                model={model}
                language={language}
                disabled={isFitting}
              />
            }
          />
        ) : activeView === "fitting" ? (
          <FittingWorkflowPage
            selectedTrace={selectedTrace}
            selectedTraceId={selectedTraceId}
            traces={traces}
            setSelectedTraceId={(id) => {
              setSelectedTraceId(id);
              setResult(null);
              setReportArtifacts(emptyReportArtifacts);
              setDataBoundsReport(null);
              setNoTraceRunAttempted(false);
            }}
            setActiveView={setActiveView}
            config={config}
            setConfig={setConfig}
            autoVoltageRange={autoVoltageRange}
            fitDrawerMode={fitDrawerMode}
            setFitDrawerMode={setFitDrawerMode}
            fitActions={fitActionsNode}
            fitStatus={fitStatusNode}
            fitMessages={fitMessagesNode}
            fitPromotionNotice={fitPromotionNotice}
            result={result}
            registry={registry}
            model={model}
            updateParameterModel={(next) => {
              setModel(next);
              setReportArtifacts(emptyReportArtifacts);
              setDataBoundsReport(null);
            }}
            canRestoreInitialValues={preFitInitialModel !== null}
            onRestoreInitialValues={() => {
              if (preFitInitialModel) {
                setModel((current) =>
                  restoreModelParameterValues(current, preFitInitialModel),
                );
                setDataBoundsReport(null);
              }
            }}
            onApplyDataBounds={applyDataBounds}
            canSeedSyntheticGroundTruth={canSeedSyntheticGroundTruth}
            onSeedSyntheticGroundTruth={seedFromSyntheticGroundTruth}
            dataBoundsReport={dataBoundsReport}
            isFitting={isFitting}
            language={language}
            leftPct={fittingPanePct}
            onResizeStart={(event) =>
              startPaneResize(event, setFittingPanePct, 22, 48)
            }
          />
        ) : activeView === "report" ? (
          <ReportWorkflowPage
            selectedTrace={selectedTrace}
            hasSelectedTrace={hasSelectedTrace}
            model={model}
            result={result}
            report={report}
            reportMessage={reportMessage}
            reportAvailable={reportAvailable}
            isFitting={isFitting}
            fitLifecycle={fitLifecycle}
            fitPromotionNotice={fitPromotionNotice}
            fitSessionStats={fitSessionStats}
            dismissedWarningKey={dismissedWarningKey}
            setDismissedWarningKey={setDismissedWarningKey}
            openAndScroll={openAndScroll}
            makeReport={makeReport}
            onExportReportCsv={downloadReportCsv}
            onExportReportHtml={downloadReportHtml}
            setActiveView={setActiveView}
            language={language}
            leftPct={reportPanePct}
            onResizeStart={(event) =>
              startPaneResize(event, setReportPanePct, 54, 82)
            }
          />
        ) : (
          <UserDocumentationPage
            view={activeView}
            registry={registry}
            appVersion={APP_VERSION}
            language={language}
          />
        )}
        {activeView === "fitting" && (
          <div className="mobile-action-bar">
            <button
              className={
                hasSelectedTrace ? "primary" : "fit-action-unavailable"
              }
              disabled={isFitting || !hasSelectedTrace}
              onClick={runFit}
            >
              {t(language, "runFit")}
            </button>
            <button
              className={isFitting ? "danger-soft active" : "danger-soft"}
              disabled={!isFitting}
              onClick={stopFit}
            >
              {language === "zh" ? "Stop fit" : "Stop fit"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
