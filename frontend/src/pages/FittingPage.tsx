import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { FitConfig, FitResult, FunctionDefinition, ModelSpec, TraceData, EquationSummary } from "../model/types";
import { equations, exportReport, fitTrace, getRegistry } from "../api/client";
import { emptyTrace, estimateResidualFloorA } from "../model/utils";
import { WorkflowSidebar, type AppView } from "../components/WorkflowSidebar";
import { UserDocumentationPage } from "../components/UserDocumentationPage";
import { ModelBuilder } from "../components/ModelBuilder";
import { PlotWorkspace } from "../components/PlotWorkspace";
import { FitStatusBar } from "../components/FitStatusBar";
import { ParameterTable } from "../components/ParameterTable";
import { WarningsPanel } from "../components/WarningsPanel";
import { DataImportWorkspace } from "../components/DataImportWorkspace";
import { FitConfigPanel } from "../components/FitConfigPanel";
import { EquationPreview } from "../components/EquationPreview";
import { ErrorBoundary } from "../components/ErrorBoundary";
import type { Language } from "../model/i18n";
import { t } from "../model/i18n";

const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? "dev";

const initialModel: ModelSpec = {
  core: [{ id: "D1", location: "core", function_type: "diode", law_id: "shockley_diode", evaluation_form: "current_branch", placement: "junction_current_branch", params: { I0_A: { value: 1e-12, lower: 1e-30, upper: 1, fit: true, unit: "A", label: "I0" }, n: { value: 1.5, lower: 0.5, upper: 10, fit: true, label: "n" } }, metadata: { nickname: "D1" } }],
  series: [{ id: "ohmic_1", location: "series", function_type: "constant_rs", law_id: "ohmic", evaluation_form: "voltage_drop", placement: "series_voltage_drop", params: { Rs_ohm: { value: 10, lower: 0, upper: 1e9, fit: true, unit: "Ω", label: "Rs" } }, metadata: { nickname: "Rs" } }],
  parallel: [{ id: "ohmic_2", location: "parallel", function_type: "constant_rs", law_id: "ohmic", evaluation_form: "current_branch", placement: "parallel_current_branch", params: { Rs_ohm: { value: 1e9, lower: 1e3, upper: 1e18, fit: true, unit: "Ω", label: "Rsh" } }, metadata: { nickname: "Rsh" } }],
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
  config: FitConfig;
  setConfig: (config: FitConfig) => void;
  registry: FunctionDefinition[];
  result: FitResult | null;
  report: string;
  equationSummary: EquationSummary | null;
  language: Language;
  openSections: Record<string, boolean>;
  setOpenSections: (sections: Record<string, boolean>) => void;
}) {
  function toggleSection(id: string) {
    props.setOpenSections({ ...props.openSections, [id]: !props.openSections[id] });
  }
  function modelSummary() {
    const main = props.model.series.map((c) => String(c.metadata?.nickname ?? c.id)).join(" -> ") || "direct";
    const branches = [...props.model.core, ...props.model.parallel].map((c) => String(c.metadata?.nickname ?? c.id)).join(" || ") || "none";
    return `${main} | ${branches}`;
  }
  function Section({ id, title, summary, children }: { id: string; title: string; summary: string; children: ReactNode }) {
    const open = props.openSections[id] ?? true;
    return <section id={`section-${id}`} className={open ? "workspace-section open" : "workspace-section collapsed"}>
      <button className="workspace-section-head" onClick={() => toggleSection(id)} aria-expanded={open}>
        <span>{title}</span>
        <small>{summary}</small>
      </button>
      <div className="workspace-section-body">{children}</div>
    </section>;
  }
  return <div className="content-grid">
    <aside className="control-stack">
      <Section id="fitSetup" title={t(props.language, "fitSetup")} summary={props.config.v_min || props.config.v_max ? `${props.config.v_min ?? "auto"} to ${props.config.v_max ?? "auto"}` : "range: auto"}>
        <ErrorBoundary label="Fit config panel">
          <FitConfigPanel config={props.config} onChange={props.setConfig} language={props.language} />
        </ErrorBoundary>
      </Section>
      <Section id="model" title={t(props.language, "modelBuilder")} summary={modelSummary()}>
        <ErrorBoundary label="Model builder">
          <ModelBuilder model={props.model} registry={props.registry} onChange={props.setModel} language={props.language} />
        </ErrorBoundary>
      </Section>
    </aside>

    <section className="plot-stack main-results-stack">
      <Section id="plots" title={t(props.language, "plots")} summary={props.result ? "diagnostic views" : "load data or run fit"}>
        <ErrorBoundary label="Plot workspace">
          <PlotWorkspace traces={props.traces} selectedTraceId={props.selectedTraceId} onSelectTrace={props.setSelectedTraceId} result={props.result} language={props.language} />
        </ErrorBoundary>
      </Section>
      <div className="main-result-grid">
        <Section id="parameters" title={t(props.language, "parameters")} summary={props.result ? `${Object.keys(props.result.parameters).length} parameters` : "not fitted yet"}>
          <ErrorBoundary label="Parameter table">
            <ParameterTable result={props.result} language={props.language} />
          </ErrorBoundary>
        </Section>
        <Section id="warnings" title={t(props.language, "warnings")} summary={props.result ? `${props.result.warnings.length} item(s)` : "none yet"}>
          <ErrorBoundary label="Warnings panel">
            <WarningsPanel result={props.result} language={props.language} />
          </ErrorBoundary>
        </Section>
      </div>
      <Section id="preview" title={t(props.language, "equationPreview")} summary="formulas + solver">
        <ErrorBoundary label="Equation preview">
          <EquationPreview equations={props.equationSummary} model={props.model} result={props.result} language={props.language} />
        </ErrorBoundary>
      </Section>
      {props.report && <section className="card report-card"><h2>{t(props.language, "markdownReport")}</h2><textarea readOnly value={props.report} rows={12} /></section>}
    </section>
  </div>;
}


