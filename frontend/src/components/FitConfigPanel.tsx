import { useEffect, useState } from "react";
import type { FitConfig } from "../model/types";
import type { Language } from "../model/i18n";
import { t } from "../model/i18n";

function HelpTip({ text }: { text: string }) { return <span className="help-tip" title={text} aria-label={text}>?</span>; }

function isPartialNumber(text: string) {
  return text === "" || text === "-" || text === "+" || text === "." || text === "-." || text === "+." || /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d*)?$/.test(text);
}
function commitNumber(text: string): number | null | undefined {
  if (text === "") return null;
  if (["-", "+", ".", "-.", "+."].includes(text) || /[eE][-+]?$/.test(text)) return undefined;
  const n = Number(text);
  return Number.isFinite(n) ? n : undefined;
}
function formatDraft(value: number | null | undefined) {
  return value === null || value === undefined ? "" : String(value);
}
function NumericInput({ label, value, placeholder, onCommit }: { label: string; value: number | null | undefined; placeholder?: string; onCommit: (value: number | null) => void }) {
  const [draft, setDraft] = useState(formatDraft(value));
  useEffect(() => { setDraft(formatDraft(value)); }, [value]);
  function commitOrRevert() {
    const parsed = commitNumber(String(draft));
    if (parsed === undefined) {
      setDraft(formatDraft(value));
      return;
    }
    onCommit(parsed);
    setDraft(formatDraft(parsed));
  }
  return <label><span>{label}</span><input inputMode="decimal" placeholder={placeholder} value={draft} onChange={(e) => {
    const text = e.target.value;
    if (!isPartialNumber(text)) return;
    setDraft(text);
  }} onBlur={commitOrRevert} onKeyDown={(e) => {
    if (e.key === "Enter") commitOrRevert();
    if (e.key === "Escape") setDraft(formatDraft(value));
  }} /></label>;
}

export function FitConfigPanel({ config, onChange, language }: { config: FitConfig; onChange: (cfg: FitConfig) => void; language: Language }) {
  return <section className="card config-panel">
    <div className="card-head">
      <h2>{t(language, "fitSetup")}</h2>
      <span className="muted">{t(language, "fitSetupHint")}</span>
    </div>

    <div className="setup-section">
      <h3>{t(language, "voltageRange")} <HelpTip text={t(language, "numericHelp")} /></h3>
      <div className="setup-grid two-col">
        <NumericInput label={t(language, "vMin")} placeholder={t(language, "auto")} value={config.v_min} onCommit={(v) => onChange({ ...config, v_min: v })} />
        <NumericInput label={t(language, "vMax")} placeholder={t(language, "auto")} value={config.v_max} onCommit={(v) => onChange({ ...config, v_max: v })} />
      </div>
    </div>

    <div className="setup-section">
      <h3>{t(language, "objective")}</h3>
      <div className="setup-grid">
        <label><span>{t(language, "weighting")}</span><select value={config.weighting} onChange={(e) => onChange({ ...config, weighting: e.target.value })}><option value="symmetric_log_signed">symmetric log signed</option><option value="linear">linear</option></select></label>
        <label><span>{t(language, "loss")}</span><select value={config.loss} onChange={(e) => onChange({ ...config, loss: e.target.value })}><option value="soft_l1">soft_l1</option><option value="linear">linear</option><option value="huber">huber</option></select></label>
        <NumericInput label={t(language, "residualFloor")} value={(config as any).residual_floor_A ?? 1e-15} onCommit={(v) => onChange({ ...config, residual_floor_A: v ?? 1e-15 })} />
      </div>
    </div>

    <div className="setup-section">
      <h3>{t(language, "runOptions")}</h3>
      <div className="setup-grid">
        <label><span>{t(language, "fitSpeed")}</span><select value={config.fit_speed} onChange={(e) => onChange({ ...config, fit_speed: e.target.value })}><option value="full">full</option><option value="quick">quick</option></select></label>
        <NumericInput label={t(language, "maxEvals")} value={config.max_nfev} onCommit={(v) => onChange({ ...config, max_nfev: Math.max(1, Math.round(v ?? 200)) })} />
      </div>
      <label className="check-row"><input type="checkbox" checked={config.exclude_compliance} onChange={(e) => onChange({ ...config, exclude_compliance: e.target.checked })} /> {t(language, "excludePlateaus")}</label>
      <label className="check-row"><input type="checkbox" checked={(config as any).multistart_enabled ?? false} onChange={(e) => onChange({ ...config, multistart_enabled: e.target.checked })} /> {t(language, "multistart")}</label>
    </div>

    <div className="fit-config-section">
      <h3>{t(language, "solver")}</h3>
      <label>{t(language, "solverMode")}
        <select value={config.solver_mode ?? "legacy_composite"} onChange={(e) => onChange({ ...config, solver_mode: e.target.value as any })}>
          <option value="legacy_composite">{t(language, "legacySolver")}</option>
          <option value="graph_dc">{t(language, "graphSolver")}</option>
        </select>
      </label>
    </div>
  </section>;
}
