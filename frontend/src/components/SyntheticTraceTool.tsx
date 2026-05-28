import { useState } from "react";
import type { ModelSpec, SyntheticNoiseConfig, TraceData } from "../model/types";
import { generateSyntheticTrace } from "../api/client";
import type { Language } from "../model/i18n";
import {
  appendSyntheticTrace,
  buildSyntheticTracePayload,
  defaultSyntheticTraceForm,
  syntheticTraceCsv,
  validateSyntheticTraceForm,
  type SyntheticTraceFormState,
} from "../model/syntheticTrace";

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
}

export function SyntheticTraceTool({ traces, onTraces, onSelectTrace, model, language, disabled = false }: {
  traces: TraceData[];
  onTraces: (traces: TraceData[]) => void;
  onSelectTrace: (id: string) => void;
  model: ModelSpec;
  language: Language;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState<SyntheticTraceFormState>(defaultSyntheticTraceForm);

  function updateForm(patch: Partial<SyntheticTraceFormState>) {
    setForm((current) => ({ ...current, ...patch }));
    setError(null);
    setMessage(null);
  }

  async function generateAndImport() {
    const validation = validateSyntheticTraceForm(form);
    if (!validation.ok) {
      setError(validation.error);
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await generateSyntheticTrace(buildSyntheticTracePayload(form, model, form.traceName.trim() || "synthetic_trace"));
      const appended = appendSyntheticTrace(traces, response);
      onTraces(appended.traces);
      onSelectTrace(appended.selectedTraceId);
      setOpen(false);
      setMessage(language === "zh" ? "Synthetic trace 已生成并导入。" : "Synthetic trace generated and imported.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function generateCsvOnly() {
    const validation = validateSyntheticTraceForm(form);
    if (!validation.ok) {
      setError(validation.error);
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await generateSyntheticTrace(buildSyntheticTracePayload(form, model, form.traceName.trim() || "synthetic_trace"));
      downloadText(`${response.trace_name || "synthetic_trace"}.csv`, syntheticTraceCsv(response), "text/csv;charset=utf-8");
      setMessage(language === "zh" ? "Synthetic CSV 已生成。" : "Synthetic CSV generated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const validation = validateSyntheticTraceForm(form);
  return <>
    <button
      type="button"
      className="debug-algorithm-button"
      disabled={disabled}
      title={language === "zh" ? "从当前 Model Builder 模型正向生成 synthetic IV trace，用于调试算法和参数反演。" : "Forward-simulate a synthetic IV trace from the current Model Builder model for algorithm/debug validation."}
      onClick={() => setOpen(true)}
    >
      {language === "zh" ? "Debug algorithm" : "Debug algorithm"}
    </button>
    {message ? <span className="synthetic-inline-message">{message}</span> : null}
    {open ? <div className="drawer synthetic-drawer" role="dialog" aria-modal="true" aria-labelledby="synthetic-trace-title">
      <div className="drawer-head">
        <div>
          <h2 id="synthetic-trace-title">Synthetic IV trace</h2>
          <p className="muted">{language === "zh" ? "根据当前 Model Builder 模型和已知参数正向仿真，用于检查拟合稳定性和参数恢复；不能证明真实器件物理模型正确。" : "Forward-simulate from the current Model Builder model and known parameters. Use it to test fitting stability and parameter recovery; it does not prove that the model is physically correct for a real device."}</p>
        </div>
        <button onClick={() => setOpen(false)} disabled={busy}>{language === "zh" ? "取消" : "Cancel"}</button>
      </div>

      {error ? <div className="warning error">{error}</div> : null}
      {!error && !validation.ok ? <div className="warning error">{validation.error}</div> : null}

      <div className="synthetic-form">
        <label><span>Model source</span><select value="current" disabled><option>Use current Model Builder model</option></select></label>
        <label><span>Trace name</span><input value={form.traceName} onChange={(e) => updateForm({ traceName: e.target.value })} /></label>
        <div className="synthetic-field-grid">
          <label><span>V start</span><input type="number" step="any" value={form.voltageStart} onChange={(e) => updateForm({ voltageStart: e.target.value })} /></label>
          <label><span>V stop</span><input type="number" step="any" value={form.voltageStop} onChange={(e) => updateForm({ voltageStop: e.target.value })} /></label>
          <label><span>V step</span><input type="number" step="any" value={form.voltageStep} onChange={(e) => updateForm({ voltageStep: e.target.value })} /></label>
        </div>
        <p className="muted">Point count: {validation.pointCount || "-"}</p>
        <label><span>Noise</span><select value={form.noiseMode} onChange={(e) => updateForm({ noiseMode: e.target.value as SyntheticNoiseConfig["mode"] })}>
          <option value="none">None</option>
          <option value="gaussian_absolute">Gaussian absolute current noise</option>
          <option value="gaussian_relative">Gaussian relative current noise</option>
        </select></label>
        {form.noiseMode === "gaussian_absolute" ? <label><span>noise_level_A</span><input type="number" step="any" value={form.noiseLevelA} onChange={(e) => updateForm({ noiseLevelA: e.target.value })} /></label> : null}
        {form.noiseMode === "gaussian_relative" ? <label><span>relative_noise_fraction</span><input type="number" step="any" value={form.relativeNoiseFraction} onChange={(e) => updateForm({ relativeNoiseFraction: e.target.value })} /></label> : null}
        <label><span>Random seed</span><input type="number" step="1" value={form.seed} onChange={(e) => updateForm({ seed: e.target.value })} /></label>
        <label className="inline-check"><input type="checkbox" checked={form.complianceEnabled} onChange={(e) => updateForm({ complianceEnabled: e.target.checked })} /> <span>Current compliance</span></label>
        {form.complianceEnabled ? <label><span>compliance_current_A</span><input type="number" step="any" value={form.complianceCurrentA} onChange={(e) => updateForm({ complianceCurrentA: e.target.value })} /></label> : null}
      </div>
      <div className="synthetic-actions">
        <button className="primary" disabled={busy || !validation.ok} onClick={generateAndImport}>{busy ? "Generating..." : "Generate and import"}</button>
        <button disabled={busy || !validation.ok} onClick={generateCsvOnly}>Generate CSV only</button>
        <button disabled={busy} onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div> : null}
  </>;
}
