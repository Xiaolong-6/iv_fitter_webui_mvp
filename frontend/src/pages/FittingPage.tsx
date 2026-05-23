import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
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

const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? "1.3.12";

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
}) {
  return <div className="content-grid">
    <aside className="control-stack">
      <FitConfigPanel config={props.config} onChange={props.setConfig} language={props.language} />
      <ModelBuilder model={props.model} registry={props.registry} onChange={props.setModel} language={props.language} />
    </aside>

    <section className="plot-stack main-results-stack">
      <ErrorBoundary label="Plot workspace">
        <PlotWorkspace traces={props.traces} selectedTraceId={props.selectedTraceId} result={props.result} language={props.language} />
      </ErrorBoundary>
      <div className="main-result-grid">
        <ErrorBoundary label="Parameter table">
          <ParameterTable result={props.result} language={props.language} />
        </ErrorBoundary>
        <WarningsPanel result={props.result} language={props.language} />
      </div>
      <EquationPreview equations={props.equationSummary} language={props.language} />
      {props.report && <section className="card report-card"><h2>{t(props.language, "markdownReport")}</h2><textarea readOnly value={props.report} rows={12} /></section>}
    </section>
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
  const [report, setReport] = useState<string>("");
  const [equationSummary, setEquationSummary] = useState<EquationSummary | null>(null);
  const [zoom, setZoom] = useState(0.92);
  const [activeView, setActiveView] = useState<AppView>("workspace");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [language, setLanguage] = useState<Language>("en");

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
    const handle = window.setTimeout(() => {
      equations(model).then(setEquationSummary).catch((e) => {
        console.warn("Equation preview failed", e);
        setEquationSummary(null);
      });
    }, 250);
    return () => window.clearTimeout(handle);
  }, [model]);

  useEffect(() => {
    function onWheel(event: WheelEvent) {
      if (!event.ctrlKey) return;
      event.preventDefault();
      setZoom((current) => {
        const next = current + (event.deltaY > 0 ? -0.04 : 0.04);
        return Math.min(1.18, Math.max(0.72, Number(next.toFixed(2))));
      });
    }
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, []);

  async function runFit() {
    setError(null);
    setReport("");
    setActiveView("workspace");
    if (!selectedTrace.voltage_V.length) {
      setResult(null);
      setError(t(language, "noTraceError"));
      return;
    }
    try {
      setResult(await fitTrace(selectedTrace, model, config));
    } catch (e) {
      setError(String(e));
    }
  }

  async function makeReport() {
    if (!result) return;
    const r = await exportReport(result);
    setReport(r.markdown);
    setActiveView("workspace");
  }

  return <div className={sidebarCollapsed ? "app sidebar-collapsed" : "app"} style={{ "--app-zoom": zoom } as ZoomStyle}>
    <WorkflowSidebar activeView={activeView} onSelect={setActiveView} version={APP_VERSION} collapsed={sidebarCollapsed} onToggleCollapsed={() => setSidebarCollapsed((v) => !v)} language={language} onLanguageChange={setLanguage} />
    <main className="workspace">
      <div className="topbar">
        <FitStatusBar result={result} language={language} />
        <div className="toolbar">
          <button className="primary" onClick={runFit}>{t(language, "runFit")}</button>
          <button disabled={!result} onClick={makeReport}>{t(language, "report")}</button>
          <div className="zoom-control" title={t(language, "appZoomHelp")}>
            <button onClick={() => setZoom((z) => Math.max(0.72, Number((z - 0.06).toFixed(2))))}>−</button>
            <span>{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom((z) => Math.min(1.18, Number((z + 0.06).toFixed(2))))}>+</button>
          </div>
        </div>
      </div>

      {error && <div className="warning error">{error}</div>}

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
      /> : <UserDocumentationPage view={activeView} registry={registry} appVersion={APP_VERSION} language={language} />}
    </main>
  </div>;
}
