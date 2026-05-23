import { useEffect, useMemo, useState } from "react";
import type { TraceData } from "../model/types";
import { importCsvTextMulti } from "../api/client";
import { sampleTrace } from "../model/utils";
import type { Language } from "../model/i18n";
import { t } from "../model/i18n";
import { HelpTip } from "./HelpTip";

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

function withDefaultDisplayUnits(trace: TraceData): TraceData {
  return {
    ...trace,
    metadata: {
      ...trace.metadata,
      voltage_unit: String(trace.metadata?.voltage_unit ?? "V"),
      current_unit: String(trace.metadata?.current_unit ?? "A"),
      voltage_unit_factor_to_V: 1,
      current_unit_factor_to_A: 1,
      unit_mode: "display_only_si_internal",
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

export function DataImportWorkspace({ traces, selectedTraceId, onTraces, onSelectTrace, language }: {
  traces: TraceData[];
  selectedTraceId: string | null;
  onTraces: (t: TraceData[]) => void;
  onSelectTrace: (id: string) => void;
  language: Language;
}) {
  const [pasteText, setPasteText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const selected = traces.find((tr) => tr.trace_id === selectedTraceId) ?? traces[0];
  const voltageUnit = String(selected?.metadata?.voltage_unit ?? "V");
  const currentUnit = String(selected?.metadata?.current_unit ?? "A");
  const voltageDisplayFactor = unitFactor(voltageUnits, voltageUnit);
  const currentDisplayFactor = unitFactor(currentUnits, currentUnit);
  const importQuality = qualityForTrace(selected);
  const unitHelp = language === "zh"
    ? "这里是显示单位。内部拟合数据始终保持 V/A，不会因为切换显示单位而被重新缩放。"
    : "Display unit only. Internal fitting arrays remain in V/A and are not rescaled when this selector changes.";

  const previewRows = useMemo(() => {
    if (!selected) return [];
    const n = Math.min(200, selected.voltage_V.length, selected.current_A.length);
    return Array.from({ length: n }, (_, idx) => ({
      idx,
      v: selected.voltage_V[idx] / voltageDisplayFactor,
      i: selected.current_A[idx] / currentDisplayFactor,
    }));
  }, [selected, voltageDisplayFactor, currentDisplayFactor]);

  async function parseTextToTraces(text: string, name: string) {
    const response = await importCsvTextMulti(text, name);
    const imported = response.traces.map((item) => withDefaultDisplayUnits({
      ...item.trace,
      metadata: { ...item.trace.metadata, quality: item.quality },
    }));
    if (!imported.length) throw new Error(language === "zh" ? "未找到可导入的有限 V/I 数据。" : "No finite V/I traces were imported.");
    return imported;
  }

  async function loadFile(file: File) {
    try {
      const text = await file.text();
      const imported = await parseTextToTraces(text, file.name);
      onTraces(imported);
      if (imported[0]) onSelectTrace(imported[0].trace_id);
      setMessage(`${imported.length} ${t(language, "tracesLoaded")}`);
    } catch (e) {
      setMessage(String(e));
    }
  }

  async function loadPaste() {
    try {
      const imported = await parseTextToTraces(pasteText, "pasted-data");
      onTraces(imported);
      if (imported[0]) onSelectTrace(imported[0].trace_id);
      setMessage(`${imported.length} ${t(language, "tracesLoaded")}`);
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
      replaceSelected({
        ...selected,
        metadata: { ...selected.metadata, voltage_unit: nextUnit, voltage_unit_factor_to_V: unitFactor(voltageUnits, nextUnit), unit_mode: "display_only_si_internal" },
      });
      return;
    }
    replaceSelected({
      ...selected,
      metadata: { ...selected.metadata, current_unit: nextUnit, current_unit_factor_to_A: unitFactor(currentUnits, nextUnit), unit_mode: "display_only_si_internal" },
    });
  }

  const fileId = "data-workspace-file-input";
  return <section className="data-workspace scroll-page">
    <div className="page-header-card">
      <div>
        <h2>{t(language, "dataImportTitle")}</h2>
        <p className="muted">{t(language, "dataImportIntro")}</p>
      </div>
      <div className="data-actions compact-data-actions">
        <label className="file-button" htmlFor={fileId} title={`${t(language, "importCsvHelp")} ${t(language, "happyMeasureSupported")}`}>{t(language, "importCsv")}</label>
        <input id={fileId} className="visually-hidden" type="file" accept=".csv,.txt,.dat" onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])} />
        <button title={t(language, "loadDemoHelp")} onClick={() => { const demo = withDefaultDisplayUnits(sampleTrace()); onTraces([demo]); onSelectTrace(demo.trace_id); setMessage(t(language, "demoLoaded")); }}>{t(language, "loadDemo")}</button>
      </div>
    </div>

    {message && <div className={message.toLowerCase().includes("error") || message.includes("Error") ? "warning error" : "warning info"}>{message}</div>}

    <div className="data-import-grid">
      <section className="card paste-card">
        <div className="card-head"><h3>{t(language, "pasteData")}</h3><HelpTip text={t(language, "pasteDataHelp")} /></div>
        <textarea title={t(language, "pasteDataHelp")} value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder={t(language, "pastePlaceholder")} rows={10} />
        <button title={t(language, "parsePastedHelp")} disabled={!pasteText.trim()} onClick={loadPaste}>{t(language, "parsePastedData")}</button>
      </section>

      <section className="card trace-card">
        <div className="card-head"><h3>{t(language, "traceSelection")}</h3><HelpTip text={t(language, "traceSelectionHelp")} /></div>
        {traces.length === 0 ? <p className="warning info">{t(language, "noData")}</p> : <>
          <label className="trace-select-label"><span>{t(language, "selectedTrace")}</span><select title={t(language, "selectedTraceHelp")} value={selected?.trace_id ?? ""} onChange={(e) => onSelectTrace(e.target.value)}>
            {traces.map((tr) => <option key={tr.trace_id} value={tr.trace_id}>{tr.trace_id} · {tr.voltage_V.length} pts</option>)}
          </select></label>
          <div className="trace-facts">
            <span>{t(language, "importedTraces")}: <strong>{traces.length}</strong></span>
            <span>{t(language, "pointCount")}: <strong>{selected?.voltage_V.length ?? 0}</strong></span>
            {Boolean(selected?.metadata?.voltage_col) && <span>V: <code>{String(selected?.metadata?.voltage_col)}</code></span>}
            {Boolean(selected?.metadata?.current_col) && <span>I: <code>{String(selected?.metadata?.current_col)}</code></span>}
            <span>{language === "zh" ? "显示单位" : "Display units"}: <strong>{voltageUnit}</strong>, <strong>{currentUnit}</strong></span>
            <span>{language === "zh" ? "内部拟合" : "Internal fit"}: <strong>V/A</strong></span>
          </div>
          <ImportQualityPanel quality={importQuality} language={language} />
          <div className="parsed-settings">
            <label title={language === "zh" ? "更改当前数据集名称；报告和图例会使用这个名称。" : "Rename the active dataset. Plots and reports use this name."}>
              <span>{language === "zh" ? "数据集名称" : "Dataset name"}</span>
              <DatasetNameInput value={selected?.trace_id ?? ""} language={language} onCommit={renameSelected} />
            </label>
            <label title={unitHelp}>
              <span>{language === "zh" ? "电压显示单位" : "Voltage display unit"}</span>
              <select value={voltageUnit} onChange={(e) => changeUnit("voltage", e.target.value)}>
                {voltageUnits.map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
              </select>
            </label>
            <label title={unitHelp}>
              <span>{language === "zh" ? "电流显示单位" : "Current display unit"}</span>
              <select value={currentUnit} onChange={(e) => changeUnit("current", e.target.value)}>
                {currentUnits.map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
              </select>
            </label>
          </div>
          <p className="muted unit-integrity-note">{unitHelp}</p>
        </>}
      </section>
    </div>

    <section className="card spreadsheet-card">
      <div className="card-head"><h3>{t(language, "dataPreview")}</h3><HelpTip text={t(language, "dataPreviewHelp")} /></div>
      {!selected ? <p className="warning info">{t(language, "noData")}</p> : <div className="spreadsheet-wrap" role="region" aria-label={t(language, "dataPreview")}>
        <table className="data-spreadsheet">
          <thead><tr><th>#</th><th>V ({voltageUnit})</th><th>I ({currentUnit})</th></tr></thead>
          <tbody>{previewRows.map((row) => <tr key={row.idx}><td>{row.idx + 1}</td><td>{formatCell(row.v)}</td><td>{formatCell(row.i)}</td></tr>)}</tbody>
        </table>
      </div>}
      {selected && selected.voltage_V.length > previewRows.length && <p className="muted">{t(language, "previewLimited")}</p>}
    </section>
  </section>;
}
