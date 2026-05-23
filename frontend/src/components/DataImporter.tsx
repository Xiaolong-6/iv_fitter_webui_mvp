import type { TraceData } from "../model/types";
import { parseCsvTraces, sampleTrace } from "../model/utils";
import type { Language } from "../model/i18n";
import { t } from "../model/i18n";

function HelpTip({ text }: { text: string }) { return <span className="help-tip" aria-label={text} data-tooltip={text} tabIndex={0}>?</span>; }

export function DataImporter({ traces, selectedTraceId, onTraces, onSelectTrace, language }: {
  traces: TraceData[];
  selectedTraceId: string | null;
  onTraces: (t: TraceData[]) => void;
  onSelectTrace: (id: string) => void;
  language: Language;
}) {
  async function load(file: File) {
    const text = await file.text();
    const imported = parseCsvTraces(text, file.name);
    onTraces(imported);
    if (imported[0]) onSelectTrace(imported[0].trace_id);
  }
  const selected = traces.find((tr) => tr.trace_id === selectedTraceId) ?? traces[0];
  const fileId = "csv-file-input";
  return <section className="card data-card">
    <h2>{t(language, "data")}</h2>
    <div className="data-actions compact-data-actions">
      <label className="file-button" htmlFor={fileId} title={`${t(language, "importCsvHelp")} ${t(language, "happyMeasureSupported")}`}>{t(language, "importCsv")}</label>
      <input id={fileId} className="visually-hidden" type="file" accept=".csv,.txt,.dat" onChange={(e) => e.target.files?.[0] && load(e.target.files[0])} />
      <button onClick={() => { const demo = sampleTrace(); onTraces([demo]); onSelectTrace(demo.trace_id); }}>{t(language, "loadDemo")}</button>
    </div>
    {traces.length === 0 ? <p className="warning info">{t(language, "noData")}</p> : <>
      <p className="muted"><strong>{t(language, "importedTraces")}:</strong> {traces.length}. {t(language, "selectedOnly")}</p>
      <label className="trace-select-label"><span>{t(language, "selectedTrace")}</span><select value={selected?.trace_id ?? ""} onChange={(e) => onSelectTrace(e.target.value)}>
        {traces.map((tr) => <option key={tr.trace_id} value={tr.trace_id}>{tr.trace_id} · {tr.voltage_V.length} pts</option>)}
      </select></label>
    </>}
    {selected && Boolean(selected.metadata?.voltage_col) && <p className="muted user-detail">{t(language, "selectedColumns")}: V = <code>{String(selected.metadata.voltage_col)}</code>, I = <code>{String(selected.metadata.current_col)}</code></p>}
  </section>;
}
