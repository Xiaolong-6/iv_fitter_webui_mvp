import { Fragment, useState } from "react";
import type { FitResult, ModelSpec, ParameterSpec } from "../model/types";
import { fmtBounds } from "../model/format";
import type { Language } from "../model/i18n";
import { t } from "../model/i18n";
import { parameterMeaning, parameterShortAssessment } from "../model/diagnostics";
import { updateComponent } from "../model/utils";

function formatParameterNumber(v: number | undefined | null) {
  if (v === undefined || v === null) return "";
  if (!Number.isFinite(v)) return String(v);
  const abs = Math.abs(v);
  if (v === 0) return "0";
  if (abs < 1e-3 || abs >= 1e4) return v.toExponential(3);
  return Number(v.toPrecision(6)).toString();
}

function num(v: number | undefined | null) {
  return formatParameterNumber(v);
}

function isPartialNumber(text: string) {
  return text === "" || text === "-" || text === "+" || text === "." || text === "-." || text === "+." || /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d*)?$/.test(text);
}

function commitNumber(text: string): number | null | undefined {
  if (text === "") return null;
  if (["-", "+", ".", "-.", "+."].includes(text) || /[eE][-+]?$/.test(text)) return undefined;
  const n = Number(text);
  return Number.isFinite(n) ? n : undefined;
}

function DraftNumberInput({ value, placeholder, title, onCommit }: { value: number | null | undefined; placeholder?: string; title?: string; onCommit: (value: number | null) => void }) {
  const [draft, setDraft] = useState(num(value));
  function commitOrRevert() {
    const parsed = commitNumber(draft);
    if (parsed === undefined) {
      setDraft(num(value));
      return;
    }
    onCommit(parsed);
    setDraft(num(parsed));
  }
  return <input
    className="parameter-edit-input"
    title={title}
    value={draft}
    placeholder={placeholder}
    onChange={(e) => { if (isPartialNumber(e.target.value)) setDraft(e.target.value); }}
    onBlur={commitOrRevert}
    onKeyDown={(e) => {
      if (e.key === "Enter") commitOrRevert();
      if (e.key === "Escape") setDraft(num(value));
    }}
  />;
}

function allModelRows(model: ModelSpec) {
  return (["core", "series", "parallel"] as const).flatMap((location) =>
    model[location].flatMap((comp) =>
      Object.entries(comp.params).map(([paramName, spec]) => ({ location, comp, paramName, spec })),
    ),
  );
}

function resultKey(componentId: string, paramName: string) {
  return `${componentId}.${paramName}`;
}

function labelForModelParameter(model: ModelSpec, componentId: string, paramName: string) {
  const components = [...model.core, ...model.series, ...model.parallel];
  const comp = components.find((c) => c.id === componentId);
  if (!comp) return `${componentId}.${paramName}`;
  const nick = String(comp.metadata?.nickname ?? comp.id);
  const param = comp.params[paramName];
  return `${nick}.${param?.label ?? paramName}`;
}

function updateParameter(model: ModelSpec, location: "core" | "series" | "parallel", componentId: string, paramName: string, patch: Partial<ParameterSpec>) {
  const comp = model[location].find((item) => item.id === componentId);
  if (!comp || !comp.params[paramName]) return model;
  const next = { ...comp, params: { ...comp.params, [paramName]: { ...comp.params[paramName], ...patch } } };
  return updateComponent(model, location, componentId, next);
}

