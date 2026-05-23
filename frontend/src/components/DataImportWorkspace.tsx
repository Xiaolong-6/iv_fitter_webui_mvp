import { useEffect, useMemo, useState } from "react";
import type { TraceData } from "../model/types";
import { parseCsvTraces, sampleTrace } from "../model/utils";
import type { Language } from "../model/i18n";
import { t } from "../model/i18n";

function HelpTip({ text }: { text: string }) {
  return <span className="help-tip" aria-label={text} data-tooltip={text} tabIndex={0}>?</span>;
}

function formatCell(value: number) {
  if (!Number.isFinite(value)) return "";
  const abs = Math.abs(value);
  if ((abs > 0 && abs < 1e-3) || abs >= 1e4) return value.toExponential(4);
  return String(Number(value.toPrecision(6)));
}

function parseTextToTraces(text: string, name: string) {
  return parseCsvTraces(text, name);
}

const voltageUnits = [
  { value: "V", label: "V", factor: 1 },
  { value: "mV", label: "mV", factor: 1e-3 },
  { value: "uV", label: "uV", factor: 1e-6 },
  { value: "kV", label: "kV", factor: 1e3 },
];

const currentUnits = [
  { value: "A", label: "A", factor: 1 },
  { value: "mA", label: "mA", factor: 1e-3 },
  { value: "uA", label: "uA", factor: 1e-6 },
  { value: "nA", label: "nA", factor: 1e-9 },
  { value: "pA", label: "pA", factor: 1e-12 },
];

function unitFactor(units: typeof voltageUnits, value: string) {
  return units.find((u) => u.value === value)?.factor ?? 1;
}

function safeTraceName(name: string, fallback: string) {
  return name.trim().replace(/\s+/g, " ") || fallback;
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
  const previewRows = useMemo(() => {
    if (!selected) return [];
    const n = Math.min(200, selected.voltage_V.length, selected.current_A.length);
    return Array.from({ length: n }, (_, idx) => ({
      idx,
      v: selected.voltage_V[idx] / voltageDisplayFactor,
      i: selected.current_A[idx] / currentDisplayFactor,
    }));
  }, [selected, voltageDisplayFactor, currentDisplayFactor]);

  async function loadFile(file: File) {
    try {
      const text = await file.text();
      const imported = parseTextToTraces(text, file.name);
      onTraces(imported);
      if (imported[0]) onSelectTrace(imported[0].trace_id);
      setMessage(`${imported.length} ${t(language, "tracesLoaded")}`);
    } catch (e) {
      setMessage(String(e));
    }
  }

  function loadPaste() {
    try {
      const imported = parseTextToTraces(pasteText, "pasted-data");
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
      const oldUnit = String(selected.metadata?.voltage_unit ?? "V");
      const oldFactor = unitFactor(voltageUnits, oldUnit);
      const nextFactor = unitFactor(voltageUnits, nextUnit);
      replaceSelected({
        ...selected,
        voltage_V: selected.voltage_V.map((v) => (v / oldFactor) * nextFactor),
        metadata: { ...selected.metadata, voltage_unit: nextUnit, voltage_unit_factor_to_V: nextFactor },
      });
      return;
    }
    const oldUnit = String(selected.metadata?.current_unit ?? "A");
    const oldFactor = unitFactor(currentUnits, oldUnit);
    const nextFactor = unitFactor(currentUnits, nextUnit);
    replaceSelected({
      ...selected,
      current_A: selected.current_A.map((i) => (i / oldFactor) * nextFactor),
      metadata: { ...selected.metadata, current_unit: nextUnit, current_unit_factor_to_A: nextFactor },
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
        <button title={t(language, "loadDemoHelp")} onClick={() => { const demo = sampleTrace(); onTraces([demo]); onSelectTrace(demo.trace_id); setMessage(t(language, "demoLoaded")); }}>{t(language, "loadDemo")}</button>
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
            <span>{language === "zh" ? "单位" : "Units"}: <strong>{voltageUnit}</strong>, <strong>{currentUnit}</strong></span>
          </div>
          <div className="parsed-settings">
            <label title={language === "zh" ? "更改当前数据集名称；报告和图例会使用这个名称。" : "Rename the active dataset. Plots and reports use this name."}>
              <span>{language === "zh" ? "数据集名称" : "Dataset name"}</span>
              <DatasetNameInput value={selected?.trace_id ?? ""} language={language} onCommit={renameSelected} />
            </label>
            <label title={language === "zh" ? "选择粘贴/导入数据中电压列的原始单位。内部会换算成 V 进行拟合。" : "Choose the source unit for the voltage column. Values are converted to V internally for fitting."}>
              <span>{language === "zh" ? "电压单位" : "Voltage unit"}</span>
              <select value={voltageUnit} onChange={(e) => changeUnit("voltage", e.target.value)}>
                {voltageUnits.map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
              </select>
            </label>
            <label title={language === "zh" ? "选择粘贴/导入数据中电流列的原始单位。内部会换算成 A 进行拟合。" : "Choose the source unit for the current column. Values are converted to A internally for fitting."}>
              <span>{language === "zh" ? "电流单位" : "Current unit"}</span>
              <select value={currentUnit} onChange={(e) => changeUnit("current", e.target.value)}>
                {currentUnits.map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
              </select>
            </label>
          </div>
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
