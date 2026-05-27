import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { FitConfig } from "../model/types";
import type { Language } from "../model/i18n";
import { t } from "../model/i18n";
import { HelpTip } from "./HelpTip";

export type FitDrawerMode = "none" | "advanced" | "details";

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

function formatRangePlaceholder(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "no trace";
  const abs = Math.abs(value);
  if (abs !== 0 && (abs < 1e-4 || abs >= 1e5)) return value.toExponential(4);
  return Number(value.toPrecision(7)).toString();
}

function NumericInput({ label, value, placeholder, help, disabled = false, onCommit }: { label: string; value: number | null | undefined; placeholder?: string; help?: string; disabled?: boolean; onCommit: (value: number | null) => void }) {
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
  return <label title={help}><span>{label}</span><input title={help} disabled={disabled} inputMode="decimal" placeholder={placeholder} value={draft} onChange={(e) => {
    const text = e.target.value;
    if (!isPartialNumber(text)) return;
    setDraft(text);
  }} onBlur={commitOrRevert} onKeyDown={(e) => {
    if (e.key === "Enter") commitOrRevert();
    if (e.key === "Escape") setDraft(formatDraft(value));
  }} /></label>;
}

function FitVoltageRangeControls({ config, onChange, language, disabled, autoVoltageRange }: { config: FitConfig; onChange: (cfg: FitConfig) => void; language: Language; disabled: boolean; autoVoltageRange?: { vMin: number | null; vMax: number | null } }) {
  const autoMin = formatRangePlaceholder(autoVoltageRange?.vMin);
  const autoMax = formatRangePlaceholder(autoVoltageRange?.vMax);
  return (
    <div className="fit-bottom-voltage">
      <div className="fit-bottom-voltage-title">
        {t(language, "voltageRange")} <HelpTip text={t(language, "numericHelp")} />
      </div>
      <div className="fit-bottom-voltage-grid">
        <NumericInput disabled={disabled} label={t(language, "vMin")} help={t(language, "vMinHelp")} placeholder={autoMin} value={config.v_min} onCommit={(v) => onChange({ ...config, v_min: v })} />
        <NumericInput disabled={disabled} label={t(language, "vMax")} help={t(language, "vMaxHelp")} placeholder={autoMax} value={config.v_max} onCommit={(v) => onChange({ ...config, v_max: v })} />
      </div>
    </div>
  );
}

function AdvancedRunOptions({ config, onChange, language, disabled }: { config: FitConfig; onChange: (cfg: FitConfig) => void; language: Language; disabled: boolean }) {
  return (
    <div className="advanced-objective-body">
      <div className="setup-section">
        <h3>{t(language, "objective")}</h3>
        <div className="setup-grid">
          <label title={t(language, "weightingHelp")}><span>{t(language, "weighting")}</span><select disabled={disabled} title={t(language, "weightingHelp")} value={config.weighting} onChange={(e) => onChange({ ...config, weighting: e.target.value })}><option value="symmetric_log_signed">symmetric log signed</option><option value="linear">linear</option></select></label>
          <label title={t(language, "lossHelp")}><span>{t(language, "loss")}</span><select disabled={disabled} title={t(language, "lossHelp")} value={config.loss} onChange={(e) => onChange({ ...config, loss: e.target.value })}><option value="soft_l1">soft_l1</option><option value="linear">linear</option><option value="huber">huber</option></select></label>
          <NumericInput disabled={disabled} label={t(language, "residualFloor")} help={t(language, "residualFloorHelp")} value={(config as any).residual_floor_A ?? 1e-15} onCommit={(v) => onChange({ ...config, residual_floor_A: v ?? 1e-15 })} />
        </div>
      </div>

      <div className="setup-section">
        <h3>{t(language, "runOptions")}</h3>
        <div className="setup-grid">
          <label title={t(language, "fitSpeedHelp")}><span>{t(language, "fitSpeed")}</span><select disabled={disabled} title={t(language, "fitSpeedHelp")} value={config.fit_speed} onChange={(e) => onChange({ ...config, fit_speed: e.target.value })}><option value="full">full</option><option value="quick">quick</option></select></label>
          <NumericInput disabled={disabled} label={language === "zh" ? "运行超时 (s)" : "Run timeout (s)"} help={language === "zh" ? "超过这个时间会自动停止本次拟合。默认 60 秒。" : "Automatically stop this fit after this many seconds. Default is 60 s."} value={config.run_timeout_s ?? 60} onCommit={(v) => onChange({ ...config, run_timeout_s: Math.max(1, Math.round(v ?? 60)) })} />
          <NumericInput disabled={disabled} label={t(language, "maxEvals")} help={t(language, "maxEvalsHelp")} value={config.max_nfev} onCommit={(v) => onChange({ ...config, max_nfev: Math.max(1, Math.round(v ?? 200)) })} />
        </div>
        <label className="check-row" title={t(language, "excludePlateausHelp")}><input disabled={disabled} title={t(language, "excludePlateausHelp")} type="checkbox" checked={config.exclude_compliance} onChange={(e) => onChange({ ...config, exclude_compliance: e.target.checked })} /> {t(language, "excludePlateaus")}</label>
        <label className="check-row" title={t(language, "multistartHelp")}><input disabled={disabled} title={t(language, "multistartHelp")} type="checkbox" checked={(config as any).multistart_enabled ?? false} onChange={(e) => onChange({ ...config, multistart_enabled: e.target.checked })} /> {t(language, "multistart")}</label>
      </div>

      <div className="fit-config-section">
        <h3>{t(language, "solver")}</h3>
        <label title={t(language, "solverModeHelp")}>{t(language, "solverMode")}
          <select disabled={disabled} title={t(language, "solverModeHelp")} value={config.solver_mode ?? "legacy_composite"} onChange={(e) => onChange({ ...config, solver_mode: e.target.value as any })}>
            <option value="legacy_composite">{t(language, "legacySolver")}</option>
            <option value="graph_dc">{t(language, "graphSolver")}</option>
          </select>
        </label>
      </div>
    </div>
  );
}

