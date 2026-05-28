import { useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent as ReactDragEvent } from "react";
import type { ModelSpec, SyntheticNoiseConfig, TraceData } from "../model/types";
import { generateSyntheticTrace, importCsvTextMulti, openImportFileDialog, type ImportCsvTextMultiResponse } from "../api/client";
import type { Language } from "../model/i18n";
import { t } from "../model/i18n";
import { HelpTip } from "./HelpTip";
import {
  appendSyntheticTrace,
  buildSyntheticTracePayload,
  defaultSyntheticTraceForm,
  syntheticTraceCsv,
  validateSyntheticTraceForm,
  type SyntheticTraceFormState,
} from "../model/syntheticTrace";
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

function qualityForTrace(trace?: TraceData): ImportQuality | null {
  const quality = trace?.metadata?.quality;
  return quality && typeof quality === "object" ? quality as ImportQuality : null;
}

function withDefaultImportedUnits(trace: TraceData): TraceData {
  return {
    ...trace,
    metadata: {
      ...trace.metadata,
      voltage_unit: String(trace.metadata?.voltage_unit ?? "V"),
      current_unit: String(trace.metadata?.current_unit ?? "A"),
      voltage_unit_factor_to_V: Number(trace.metadata?.voltage_unit_factor_to_V ?? 1),
      current_unit_factor_to_A: Number(trace.metadata?.current_unit_factor_to_A ?? 1),
      unit_mode: "import_unit_to_si_internal",
    },
  };
}

function DatasetNameInput({ value, language, onCommit }: { value: string; language: Language; onCommit: (value: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value]);
  function commit() {
    onCommit(draft);
  }
  return <input
    value={draft}
    onChange={(e) => setDraft(e.target.value)}
    onBlur={commit}
    onKeyDown={(e) => {
      if (e.key === "Enter") commit();
      if (e.key === "Escape") setDraft(value);
    }}
    aria-label={language === "zh" ? "数据集名称" : "Dataset name"}
  />;
}

function ImportQualityPanel({ quality, language }: { quality: ImportQuality | null; language: Language }) {
  if (!quality) return null;
  const warnings = quality.warnings ?? [];
  return <div className="import-quality-panel">
    <div className="import-quality-title">{language === "zh" ? "导入质量" : "Import quality"}</div>
    <div className="import-quality-grid">
      <span>{language === "zh" ? "行" : "Rows"}: <strong>{quality.rows_imported ?? "?"}</strong> / {quality.rows_in_file ?? "?"}</span>
      <span>V: <code>{quality.voltage_col ?? "?"}</code></span>
      <span>I: <code>{quality.current_col ?? "?"}</code></span>
      {Number.isFinite(quality.rows_dropped) && Number(quality.rows_dropped) > 0 ? <span>{language === "zh" ? "丢弃" : "Dropped"}: <strong>{quality.rows_dropped}</strong></span> : null}
    </div>
    {warnings.length ? <div className="import-quality-warnings">
      {warnings.map((warning) => <div className="warning" key={warning}>{warning}</div>)}
    </div> : null}
  </div>;
}