export function ParameterTable({
  result,
  model,
  onModelChange,
  language,
}: {
  result: FitResult | null;
  model: ModelSpec;
  onModelChange: (model: ModelSpec) => void;
  language: Language;
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const rows = allModelRows(model);
  return <section className="card parameter-card">
    <h2>{t(language, "parameters")}</h2>
    <p className="muted parameter-editor-note">{language === "zh"
      ? "这里可以直接修改下一次拟合使用的初值、边界和 fit/fixed 状态。Fitted value 是上一次拟合结果。"
      : "Edit the initial values, bounds, and fit/fixed state used by the next fit. Fitted value shows the previous fit result."}</p>
    {rows.length === 0 ? <p className="muted">{t(language, "runFitForParameters")}</p> : <div className="table-wrap"><table className="parameter-table interactive-parameter-table">
      <thead><tr>
        <th>{t(language, "parameter")}</th>
        <th>{language === "zh" ? "初值" : "Initial"}</th>
        <th>{language === "zh" ? "拟合值" : "Fitted"}</th>
        <th>{t(language, "stdErr")}</th>
        <th>{language === "zh" ? "下限" : "Lower"}</th>
        <th>{language === "zh" ? "上限" : "Upper"}</th>
        <th>{language === "zh" ? "拟合?" : "Fit?"}</th>
        <th className="desktop-detail">{language === "zh" ? "这个参数在说什么" : "What it is telling you"}</th>
      </tr></thead>
      <tbody>{rows.map(({ location, comp, paramName, spec }) => {
        const key = resultKey(comp.id, paramName);
        const open = openKey === key;
        const fitted = result?.parameters[key];
        const meaning = result ? parameterMeaning(result, key, language) : (spec.description ?? "");
        const short = result ? parameterShortAssessment(result, key, language) : (spec.description ?? "");
        return <Fragment key={key}>
          <tr className="parameter-summary-row">
            <td title={key} onClick={() => setOpenKey(open ? null : key)}>{labelForModelParameter(model, comp.id, paramName)}</td>
            <td><DraftNumberInput value={spec.value} title={language === "zh" ? "下一次拟合的初始值" : "Initial value for next fit"} onCommit={(value) => { if (value !== null) onModelChange(updateParameter(model, location, comp.id, paramName, { value })); }} /></td>
            <td title={fitted ? String(fitted.value) : ""}>{fitted ? `${formatParameterNumber(fitted.value)} ${fitted.unit ?? spec.unit ?? ""}` : "-"}</td>
            <td className="desktop-detail" title={fitted?.stderr === null || fitted?.stderr === undefined ? "" : String(fitted.stderr)}>{fitted?.stderr === null || fitted?.stderr === undefined ? "-" : formatParameterNumber(fitted.stderr)}</td>
            <td><DraftNumberInput value={spec.lower} placeholder="-" title={language === "zh" ? "下边界，空白表示无下限" : "Lower bound; blank means unbounded"} onCommit={(value) => onModelChange(updateParameter(model, location, comp.id, paramName, { lower: value }))} /></td>
            <td><DraftNumberInput value={spec.upper} placeholder="-" title={language === "zh" ? "上边界，空白表示无上限" : "Upper bound; blank means unbounded"} onCommit={(value) => onModelChange(updateParameter(model, location, comp.id, paramName, { upper: value }))} /></td>
            <td><label className="parameter-fit-toggle"><input type="checkbox" checked={spec.fit ?? true} onChange={(e) => onModelChange(updateParameter(model, location, comp.id, paramName, { fit: e.target.checked }))} /> {spec.fit ?? true ? t(language, "fitState") : t(language, "fixed")}</label></td>
            <td className="parameter-meaning desktop-detail" title={meaning}>{short}</td>
          </tr>
          <tr className={open ? "parameter-mobile-detail open" : "parameter-mobile-detail"}>
            <td colSpan={8}>
              <div><strong>{language === "zh" ? "当前边界" : "Current bounds"}:</strong> {fmtBounds(spec.lower, spec.upper)}</div>
              <div><strong>{t(language, "stdErr")}:</strong> {fitted?.stderr === null || fitted?.stderr === undefined ? "-" : formatParameterNumber(fitted.stderr)}</div>
              <p title={meaning}>{short}</p>
            </td>
          </tr>
        </Fragment>;
      })}</tbody>
    </table></div>}
  </section>;
}