export function FitConfigPanel({ config, onChange, language, actionDock, statusDock, messageDock, detailsDock, hasDetails = false, disabled = false, drawerMode, onDrawerModeChange, autoVoltageRange }: { config: FitConfig; onChange: (cfg: FitConfig) => void; language: Language; actionDock?: ReactNode; statusDock?: ReactNode; messageDock?: ReactNode; detailsDock?: ReactNode; hasDetails?: boolean; disabled?: boolean; drawerMode: FitDrawerMode; onDrawerModeChange: (mode: FitDrawerMode) => void; autoVoltageRange?: { vMin: number | null; vMax: number | null } }) {
  const advancedOpen = drawerMode === "advanced";
  const detailsOpen = drawerMode === "details";
  return <section className="fit-bottom-dock" aria-label={t(language, "fitSetup")}>
    {drawerMode !== "none" ? (
      <div id="fit-bottom-dock-drawer" className="fit-bottom-dock-drawer" data-drawer-mode={drawerMode}>
        <div className="fit-bottom-dock-drawer-head">
          <h2>
            {advancedOpen
              ? language === "zh" ? "高级目标函数和运行选项" : "Advanced objective and run options"
              : "Details / diagnostics"}
          </h2>
        </div>
        {advancedOpen ? (
          <AdvancedRunOptions config={config} onChange={onChange} language={language} disabled={disabled} />
        ) : (
          <div className="fit-details-drawer-body fit-bottom-details-body">
            {detailsDock}
          </div>
        )}
      </div>
    ) : null}

    <div className="fit-bottom-dock-row">
      <div className="fit-bottom-dock-title">
        <h2>{t(language, "fitSetup")}</h2>
      </div>
      {actionDock ? <div className="fit-bottom-dock-actions">{actionDock}</div> : null}
      <FitVoltageRangeControls
        config={config}
        onChange={onChange}
        language={language}
        disabled={disabled}
        autoVoltageRange={autoVoltageRange}
      />
      <button
        type="button"
        className={advancedOpen ? "fit-bottom-dock-toggle active" : "fit-bottom-dock-toggle"}
        aria-expanded={advancedOpen}
        aria-controls="fit-bottom-dock-drawer"
        onClick={() => onDrawerModeChange(advancedOpen ? "none" : "advanced")}
      >
        <span className="button-icon" aria-hidden="true">⚙</span>
        <span>{language === "zh" ? "高级" : "Advanced"}</span>
        <span className="drawer-caret" aria-hidden="true">{advancedOpen ? "v" : "^"}</span>
      </button>
      <div className="fit-bottom-status" aria-live="polite">
        {statusDock}
        {messageDock ? <div className="fit-bottom-message-stack">{messageDock}</div> : null}
      </div>
      <button
        type="button"
        className={detailsOpen ? "fit-bottom-dock-toggle active" : "fit-bottom-dock-toggle"}
        aria-expanded={detailsOpen}
        aria-controls="fit-bottom-dock-drawer"
        disabled={!hasDetails}
        onClick={() => onDrawerModeChange(detailsOpen ? "none" : "details")}
      >
        <span className="button-icon" aria-hidden="true">i</span>
        <span>{language === "zh" ? "详情" : "Details"}</span>
        <span className="drawer-caret" aria-hidden="true">{detailsOpen ? "v" : "^"}</span>
      </button>
    </div>
  </section>;
}
