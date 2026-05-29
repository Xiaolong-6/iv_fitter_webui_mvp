import { useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent as ReactDragEvent } from "react";
import type { TraceData } from "../model/types";
import { importCsvTextMulti, openImportFileDialog, type ImportCsvTextMultiResponse } from "../api/client";
import type { Language } from "../model/i18n";
import { t } from "../model/i18n";
import { HelpTip } from "./HelpTip";
import { SimpleChart } from "./SimpleChart";

type ImportQuality = {
  rows_in_file?: number;
  rows_imported?: number;
  rows_dropped?: number;
  voltage_col?: string;
  current_col?: string;
  voltage_min_V?: number;
  voltage_max_V?: number;
  current_min_A?: number;
  current_max_A?: number;
  warnings?: string[];
};

type UnitOption = { value: string; label: string; factor: number };

function formatCell(value: number) {
  if (!Number.isFinite(value)) return "";
  const abs = Math.abs(value);
  if ((abs > 0 && abs < 1e-3) || abs >= 1e4) return value.toExponential(4);
  return String(Number(value.toPrecision(6)));
}

const voltageUnits: UnitOption[] = [
  { value: "V", label: "V", factor: 1 },
  { value: "mV", label: "mV", factor: 1e-3 },
  { value: "uV", label: "uV", factor: 1e-6 },
  { value: "kV", label: "kV", factor: 1e3 },
];

const currentUnits: UnitOption[] = [
  { value: "A", label: "A", factor: 1 },
  { value: "mA", label: "mA", factor: 1e-3 },
  { value: "uA", label: "uA", factor: 1e-6 },
  { value: "nA", label: "nA", factor: 1e-9 },
  { value: "pA", label: "pA", factor: 1e-12 },
];

function unitFactor(units: UnitOption[], value: string) {
  return units.find((u) => u.value === value)?.factor ?? 1;
}

function safeTraceName(name: string, fallback: string) {
  return name.trim().replace(/\s+/g, " ") || fallback;
}

function withDefaultImportedUnits(trace: TraceData): TraceData {
  return {
    ...trace,
    metadata: {
      ...trace.metadata,
      voltage_unit: String(trace.metadata?.voltage_unit ?? "V"),
      voltage_unit_factor_to_V: Number(trace.metadata?.voltage_unit_factor_to_V ?? 1),
      current_unit: String(trace.metadata?.current_unit ?? "A"),
      current_unit_factor_to_A: Number(trace.metadata?.current_unit_factor_to_A ?? 1),
      unit_mode: String(trace.metadata?.unit_mode ?? "si_internal"),
    },
  };
}

function logAbsForReview(values: number[]) {
  return values.map((value) => Math.log10(Math.max(Math.abs(value), 1e-30)));
}


function DatasetNameInput({ value, language, onCommit }: { value: string; language: Language; onCommit: (name: string) => void }) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  function commit() {
    const next = safeTraceName(draft, value);
    setDraft(next);
    onCommit(next);
  }

  return <input
    value={draft}
    aria-label={language === "zh" ? "Trace 名称" : "Trace name"}
    onChange={(event) => setDraft(event.target.value)}
    onBlur={commit}
    onKeyDown={(event) => {
      if (event.key === "Enter") {
        event.currentTarget.blur();
      }
      if (event.key === "Escape") {
        setDraft(value);
        event.currentTarget.blur();
      }
    }}
  />;
}

function TracePlotReview({ trace, language }: { trace?: TraceData; language: Language }) {
  if (!trace) return <div className="plot-review-empty warning info">{t(language, "noData")}</div>;
  const linear = [{ x: trace.voltage_V, y: trace.current_A, label: trace.trace_id, kind: "points" as const }];
  const log = [{ x: trace.voltage_V, y: logAbsForReview(trace.current_A), label: trace.trace_id, kind: "points" as const }];
  return <div className="trace-plot-review-grid">
    <SimpleChart title="Linear I-V" yLabel="Current (A)" series={linear} />
    <SimpleChart title="Log |I|" yLabel="log10(|I|)" series={log} />
  </div>;
}