function logAbsForReview(values: number[]) {
  return values.map((value) => Math.log10(Math.max(Math.abs(value), 1e-30)));
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

export function DataImportWorkspace({ traces, selectedTraceId, onTraces, onSelectTrace, onNextToFitting, model, language }: {
  traces: TraceData[];
  selectedTraceId: string | null;
  onTraces: (t: TraceData[]) => void;
  onSelectTrace: (id: string) => void;
  onNextToFitting?: () => void;
  model: ModelSpec;
  language: Language;
}) {
  const [pasteText, setPasteText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<"upload" | "paste" | "sample">("upload");
  const [dragActive, setDragActive] = useState(false);
  const [syntheticOpen, setSyntheticOpen] = useState(false);
  const [syntheticBusy, setSyntheticBusy] = useState(false);
  const [syntheticError, setSyntheticError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [syntheticForm, setSyntheticForm] = useState<SyntheticTraceFormState>(defaultSyntheticTraceForm);
  const [showImportOptions, setShowImportOptions] = useState(false);
  const selected = traces.find((tr) => tr.trace_id === selectedTraceId) ?? traces[0];
  const voltageUnit = String(selected?.metadata?.voltage_unit ?? "V");
  const currentUnit = String(selected?.metadata?.current_unit ?? "A");
  const importQuality = qualityForTrace(selected);
  const unitHelp = language === "zh"
    ? "选择原始导入列的实际单位。数据会立即换算成 V/A 用于预览、绘图和拟合。"
    : "Select the actual unit of the imported column. Data is immediately converted to V/A for preview, plots, and fitting.";

  const previewRows = useMemo(() => {
    if (!selected) return [];
    const n = Math.min(200, selected.voltage_V.length, selected.current_A.length);
    return Array.from({ length: n }, (_, idx) => ({
      idx,
      v: selected.voltage_V[idx],
      i: selected.current_A[idx],
    }));
  }, [selected]);

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
      setMessage(`${t(language, "demoLoaded")} (${nextTraces.length} traces)`);
    } catch (err) {
      setMessage(`Sample data could not be loaded: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  function updateSyntheticForm(patch: Partial<SyntheticTraceFormState>) {
    setSyntheticForm((current) => ({ ...current, ...patch }));
    setSyntheticError(null);
  }

  async function generateAndImportSynthetic() {
    const validation = validateSyntheticTraceForm(syntheticForm);
    if (!validation.ok) {
      setSyntheticError(validation.error);
      return;
    }
    setSyntheticBusy(true);
    setSyntheticError(null);
    try {
      const response = await generateSyntheticTrace(buildSyntheticTracePayload(syntheticForm, model, safeTraceName(syntheticForm.traceName, "synthetic_trace")));
      const appended = appendSyntheticTrace(traces, response);
      onTraces(appended.traces);
      onSelectTrace(appended.selectedTraceId);
      setSyntheticOpen(false);
      setMessage(language === "zh"
        ? "Synthetic trace generated from the current Model Builder model and imported as test data. Ground-truth parameters are stored in trace metadata."
        : "Synthetic trace generated from the current Model Builder model and imported as test data. Ground-truth parameters are stored in trace metadata.");
    } catch (err) {
      setSyntheticError(err instanceof Error ? err.message : String(err));
    } finally {
      setSyntheticBusy(false);
    }
  }

  async function generateSyntheticCsvOnly() {
    const validation = validateSyntheticTraceForm(syntheticForm);
    if (!validation.ok) {
      setSyntheticError(validation.error);
      return;
    }
    setSyntheticBusy(true);
    setSyntheticError(null);
    try {
      const response = await generateSyntheticTrace(buildSyntheticTracePayload(syntheticForm, model, safeTraceName(syntheticForm.traceName, "synthetic_trace")));
      const csv = syntheticTraceCsv(response, "Voltage_V,Current_A");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${response.trace_name.replace(/[^a-z0-9_-]+/gi, "_")}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage(language === "zh" ? "Synthetic CSV generated." : "Synthetic CSV generated.");
    } catch (err) {
      setSyntheticError(err instanceof Error ? err.message : String(err));
    } finally {
      setSyntheticBusy(false);
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
  const qualityWarnings = importQuality?.warnings ?? [];
  const syntheticValidation = validateSyntheticTraceForm(syntheticForm);
  const hasData = traces.length > 0;
  return <section className="data-workspace scroll-page">
    {message && <div className={message.toLowerCase().includes("error") || message.includes("Error") ? "warning error" : "warning info"}>{message}</div>}

    <div className={hasData ? "data-import-layout has-data" : "data-import-layout no-data"}>
      <section className="card import-actions-card data-source-card">
        <div className="card-head"><h3>{language === "zh" ? "导入数据" : "Import data"}</h3><HelpTip text={t(language, "importCsvHelp")} /></div>

        {!hasData ? <>
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
        </> : <div className="import-compact-summary">
          <div className="compact-import-row">
            <span className="muted">{language === "zh" ? "已导入" : "Loaded"}</span>
            <strong>{traces.length} {traces.length === 1 ? "trace" : "traces"}</strong>
            <button type="button" className="compact-change-btn" onClick={() => { setShowImportOptions((v) => !v); setInputMode("upload"); }}>{showImportOptions ? (language === "zh" ? "收起" : "Hide") : (language === "zh" ? "更换数据" : "Change data")}</button>
          </div>
          {showImportOptions ? <>
            <div className="data-source-tabs" role="tablist" aria-label={language === "zh" ? "数据来源" : "Data source"}>
              <button type="button" className={inputMode === "upload" ? "active" : ""} onClick={() => setInputMode("upload")}>{language === "zh" ? "上传 CSV/TXT" : "Upload CSV/TXT"}</button>
              <button type="button" className={inputMode === "paste" ? "active" : ""} onClick={() => setInputMode("paste")}>{t(language, "pasteData")}</button>
              <button type="button" className={inputMode === "sample" ? "active" : ""} onClick={() => setInputMode("sample")}>{language === "zh" ? "示例数据" : "Sample data"}</button>
            </div>
            {inputMode === "upload" ? <div
              className={`drop-import-zone compact-drop${dragActive ? " drag-active" : ""}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <button type="button" className="file-button import-primary-action" onClick={openImportPicker}>{language === "zh" ? "导入其他文件" : "Import another file"}</button>
              <input ref={fileInputRef} id={fileId} className="visually-hidden" type="file" accept=".csv,.txt,.dat" onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])} />
              <span>{language === "zh" ? "拖拽 CSV/TXT/DAT 文件到这里" : "Drop CSV/TXT/DAT here"}</span>
            </div> : null}
            {inputMode === "paste" ? <div className="inline-paste-panel compact-paste">
              <textarea title={t(language, "pasteDataHelp")} value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder={t(language, "pastePlaceholder")} rows={4} />
              <button title={t(language, "parsePastedHelp")} disabled={!pasteText.trim()} onClick={loadPaste}>{t(language, "parsePastedData")}</button>
            </div> : null}
            {inputMode === "sample" ? <div className="sample-import-panel">
              <p className="muted">{language === "zh" ? "加载内置示例数据用于练习导入、选择 trace 和拟合流程。" : "Load the bundled sample dataset for practicing trace selection and fitting workflow."}</p>
              <button className="import-debug-action" title={t(language, "loadDemoHelp")} onClick={loadSampleData}>{language === "zh" ? "加载示例数据" : "Load sample data"}</button>
            </div> : null}
          </> : null}
        </div>}

        <div className="trace-selection-subsection">
          <div className="subsection-head"><h4>{t(language, "traceSelection")}</h4><HelpTip text={t(language, "traceSelectionHelp")} /></div>
          {!hasData ? <div className="empty-data-invite">
            <strong>{language === "zh" ? "尚未加载数据" : "No data loaded yet"}</strong>
            <span>{language === "zh" ? "请上传、粘贴或加载示例 I-V 数据。" : "Upload, paste, or load sample I-V data to begin."}</span>
          </div> : <>
            <label className="trace-select-label structured-trace-select"><span>{language === "zh" ? `当前曲线（共 ${traces.length} 条）` : `Current trace (${traces.length} total)`}</span><select title={t(language, "selectedTraceHelp")} value={selected?.trace_id ?? ""} onChange={(e) => onSelectTrace(e.target.value)}>
              {traces.map((tr) => <option key={tr.trace_id} value={tr.trace_id}>{tr.trace_id}</option>)}
            </select></label>
            <div className="trace-property-grid">
              <span>{language === "zh" ? "数据点数" : "Points"}</span><strong>{selected?.voltage_V.length ?? 0}</strong>
              <span>{language === "zh" ? "单位映射" : "Unit mapping"}</span><strong>{voltageUnit}/{currentUnit} → V/A</strong>
              {qualityWarnings.length ? <><span>{language === "zh" ? "质量提示" : "Quality notes"}</span><strong>{qualityWarnings.length}</strong></> : null}
            </div>
            {qualityWarnings.length ? <div className="import-quality-warnings compact-quality-warnings">
              {qualityWarnings.map((warning) => <div className="warning" key={warning}>{warning}</div>)}
            </div> : null}
            <div className="parsed-settings compact-parsed-settings structured-units">
              <label>
                <span>{language === "zh" ? "数据集名称" : "Dataset name"}</span>
                <DatasetNameInput value={selected?.trace_id ?? ""} language={language} onCommit={renameSelected} />
              </label>
              <label>
                <span>{language === "zh" ? "电压单位" : "V unit"}</span>
                <select value={voltageUnit} onChange={(e) => changeUnit("voltage", e.target.value)}>
                  {voltageUnits.map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
                </select>
              </label>
              <label>
                <span>{language === "zh" ? "电流单位" : "I unit"}</span>
                <select value={currentUnit} onChange={(e) => changeUnit("current", e.target.value)}>
                  {currentUnits.map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
                </select>
              </label>
            </div>
            {onNextToFitting ? <button type="button" className="primary data-next-action" onClick={onNextToFitting}>{language === "zh" ? "前往模型构建" : "Go to Model Builder"}</button> : null}
          </>}
        </div>

      </section>

      <section className="card plot-review-card">
        <div className="card-head"><h3>{language === "zh" ? "Plot review" : "Plot review"}</h3><HelpTip text={language === "zh" ? "快速检查当前导入 trace 的线性和对数 I-V。" : "Quickly inspect the selected trace before fitting."} /></div>
        <TracePlotReview trace={selected} language={language} />
      </section>

      <section className="card spreadsheet-card">
        <div className="card-head"><h3>{t(language, "dataPreview")}</h3><HelpTip text={t(language, "dataPreviewHelp")} /></div>
        {!selected ? <div className="empty-table-placeholder">{language === "zh" ? "导入数据后会在这里显示表格预览。" : "A table preview will appear here after data import."}</div> : <div className="spreadsheet-wrap" role="region" aria-label={t(language, "dataPreview")}>
          <table className="data-spreadsheet">
            <thead><tr><th>#</th><th>V (V)</th><th>I (A)</th></tr></thead>
            <tbody>{previewRows.map((row) => <tr key={row.idx}><td>{row.idx + 1}</td><td>{formatCell(row.v)}</td><td>{formatCell(row.i)}</td></tr>)}</tbody>
          </table>
        </div>}
        {selected && selected.voltage_V.length > previewRows.length && <p className="muted">{t(language, "previewLimited")}</p>}
      </section>
    </div>

    {syntheticOpen ? <div className="drawer synthetic-drawer" role="dialog" aria-modal="true" aria-labelledby="synthetic-trace-title">
      <div className="drawer-head">
        <div>
          <h2 id="synthetic-trace-title">Synthetic IV Trace</h2>
          <p className="muted">Synthetic traces are forward-simulated from the selected model and known parameters. They are useful for testing fitting stability and parameter recovery. Successful recovery on synthetic data does not prove that the same model is physically correct for a real device.</p>
        </div>
        <button onClick={() => setSyntheticOpen(false)} disabled={syntheticBusy}>Cancel</button>
      </div>

      {syntheticError ? <div className="warning error">{syntheticError}</div> : null}
      {!syntheticError && !syntheticValidation.ok ? <div className="warning error">{syntheticValidation.error}</div> : null}

      <div className="synthetic-form">
        <label><span>Model source</span><select value="current" disabled><option>Use current Model Builder model</option></select></label>
        <label><span>Trace name</span><input value={syntheticForm.traceName} onChange={(e) => updateSyntheticForm({ traceName: e.target.value })} /></label>
        <div className="synthetic-field-grid">
          <label><span>V start</span><input type="number" step="any" value={syntheticForm.voltageStart} onChange={(e) => updateSyntheticForm({ voltageStart: e.target.value })} /></label>
          <label><span>V stop</span><input type="number" step="any" value={syntheticForm.voltageStop} onChange={(e) => updateSyntheticForm({ voltageStop: e.target.value })} /></label>
          <label><span>V step</span><input type="number" step="any" value={syntheticForm.voltageStep} onChange={(e) => updateSyntheticForm({ voltageStep: e.target.value })} /></label>
        </div>
        <p className="muted">Point count: {syntheticValidation.pointCount || "-"}</p>
        <label><span>Noise</span><select value={syntheticForm.noiseMode} onChange={(e) => updateSyntheticForm({ noiseMode: e.target.value as SyntheticNoiseConfig["mode"] })}>
          <option value="none">None</option>
          <option value="gaussian_absolute">Gaussian absolute current noise</option>
          <option value="gaussian_relative">Gaussian relative current noise</option>
        </select></label>
        {syntheticForm.noiseMode === "gaussian_absolute" ? <label><span>noise_level_A</span><input type="number" step="any" value={syntheticForm.noiseLevelA} onChange={(e) => updateSyntheticForm({ noiseLevelA: e.target.value })} /></label> : null}
        {syntheticForm.noiseMode === "gaussian_relative" ? <label><span>relative_noise_fraction</span><input type="number" step="any" value={syntheticForm.relativeNoiseFraction} onChange={(e) => updateSyntheticForm({ relativeNoiseFraction: e.target.value })} /></label> : null}
        <label><span>Random seed</span><input type="number" step="1" value={syntheticForm.seed} onChange={(e) => updateSyntheticForm({ seed: e.target.value })} /></label>
        <label className="inline-check"><input type="checkbox" checked={syntheticForm.complianceEnabled} onChange={(e) => updateSyntheticForm({ complianceEnabled: e.target.checked })} /> <span>Current compliance</span></label>
        {syntheticForm.complianceEnabled ? <label><span>compliance_current_A</span><input type="number" step="any" value={syntheticForm.complianceCurrentA} onChange={(e) => updateSyntheticForm({ complianceCurrentA: e.target.value })} /></label> : null}
      </div>
      <div className="synthetic-actions">
        <button className="primary" disabled={syntheticBusy || !syntheticValidation.ok} onClick={generateAndImportSynthetic}>{syntheticBusy ? "Generating..." : "Generate and import"}</button>
        <button disabled={syntheticBusy || !syntheticValidation.ok} onClick={generateSyntheticCsvOnly}>Generate CSV only</button>
        <button disabled={syntheticBusy} onClick={() => setSyntheticOpen(false)}>Cancel</button>
      </div>
    </div> : null}
  </section>;
}
