import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent, ReactNode } from "react";
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
  exportDiagnosticsJson,
  exportParametersCsv,
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
import { FitConfigPanel } from "../components/FitConfigPanel";
import { EquationPreview } from "../components/EquationPreview";
import { ErrorBoundary } from "../components/ErrorBoundary";
import type { Language } from "../model/i18n";
import { t } from "../model/i18n";
import { buildReportBaseName, emptyReportArtifacts } from "../model/reportArtifacts";
import { canGenerateReport, createCancelledLifecycle, createErrorLifecycle, createRunningLifecycle, createTimeoutLifecycle, nextRunId, shouldAcceptRunResult, type FitLifecycleState } from "../model/fitLifecycle";

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

function WorkspaceView(props: {
  traces: TraceData[];
  selectedTrace: TraceData;
  selectedTraceId: string | null;
  setTraces: (traces: TraceData[]) => void;
  setSelectedTraceId: (id: string) => void;
  model: ModelSpec;
  setModel: (model: ModelSpec) => void;
  updateParameterModel: (model: ModelSpec) => void;
  canRestoreInitialValues: boolean;
  onRestoreInitialValues: () => void;
  config: FitConfig;
  setConfig: (config: FitConfig) => void;
  autoVoltageRange: { vMin: number | null; vMax: number | null };
  advancedFitOptionsOpen: boolean;
  setAdvancedFitOptionsOpen: (open: boolean) => void;
  registry: FunctionDefinition[];
  result: FitResult | null;
  report: string;
  reportMessage: string;
  onExportReportCsv: () => void;
  onExportParametersCsv: () => void;
  onExportDiagnosticsJson: () => void;
  equationSummary: EquationSummary | null;
  language: Language;
  openSections: Record<string, boolean>;
  setOpenSections: (sections: Record<string, boolean>) => void;
  setActiveView: (view: AppView) => void;
  fitStatus: ReactNode;
  fitActions: ReactNode;
  fitMessages: ReactNode;
  onApplyDataBounds: () => void;
  canSeedSyntheticGroundTruth: boolean;
  onSeedSyntheticGroundTruth: () => void;
  dataBoundsReport: DataBoundsApplicationReport | null;
  isFitting: boolean;
  fitSessionStats: FitSessionStats;
  fitLifecycle: FitLifecycleState;
}) {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [leftPaneWidth, setLeftPaneWidth] = useState(() => {
    const saved = window.localStorage.getItem(
      "ivfitter.workspace.leftPaneWidth",
    );
    const parsed = saved ? Number(saved) : NaN;
    return Number.isFinite(parsed) ? parsed : 520;
  });

  function clampLeftPaneWidth(nextWidth: number) {
    const containerWidth = gridRef.current?.getBoundingClientRect().width ?? 0;
    const maxWidth =
      containerWidth > 0 ? Math.max(320, containerWidth - 520) : 760;
    return Math.min(Math.max(nextWidth, 300), Math.min(maxWidth, 820));
  }

  function resizeLeftPane(clientX: number) {
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return;
    const nextWidth = clampLeftPaneWidth(clientX - rect.left);
    setLeftPaneWidth(nextWidth);
    window.localStorage.setItem(
      "ivfitter.workspace.leftPaneWidth",
      String(Math.round(nextWidth)),
    );
  }

  function startPaneResize(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeLeftPane(event.clientX);
  }

  function handlePaneResize(event: PointerEvent<HTMLButtonElement>) {
    if (event.buttons !== 1) return;
    resizeLeftPane(event.clientX);
  }

  function toggleSection(id: string) {
    props.setOpenSections({
      ...props.openSections,
      [id]: !props.openSections[id],
    });
  }
  function Section({
    id,
    title,
    children,
  }: {
    id: string;
    title: string;
    children: ReactNode;
  }) {
    const open = props.openSections[id] ?? true;
    return (
      <section
        id={`section-${id}`}
        className={`${open ? "workspace-section open" : "workspace-section collapsed"} workspace-section-${id}`}
      >
        <button
          className="workspace-section-head"
          onClick={() => toggleSection(id)}
          aria-expanded={open}
        >
          <span>{title}</span>
        </button>
        <div className="workspace-section-body">{children}</div>
      </section>
    );
  }
  return (
    <div
      ref={gridRef}
      className="content-grid workspace-split-grid"
      style={
        { "--workspace-left-width": `${leftPaneWidth}px` } as CSSProperties
      }
    >
      <aside className="control-stack control-stack-with-bottom-fit">
        <div className="control-scroll-content">
          <Section id="model" title={t(props.language, "modelBuilder")}>
            <ErrorBoundary label="Model builder">
              <ModelBuilder
                model={props.model}
                registry={props.registry}
                onChange={props.setModel}
                language={props.language}
                disabled={props.isFitting}
              />
            </ErrorBoundary>
          </Section>
          <Section id="preview" title={t(props.language, "equationPreview")}>
            <ErrorBoundary label="Equation preview">
              <EquationPreview
                equations={props.equationSummary}
                model={props.model}
                result={props.result}
                language={props.language}
              />
            </ErrorBoundary>
          </Section>
        </div>

        <section
          id="section-fitSetup"
          className="workspace-section workspace-section-fitSetup fit-setup-bottom-dock open"
          aria-label={t(props.language, "fitSetup")}
        >
          <div className="workspace-section-body">
            <ErrorBoundary label="Fit config panel">
              <FitConfigPanel
                config={props.config}
                onChange={props.setConfig}
                language={props.language}
                disabled={props.isFitting}
                advancedOpen={props.advancedFitOptionsOpen}
                onAdvancedOpenChange={props.setAdvancedFitOptionsOpen}
                autoVoltageRange={props.autoVoltageRange}
                actionDock={
                  <div
                    className="fit-setup-action-dock"
                    aria-label={
                      props.language === "zh" ? "拟合操作" : "Fit actions"
                    }
                  >
                    <div className="fit-action-row">{props.fitActions}</div>
                  </div>
                }
                statusDock={
                  <div
                    className="fit-setup-footer-content"
                    aria-label={
                      props.language === "zh" ? "拟合状态" : "Fit status"
                    }
                  >
                    {props.fitStatus}
                    {props.fitMessages ? (
                      <div className="fit-message-stack">
                        {props.fitMessages}
                      </div>
                    ) : null}
                  </div>
                }
              />
            </ErrorBoundary>
          </div>
        </section>
      </aside>

      <button
        type="button"
        className="workspace-resizer"
        aria-label={
          props.language === "zh"
            ? "调整拟合设置和结果区域宽度"
            : "Resize setup and results panes"
        }
        title={
          props.language === "zh" ? "拖动调整左右宽度" : "Drag to resize panes"
        }
        onPointerDown={startPaneResize}
        onPointerMove={handlePaneResize}
      />

      <section className="plot-stack main-results-stack">
        <Section id="plots" title={t(props.language, "plots")}>
          <ErrorBoundary label="Plot workspace">
            <PlotWorkspace
              traces={props.traces}
              selectedTraceId={props.selectedTraceId}
              onSelectTrace={props.setSelectedTraceId}
              onImportData={() => props.setActiveView("data")}
              result={props.result}
              language={props.language}
              disabled={props.isFitting}
            />
          </ErrorBoundary>
        </Section>
        <div className="main-result-grid">
          <Section id="parameters" title={t(props.language, "parameters")}>
            <ErrorBoundary label="Parameter table">
              <ParameterTable
                result={props.result}
                model={props.model}
                registry={props.registry}
                onModelChange={props.updateParameterModel}
                language={props.language}
                canRestoreInitialValues={props.canRestoreInitialValues}
                onRestoreInitialValues={props.onRestoreInitialValues}
                onApplyDataBounds={props.onApplyDataBounds}
                canSeedSyntheticGroundTruth={props.canSeedSyntheticGroundTruth}
                onSeedSyntheticGroundTruth={props.onSeedSyntheticGroundTruth}
                dataBoundsReport={props.dataBoundsReport}
                disabled={props.isFitting}
              />
            </ErrorBoundary>
          </Section>
        </div>
        {props.report && (
          <section className="card report-card">
            <h2>{t(props.language, "markdownReport")}</h2>
            <div className="report-actions">
              <button type="button" onClick={props.onExportReportCsv}>{props.language === "zh" ? "下载完整 CSV 报告" : "Download report CSV"}</button>
              <button type="button" onClick={props.onExportParametersCsv}>{props.language === "zh" ? "下载参数 CSV" : "Download parameter CSV"}</button>
              <button type="button" onClick={props.onExportDiagnosticsJson}>{props.language === "zh" ? "下载 diagnostics JSON" : "Download diagnostics JSON"}</button>
            </div>
            {props.reportMessage ? <p className="muted">{props.reportMessage}</p> : null}
            <textarea readOnly value={props.report} rows={12} />
          </section>
        )}
      </section>
    </div>
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
  const [advancedFitOptionsOpen, setAdvancedFitOptionsOpen] = useState(false);
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
  const [activeView, setActiveView] = useState<AppView>("workspace");
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
    setActiveView("workspace");
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
      if (!shouldAcceptRunResult({ activeRunId: activeFitRunIdRef.current, runId })) return;
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
          : `Fit exceeded ${timeoutS} s. The request was stopped and this run result will not update the workspace.`,
      );
    }, timeoutS * 1000);
    try {
      const fit = await fitTrace(
        selectedTrace,
        modelBeforeFit,
        { ...config, run_timeout_s: timeoutS },
        controller.signal,
      );
      if (!shouldAcceptRunResult({ activeRunId: activeFitRunIdRef.current, runId, cancelledRunIds: cancelledFitRunIdsRef.current })) return;
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
      setFitLifecycle({ kind: "idle" });
    } catch (e) {
      if (!shouldAcceptRunResult({ activeRunId: activeFitRunIdRef.current, runId, cancelledRunIds: cancelledFitRunIdsRef.current })) return;
      if (e instanceof DOMException && e.name === "AbortError") {
        cancelledFitRunIdsRef.current.add(runId);
        activeFitRunIdRef.current = null;
        setFitLifecycle(createCancelledLifecycle(runId, elapsedSeconds));
        setError(
          language === "zh"
            ? "拟合请求已中止。本次结果不会写入界面。"
            : "Fit request was aborted. This run result will not update the workspace.",
        );
      } else {
        const message = String(e);
        setFitLifecycle(createErrorLifecycle(runId, message));
        setError(message);
      }
    } finally {
      window.clearTimeout(timeoutId);
      if (abortFitRef.current === controller) abortFitRef.current = null;
      if (activeFitRunIdRef.current === runId)
        activeFitRunIdRef.current = null;
      if (activeFitRunIdRef.current === runId || fitRunSeqRef.current === runId) {
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
    setFitLifecycle(createCancelledLifecycle(runId ?? fitRunSeqRef.current, elapsedSeconds));
    setError(
      language === "zh"
        ? "已停止当前拟合请求。本次结果不会写入界面。"
        : "Current fit request stopped. This run result will not update the workspace.",
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
      message: language === "zh" ? "报告已生成。可下载完整 CSV、参数 CSV 或 diagnostics JSON。" : "Report generated. You can download the full CSV, parameter CSV, or diagnostics JSON.",
    });
    setActiveView("workspace");
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
    setReportArtifacts((current) => ({ ...current, message: `${language === "zh" ? "已导出" : "Exported"}: ${filename}` }));
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
    downloadText(reportBaseName("report.csv"), r.text, "text/csv;charset=utf-8");
  }

  async function downloadParametersCsv() {
    if (!result) return;
    const r = await exportParametersCsv(result);
    downloadText(reportBaseName("parameters.csv"), r.text, "text/csv;charset=utf-8");
  }

  async function downloadDiagnosticsJson() {
    if (!result) return;
    const r = await exportDiagnosticsJson(result);
    downloadText(reportBaseName("diagnostics.json"), r.text, "application/json;charset=utf-8");
  }
  function openAndScroll(sectionId: string) {
    setActiveView("workspace");
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
      <main className="workspace">
        {activeView === "data" ? (
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
        ) : activeView === "workspace" ? (
          <WorkspaceView
            traces={traces}
            selectedTrace={selectedTrace}
            selectedTraceId={selectedTraceId}
            setTraces={(next) => {
              setTraces(next);
              setResult(null);
              setReportArtifacts(emptyReportArtifacts);
              setDataBoundsReport(null);
              setNoTraceRunAttempted(false);
            }}
            setSelectedTraceId={(id) => {
              setSelectedTraceId(id);
              setResult(null);
              setReportArtifacts(emptyReportArtifacts);
              setDataBoundsReport(null);
              setNoTraceRunAttempted(false);
            }}
            model={model}
            setModel={(next) => {
              setModel(next);
              setPreFitInitialModel(null);
              setResult(null);
              setReportArtifacts(emptyReportArtifacts);
              setDataBoundsReport(null);
            }}
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
            config={config}
            setConfig={setConfig}
            autoVoltageRange={autoVoltageRange}
            advancedFitOptionsOpen={advancedFitOptionsOpen}
            setAdvancedFitOptionsOpen={setAdvancedFitOptionsOpen}
            registry={registry}
            result={result}
            report={report}
            reportMessage={reportMessage}
            onExportReportCsv={downloadReportCsv}
            onExportParametersCsv={downloadParametersCsv}
            onExportDiagnosticsJson={downloadDiagnosticsJson}
            equationSummary={equationSummary}
            language={language}
            openSections={openSections}
            setOpenSections={setOpenSections}
            setActiveView={setActiveView}
            fitStatus={
              <FitStatusBar
                result={result}
                language={language}
                isFitting={isFitting}
                elapsedSeconds={elapsedSeconds}
                lifecycleStatus={fitLifecycle}
              />
            }
            fitActions={
              <>
                <button
                  className={
                    hasSelectedTrace ? "primary" : "fit-action-unavailable"
                  }
                  disabled={isFitting || !hasSelectedTrace}
                  title={
                    !hasSelectedTrace
                      ? language === "zh"
                        ? "请先导入数据再运行拟合。"
                        : "Import data before running a fit."
                      : undefined
                  }
                  onClick={runFit}
                >
                  {t(language, "runFit")}
                </button>
                <button
                  className={isFitting ? "danger-soft active" : "danger-soft"}
                  disabled={!isFitting}
                  onClick={stopFit}
                >
                  {language === "zh" ? "停止拟合" : "Stop fit"}
                </button>
                <button
                  disabled={!reportAvailable}
                  title={
                    !reportAvailable
                      ? language === "zh"
                        ? "完成一次拟合后可生成报告。"
                        : "Available after a completed fit."
                      : undefined
                  }
                  onClick={makeReport}
                >
                  {t(language, "report")}
                </button>
              </>
            }
            onApplyDataBounds={applyDataBounds}
            canSeedSyntheticGroundTruth={canSeedSyntheticGroundTruth}
            onSeedSyntheticGroundTruth={seedFromSyntheticGroundTruth}
            dataBoundsReport={dataBoundsReport}
            fitMessages={
              <>
                {!selectedTrace.voltage_V.length && !error ? (
                  <div className="fit-primary-message empty">
                    <strong>
                      {language === "zh"
                        ? "还没有加载 trace。"
                        : "No trace loaded."}
                    </strong>
                    <span>
                      {language === "zh"
                        ? "导入数据或加载 synthetic example 后再拟合。"
                        : "Import data or load a synthetic example before fitting."}
                    </span>
                  </div>
                ) : null}
                {fitPromotionNotice ? (
                  <div className="fit-primary-message warning">
                    <strong>
                      {language === "zh" ? "门控未通过：" : "Gate failed:"}
                    </strong>
                    <span>
                      {language === "zh"
                        ? "fitted values 没有写回下一次初值。"
                        : "fitted values were not promoted to initials."}
                    </span>
                  </div>
                ) : null}
                {isFitting ? (
                  <div className="fit-primary-message info">
                    {language === "zh"
                      ? "拟合正在运行；Stop fit 会中止当前请求并忽略迟到结果。"
                      : "Fitting is running; Stop fit aborts the current request and ignores late results."}
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
                {result || fitPromotionNotice ? (
                  <details className="fit-details-drawer">
                    <summary>
                      {language === "zh"
                        ? "Details / diagnostics"
                        : "Details / diagnostics"}
                    </summary>
                    <div className="fit-details-drawer-body">
                      {fitPromotionNotice ? (
                        <div className="fit-full-note">
                          {fitPromotionNotice}
                        </div>
                      ) : null}
                      {result ? (
                        <FitProcessDiagnostics
                          result={result}
                          language={language}
                          sessionStats={fitSessionStats}
                        />
                      ) : null}
                      {result &&
                      warningDismissKey(result) !== dismissedWarningKey ? (
                        <FitDiagnostics
                          result={result}
                          language={language}
                          onCheckLogIv={() => openAndScroll("plots")}
                          onAdjustInitials={() => openAndScroll("model")}
                          onClose={() =>
                            setDismissedWarningKey(warningDismissKey(result))
                          }
                        />
                      ) : null}
                    </div>
                  </details>
                ) : null}
              </>
            }
            isFitting={isFitting}
            fitSessionStats={fitSessionStats}
            fitLifecycle={fitLifecycle}
          />
        ) : (
          <UserDocumentationPage
            view={activeView}
            registry={registry}
            appVersion={APP_VERSION}
            language={language}
          />
        )}
        {activeView === "workspace" && (
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
              {language === "zh" ? "停止拟合" : "Stop fit"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