export function DataImportWorkspace({ traces, selectedTraceId, onTraces, onSelectTrace, onNextToFitting, language }: {
  traces: TraceData[];
  selectedTraceId: string | null;
  onTraces: (t: TraceData[]) => void;
  onSelectTrace: (id: string) => void;
  onNextToFitting?: () => void;
  language: Language;
}) {
  const [pasteText, setPasteText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<"upload" | "paste" | "sample">("upload");
  const [importExpanded, setImportExpanded] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selected = traces.find((tr) => tr.trace_id === selectedTraceId) ?? traces[0];
  const voltageUnit = String(selected?.metadata?.voltage_unit ?? "V");
  const currentUnit = String(selected?.metadata?.current_unit ?? "A");
  const unitHelp = language === "zh"
    ? "选择原始导入列的实际单位。数据会立即换算成 V/A 用于预览、绘图和拟合。"
    : "Select the actual unit of the imported column. Data is immediately converted to V/A for preview, plots, and fitting.";

  const previewRows = useMemo(() => {
    return traces.flatMap((trace) => {
      const n = Math.min(trace.voltage_V.length, trace.current_A.length);
      return Array.from({ length: n }, (_, idx) => ({
        traceId: trace.trace_id,
        selected: trace.trace_id === selected?.trace_id,
        idx,
        v: trace.voltage_V[idx],
        i: trace.current_A[idx],
      }));
    });
  }, [traces, selected?.trace_id]);

  function importedResponseToTraces(response: ImportCsvTextMultiResponse) {
    const imported = response.traces.map((item) => withDefaultImportedUnits({
      ...item.trace,
      metadata: { ...item.trace.metadata, quality: item.quality },
    }));
    if (!imported.length) throw new Error(language === "zh" ? "未找到可导入的有限 V/I 数据。" : "No finite V/I traces were imported.");
    return imported;
  }

  function importMessage(response: ImportCsvTextMultiResponse, count: number) {
    return response.summary?.trim() || `${count} ${t(language, "tracesLoaded")}`;
  }

  async function parseTextImport(text: string, name: string) {
    const response = await importCsvTextMulti(text, name);
    return { response, imported: importedResponseToTraces(response) };
  }

  async function openImportPicker() {
    setMessage(null);
    try {
      const response = await openImportFileDialog();
      if (response.canceled) return;
      const imported = importedResponseToTraces(response);
      onTraces(imported);
      if (imported[0]) onSelectTrace(imported[0].trace_id);
      setImportExpanded(false);
      setMessage(importMessage(response, imported.length));
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      if (/Local file dialog is not available|Failed to fetch|NetworkError|Load failed/i.test(detail)) {
        fileInputRef.current?.click();
        return;
      }
      setMessage(detail);
    }
  }

  async function loadFile(file: File) {
    try {
      const text = await file.text();
      const { response, imported } = await parseTextImport(text, file.name);
      onTraces(imported);
      if (imported[0]) onSelectTrace(imported[0].trace_id);
      setImportExpanded(false);
      setMessage(importMessage(response, imported.length));
    } catch (e) {
      setMessage(String(e));
    }
  }

  async function loadPaste() {
    try {
      const { response, imported } = await parseTextImport(pasteText, "pasted-data");
      onTraces(imported);
      if (imported[0]) onSelectTrace(imported[0].trace_id);
      setImportExpanded(false);
      setMessage(importMessage(response, imported.length));
    } catch (e) {
      setMessage(String(e));
    }
  }

  function replaceSelected(nextTrace: TraceData) {
    if (!selected) return;
    const next = traces.map((tr) => tr.trace_id === selected.trace_id ? nextTrace : tr);
    onTraces(next);
    onSelectTrace(nextTrace.trace_id);
  }

  function renameSelected(name: string) {
    if (!selected) return;
    const nextName = safeTraceName(name, selected.trace_id);
    if (nextName === selected.trace_id) return;
    const existing = new Set(traces.filter((tr) => tr.trace_id !== selected.trace_id).map((tr) => tr.trace_id));
    let unique = nextName;
    let suffix = 2;
    while (existing.has(unique)) {
      unique = `${nextName} ${suffix++}`;
    }
    replaceSelected({ ...selected, trace_id: unique, metadata: { ...selected.metadata, dataset_name: unique } });
  }

  function changeUnit(kind: "voltage" | "current", nextUnit: string) {
    if (!selected) return;
    if (kind === "voltage") {
      const currentFactor = Number(selected.metadata?.voltage_unit_factor_to_V ?? unitFactor(voltageUnits, voltageUnit));
      const nextFactor = unitFactor(voltageUnits, nextUnit);
      const scale = nextFactor / (Number.isFinite(currentFactor) && currentFactor !== 0 ? currentFactor : 1);
      replaceSelected({
        ...selected,
        voltage_V: selected.voltage_V.map((value) => value * scale),
        metadata: { ...selected.metadata, voltage_unit: nextUnit, voltage_unit_factor_to_V: nextFactor, unit_mode: "import_unit_to_si_internal" },
      });
      return;
    }
    const currentFactor = Number(selected.metadata?.current_unit_factor_to_A ?? unitFactor(currentUnits, currentUnit));
    const nextFactor = unitFactor(currentUnits, nextUnit);
    const scale = nextFactor / (Number.isFinite(currentFactor) && currentFactor !== 0 ? currentFactor : 1);
    replaceSelected({
      ...selected,
      current_A: selected.current_A.map((value) => value * scale),
      metadata: { ...selected.metadata, current_unit: nextUnit, current_unit_factor_to_A: nextFactor, unit_mode: "import_unit_to_si_internal" },
    });
  }

  async function loadSampleData() {
    setMessage(null);
    try {
      const response = await fetch("/sample_data/happymeasure_combined_wide_v2_anonymized.csv", { cache: "no-store" });
      if (!response.ok) throw new Error(`Sample file request failed (${response.status})`);
      const csvText = await response.text();
      const { imported: nextTraces } = await parseTextImport(csvText, "happymeasure_combined_wide_v2_anonymized.csv");
      onTraces(nextTraces);
      onSelectTrace(nextTraces[0].trace_id);
      setImportExpanded(false);
      setMessage(`${t(language, "demoLoaded")} (${nextTraces.length} traces)`);
    } catch (err) {
      setMessage(`Sample data could not be loaded: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  function handleDrop(event: ReactDragEvent<HTMLElement>) {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) loadFile(file);
  }

  function handleDragOver(event: ReactDragEvent<HTMLElement>) {
    event.preventDefault();
    setDragActive(true);
  }

  function handleDragLeave(event: ReactDragEvent<HTMLElement>) {
    if (event.currentTarget === event.target) setDragActive(false);
  }

  const fileId = "data-workspace-file-input";
  const hasData = traces.length > 0;
  const showImportControls = !hasData || importExpanded;
  return <section className="data-workspace scroll-page web-page-flow">
    {message && <div className={message.toLowerCase().includes("error") || message.includes("Error") ? "warning error" : "warning info"}>{message}</div>}

    <div className={hasData ? "data-import-layout webpage-data-layout has-data" : "data-import-layout webpage-data-layout no-data"}>
      <section className="card import-actions-card data-source-card webpage-panel">
        <div className="card-head"><h3>{language === "zh" ? "导入数据" : "Import data"}</h3><HelpTip text={t(language, "importCsvHelp")} />{hasData && importExpanded ? <button type="button" className="ghost small" onClick={() => setImportExpanded(false)}>{language === "zh" ? "折叠" : "Collapse"}</button> : null}</div>

        {showImportControls ? <>
          <div className="data-source-tabs" role="tablist" aria-label={language === "zh" ? "数据来源" : "Data source"}>
            <button type="button" className={inputMode === "upload" ? "active" : ""} onClick={() => setInputMode("upload")}>{language === "zh" ? "上传 CSV/TXT" : "Upload CSV/TXT"}</button>
            <button type="button" className={inputMode === "paste" ? "active" : ""} onClick={() => setInputMode("paste")}>{t(language, "pasteData")}</button>
            <button type="button" className={inputMode === "sample" ? "active" : ""} onClick={() => setInputMode("sample")}>{language === "zh" ? "示例数据" : "Sample data"}</button>
          </div>
          {inputMode === "upload" ? <div
            className={`drop-import-zone${dragActive ? " drag-active" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <button type="button" className="file-button import-primary-action" title={`${t(language, "importCsvHelp")} ${t(language, "happyMeasureSupported")}`} onClick={openImportPicker}>{t(language, "importCsv")}</button>
            <input ref={fileInputRef} id={fileId} className="visually-hidden" type="file" accept=".csv,.txt,.dat" onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])} />
            <span>{language === "zh" ? "也可以把 CSV/TXT/DAT 文件拖到这里。" : "Or drag a CSV/TXT/DAT file here."}</span>
          </div> : null}
          {inputMode === "paste" ? <div className="inline-paste-panel">
            <textarea title={t(language, "pasteDataHelp")} value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder={t(language, "pastePlaceholder")} rows={10} />
            <button title={t(language, "parsePastedHelp")} disabled={!pasteText.trim()} onClick={loadPaste}>{t(language, "parsePastedData")}</button>
          </div> : null}
          {inputMode === "sample" ? <div className="sample-import-panel">
            <p className="muted">{language === "zh" ? "加载内置示例数据用于练习导入、选择 trace 和拟合流程。" : "Load the bundled sample dataset for practicing trace selection and fitting workflow."}</p>
            <button className="import-debug-action" title={t(language, "loadDemoHelp")} onClick={loadSampleData}>{language === "zh" ? "加载示例数据" : "Load sample data"}</button>
          </div> : null}
        </> : <div className="import-compact-summary collapsed-import-summary" aria-label={language === "zh" ? "导入数据已折叠" : "Import data collapsed"}>
          <button type="button" className="compact-import-row compact-import-toggle" onClick={() => setImportExpanded(true)}>
            <strong>{language === "zh" ? `已载入 ${traces.length} 条 trace` : `${traces.length} ${traces.length === 1 ? "trace" : "traces"} loaded`}</strong>
            <span className="muted">{language === "zh" ? "点击重新展开导入选项。" : "Click to reopen import options."}</span>
          </button>
        </div>}
      </section>

      {hasData ? <section className="card trace-selection-card webpage-panel compact-trace-selection-card">
        <div className="card-head"><h3>{t(language, "traceSelection")}</h3><HelpTip text={t(language, "traceSelectionHelp")} /></div>
        <div className="compact-trace-selection-row">
          <label className="trace-select-label structured-trace-select"><span>{language === "zh" ? "当前 trace" : "Current trace"}</span><select title={t(language, "selectedTraceHelp")} value={selected?.trace_id ?? ""} onChange={(e) => onSelectTrace(e.target.value)}>
            {traces.map((tr) => <option key={tr.trace_id} value={tr.trace_id}>{tr.trace_id}</option>)}
          </select></label>
          <span className="trace-count-pill">{language === "zh" ? `${traces.length} 条 trace` : `${traces.length} ${traces.length === 1 ? "trace" : "traces"}`}</span>
          <span className="trace-count-pill">{language === "zh" ? `${selected?.voltage_V.length ?? 0} 点` : `${selected?.voltage_V.length ?? 0} points`}</span>
          {onNextToFitting ? <button type="button" className="primary data-next-action compact-next-action" onClick={onNextToFitting}>{language === "zh" ? "前往模型构建" : "Go to Model Builder"}</button> : null}
        </div>
        <div className="parsed-settings compact-parsed-settings structured-units compact-unit-row">
          <label>
            <span>{language === "zh" ? "名称" : "Name"}</span>
            <DatasetNameInput value={selected?.trace_id ?? ""} language={language} onCommit={renameSelected} />
          </label>
          <label>
            <span>{language === "zh" ? "电压" : "V unit"}</span>
            <select value={voltageUnit} onChange={(e) => changeUnit("voltage", e.target.value)}>
              {voltageUnits.map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
            </select>
          </label>
          <label>
            <span>{language === "zh" ? "电流" : "I unit"}</span>
            <select value={currentUnit} onChange={(e) => changeUnit("current", e.target.value)}>
              {currentUnits.map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
            </select>
          </label>
        </div>
      </section> : null}

      {hasData ? <section className="card plot-review-card webpage-panel">
        <div className="card-head"><h3>{language === "zh" ? "Plot review" : "Plot review"}</h3><HelpTip text={language === "zh" ? "快速检查当前导入 trace 的线性和对数 I-V。" : "Quickly inspect the selected trace before fitting."} /></div>
        <TracePlotReview trace={selected} language={language} />
      </section> : null}

      {hasData ? <section className="card spreadsheet-card webpage-panel">
        <div className="card-head"><h3>{t(language, "dataPreview")}</h3><HelpTip text={t(language, "dataPreviewHelp")} /></div>
        <div className="spreadsheet-wrap" role="region" aria-label={t(language, "dataPreview")}>
          <table className="data-spreadsheet all-traces-spreadsheet">
            <thead><tr><th>Trace</th><th>#</th><th>V (V)</th><th>I (A)</th></tr></thead>
            <tbody>{previewRows.map((row) => <tr key={`${row.traceId}-${row.idx}`} className={row.selected ? "selected-trace-row" : ""}><td>{row.traceId}</td><td>{row.idx + 1}</td><td>{formatCell(row.v)}</td><td>{formatCell(row.i)}</td></tr>)}</tbody>
          </table>
        </div>
        <p className="muted">{language === "zh" ? "显示所有已加载 trace；当前选中 trace 已高亮。" : "All loaded traces are shown; the selected trace is highlighted."}</p>
      </section> : null}
    </div>
  </section>;
}
