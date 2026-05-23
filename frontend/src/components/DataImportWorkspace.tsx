import { useMemo, useState } from "react";
import type { TraceData } from "../model/types";
import { parseCsvTraces, sampleTrace } from "../model/utils";
import type { Language } from "../model/i18n";
import { t } from "../model/i18n";

function HelpTip({ text }: { text: string }) {
  return <span className="help-tip" title={text} aria-label={text}>?</span>;
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
  const previewRows = useMemo(() => {
    if (!selected) return [];
    const n = Math.min(200, selected.voltage_V.length, selected.current_A.length);
    return Array.from({ length: n }, (_, idx) => ({ idx, v: selected.voltage_V[idx], i: selected.current_A[idx] }));
  }, [selected]);

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

  const fileId = "data-workspace-file-input";
  return <section className="data-workspace scroll-page">
    <div className="page-header-card">
      <div>
        <h2>{t(language, "dataImportTitle")}</h2>
        <p className="muted">{t(language, "dataImportIntro")}</p>
      </div>
      <div className="data-actions compact-data-actions">
        <label className="file-button" htmlFor={fileId} title={t(language, "importCsvHelp")}>{t(language, "importCsv")} <HelpTip text={t(language, "happyMeasureSupported")} /></label>
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
          </div>
        </>}
      </section>
    </div>

    <section className="card spreadsheet-card">
      <div className="card-head"><h3>{t(language, "dataPreview")}</h3><HelpTip text={t(language, "dataPreviewHelp")} /></div>
      {!selected ? <p className="warning info">{t(language, "noData")}</p> : <div className="spreadsheet-wrap" role="region" aria-label={t(language, "dataPreview")}>
        <table className="data-spreadsheet">
          <thead><tr><th>#</th><th>V (V)</th><th>I (A)</th></tr></thead>
          <tbody>{previewRows.map((row) => <tr key={row.idx}><td>{row.idx + 1}</td><td>{formatCell(row.v)}</td><td>{formatCell(row.i)}</td></tr>)}</tbody>
        </table>
      </div>}
      {selected && selected.voltage_V.length > previewRows.length && <p className="muted">{t(language, "previewLimited")}</p>}
    </section>
  </section>;
}