function isBackendConnectionError(message: string | null) {
  if (!message) return false;
  return /failed to fetch|networkerror|load failed|backend|connection/i.test(message);
}

function BackendConnectionBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  const help = "Check that the backend window is running, then open http://127.0.0.1:8000/api/health. For phone testing, also check firewall and use the LAN address printed by 04c_run_lan_dev.bat.";
  return <div className="backend-banner" role="alert">
    <div>
      <strong>Backend connection problem</strong>
      <p>IV-fitter could not reach the local fitting backend. The browser UI loaded, but fitting/import API calls are not available yet.</p>
      <small>{message}</small>
    </div>
    <div className="backend-banner-actions">
      <button className="primary" onClick={onRetry}>Retry</button>
      <button onClick={() => window.alert(help)}>Help</button>
    </div>
  </div>;
}

export function FittingPage() {
  const [registry, setRegistry] = useState<FunctionDefinition[]>([]);
  const [traces, setTraces] = useState<TraceData[]>([]);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [model, setModel] = useState<ModelSpec>(initialModel);
  const [config, setConfig] = useState<FitConfig>(initialConfig);
  const [result, setResult] = useState<FitResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFitting, setIsFitting] = useState(false);
  const cancelFitRef = useRef(false);
  const [report, setReport] = useState<string>("");
  const [equationSummary, setEquationSummary] = useState<EquationSummary | null>(null);
  const [zoom, setZoom] = useState(0.92);
  const [activeView, setActiveView] = useState<AppView>("workspace");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [language, setLanguage] = useState<Language>("en");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    fitSetup: true,
    model: false,
    plots: false,
    parameters: false,
    warnings: false,
    preview: false,
  });

  useEffect(() => {
    getRegistry().then(setRegistry).catch((e) => setError(String(e)));
  }, []);


  const selectedTrace = traces.find((t) => t.trace_id === selectedTraceId) ?? traces[0] ?? emptyTrace();
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
    if (!selectedTrace.voltage_V.length) return;
    const nextFloor = estimateResidualFloorA(selectedTrace);
    setConfig((current) => current.residual_floor_A === nextFloor ? current : { ...current, residual_floor_A: nextFloor });
  }, [selectedTraceDataKey, selectedTrace]);

  useEffect(() => {
    const controller = new AbortController();
    const handle = window.setTimeout(() => {
      equations(model, controller.signal).then(setEquationSummary).catch((e) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        if (typeof e === "object" && e !== null && "name" in e && (e as { name?: string }).name === "AbortError") return;
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

  async function runFit() {
    if (isFitting) return;
    setError(null);
    setReport("");
    setActiveView("workspace");
    if (!selectedTrace.voltage_V.length) {
      setResult(null);
      setError(t(language, "noTraceError"));
      return;
    }
    cancelFitRef.current = false;
    setIsFitting(true);
    try {
      const fit = await fitTrace(selectedTrace, model, config);
      if (cancelFitRef.current) return;
      setResult(fit);
      setOpenSections((current) => ({ ...current, plots: true, parameters: true, warnings: true }));
    } catch (e) {
      if (!cancelFitRef.current) setError(String(e));
    } finally {
      if (!cancelFitRef.current) setIsFitting(false);
    }
  }

  function stopFit() {
    cancelFitRef.current = true;
    setIsFitting(false);
    setError(language === "zh" ? "拟合已停止。当前后端请求可能仍会完成，但结果不会再写入界面。" : "Fit stopped. The current backend request may still finish, but its result will not update the workspace.");
  }


  async function makeReport() {
    if (!result) return;
    const r = await exportReport(result);
    setReport(r.markdown);
    setActiveView("workspace");
  }
  function openAndScroll(sectionId: string) {
    setActiveView("workspace");
    setOpenSections((current) => ({ ...current, [sectionId]: true }));
    window.setTimeout(() => document.getElementById(`section-${sectionId}`)?.scrollIntoView({ block: "start", behavior: "smooth" }), 50);
  }

  return <div className={sidebarCollapsed ? "app sidebar-collapsed" : "app"} style={{ "--app-zoom": zoom } as ZoomStyle}>
    <WorkflowSidebar activeView={activeView} onSelect={setActiveView} version={APP_VERSION} collapsed={sidebarCollapsed} onToggleCollapsed={() => setSidebarCollapsed((v) => !v)} language={language} onLanguageChange={setLanguage} />
    <main className="workspace">
      <div className="topbar">
        <FitStatusBar result={result} language={language} onCheckLogIv={() => openAndScroll("plots")} onAdjustInitials={() => openAndScroll("model")} />
        <div className="toolbar">
          <button className={isFitting ? "primary running" : "primary"} disabled={isFitting} onClick={runFit}>{isFitting ? (language === "zh" ? "拟合中…" : "Fitting…") : t(language, "runFit")}</button>
          <button className="danger-soft" disabled={!isFitting} onClick={stopFit}>{language === "zh" ? "停止" : "Stop"}</button>
          <button disabled={!result || isFitting} onClick={makeReport}>{t(language, "report")}</button>
          <div className="zoom-control" title={t(language, "appZoomHelp")}>
            <button onClick={() => setZoom((z) => Math.max(0.55, Number((z - 0.06).toFixed(2))))}>−</button>
            <span>{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom((z) => Math.min(1.6, Number((z + 0.06).toFixed(2))))}>+</button>
          </div>
        </div>
      </div>

      {isFitting && <div className="fit-running-banner">{language === "zh" ? "拟合正在运行…可以点击 Stop 忽略本次结果。" : "Fit is running… use Stop to ignore this run if needed."}</div>}
      {error && (isBackendConnectionError(error) ? <BackendConnectionBanner message={error} onRetry={runFit} /> : <div className="warning error">{error}</div>)}

      {activeView === "data" ? <DataImportWorkspace
        traces={traces}
        selectedTraceId={selectedTraceId}
        onTraces={(next) => { setTraces(next); setResult(null); setReport(""); }}
        onSelectTrace={(id) => { setSelectedTraceId(id); setResult(null); setReport(""); }}
        language={language}
      /> : activeView === "workspace" ? <WorkspaceView
        traces={traces}
        selectedTrace={selectedTrace}
        selectedTraceId={selectedTraceId}
        setTraces={(next) => { setTraces(next); setResult(null); setReport(""); }}
        setSelectedTraceId={(id) => { setSelectedTraceId(id); setResult(null); setReport(""); }}
        model={model}
        setModel={setModel}
        config={config}
        setConfig={setConfig}
        registry={registry}
        result={result}
        report={report}
        equationSummary={equationSummary}
        language={language}
        openSections={openSections}
        setOpenSections={setOpenSections}
      /> : <UserDocumentationPage view={activeView} registry={registry} appVersion={APP_VERSION} language={language} />}
      {activeView === "workspace" && <div className="mobile-action-bar"><button className={isFitting ? "primary running" : "primary"} disabled={isFitting} onClick={runFit}>{isFitting ? (language === "zh" ? "拟合中…" : "Fitting…") : t(language, "runFit")}</button><button className="danger-soft" disabled={!isFitting} onClick={stopFit}>{language === "zh" ? "停止" : "Stop"}</button></div>}
    </main>
  </div>;
}
