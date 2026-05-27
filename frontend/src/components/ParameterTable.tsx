import { Fragment, useState } from "react";
import type { ComponentSpec, FitResult, FunctionDefinition, Location, ModelSpec, ParameterSpec } from "../model/types";
import { fmtBounds, formatValueWithUnit, parameterFitStatus } from "../model/format";
import type { Language } from "../model/i18n";
import { t } from "../model/i18n";
import { parameterMeaning, parameterShortAssessment } from "../model/diagnostics";
import { boundsSourceTitle, markParameterUserEdited, type DataBoundsApplicationDetail, type DataBoundsApplicationReport } from "../model/boundsSuggestion";
import { updateComponent } from "../model/utils";
import { HelpTip } from "./HelpTip";
import { parameterText } from "../content/localizedText";
import {
  buildParameterRows,
  groupParameterRows,
  parameterKey,
  setComponentFitState,
  type ComponentParameterGroup,
} from "../model/parameterGrouping";

function formatParameterNumber(v: number | undefined | null, unit?: string | null) {
  return formatValueWithUnit(v, unit, 4); // uses 4 significant digits, equivalent to toExponential(3) for scientific notation when abs < 1e-3 || abs >= 1e4
}

function num(v: number | undefined | null) {
  return formatParameterNumber(v);
}

function formatBoundsPair(lower: number | null | undefined, upper: number | null | undefined) {
  return fmtBounds(lower ?? null, upper ?? null);
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

function DraftNumberInput({ value, placeholder, title, disabled = false, onCommit }: { value: number | null | undefined; placeholder?: string; title?: string; disabled?: boolean; onCommit: (value: number | null) => void }) {
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
    disabled={disabled}
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

function labelForModelParameter(model: ModelSpec, componentId: string, paramName: string) {
  const components = [...model.core, ...model.series, ...model.parallel];
  const comp = components.find((c) => c.id === componentId);
  if (!comp) return `${componentId}.${paramName}`;
  const nick = String(comp.metadata?.nickname ?? comp.id);
  const param = comp.params[paramName];
  const neutralBiasLabels: Record<string, string> = {
    Iph0_A: "I0",
    Aph: "A",
    Vt_ph_V: "Vt",
    Vs_ph_V: "Vs",
    m_ph: "m",
  };
  const label = comp.function_type === "bias_dependent_current" || comp.function_type === "photocurrent_voltage_dependent" || comp.function_type === "voltage_dependent_photocurrent"
    ? (neutralBiasLabels[paramName] ?? param?.label ?? paramName)
    : (param?.label ?? paramName);
  return `${nick}.${label}`;
}

function updateParameter(model: ModelSpec, location: Location, componentId: string, paramName: string, patch: Partial<ParameterSpec>) {
  const comp = model[location].find((item) => item.id === componentId);
  if (!comp || !comp.params[paramName]) return model;
  const next = { ...comp, params: { ...comp.params, [paramName]: { ...comp.params[paramName], ...patch } } };
  return updateComponent(model, location, componentId, next);
}

function nickname(comp: ComponentSpec) {
  return String(comp.metadata?.nickname ?? comp.id);
}

function componentSummary(comp: ComponentSpec, language: Language) {
  const law = comp.function_type === "photocurrent_voltage_dependent" || comp.function_type === "voltage_dependent_photocurrent" || comp.law_id === "photocurrent_voltage_dependent" || comp.law_id === "voltage_dependent_photocurrent"
    ? "bias_dependent_current"
    : comp.law_id ?? comp.function_type;
  const form = comp.evaluation_form ?? "auto";
  const placement = comp.placement ?? "auto";
  const polarity = comp.polarity ? `${parameterText("polarity", language)}: ${comp.polarity}` : parameterText("noPolarity", language);
  return `${law} | ${form} | ${placement} | ${polarity}`;
}

function sourceLabel(source: DataBoundsApplicationDetail["source"]) {
  if (source === "data_suggested") return "previous data suggestion";
  if (source === "user_edited") return "user-edited";
  if (source === "fit_derived_initial") return "fitted-as-initial";
  if (source === "registry_default") return "registry default";
  return "no stored source";
}

function dataBoundsTitle(detail: DataBoundsApplicationDetail) {
  const applied = detail.action === "applied";
  const rows = [
    applied ? "Auto bounds applied" : "Auto bounds skipped",
    applied
      ? `Changed: ${formatBoundsPair(detail.previousLower, detail.previousUpper)} -> ${formatBoundsPair(detail.currentLower, detail.currentUpper)}`
      : `Current: ${formatBoundsPair(detail.currentLower, detail.currentUpper)}; suggested: ${formatBoundsPair(detail.suggestedLower, detail.suggestedUpper)}`,
    `Current source: ${sourceLabel(detail.source)}`,
  ];
  if (!applied && detail.skipReason) rows.push(`Skip reason: ${detail.skipReason}`);
  rows.push(`Basis: ${detail.reason}`);
  return rows.join("\n");
}

function DataBoundsDetail({ detail }: { detail?: DataBoundsApplicationDetail }) {
  if (!detail) return null;
  const applied = detail.action === "applied";
  return <span className={applied ? "data-bounds-note applied" : "data-bounds-note skipped"} title={dataBoundsTitle(detail)}>
    {applied ? "auto bounds applied" : "auto bounds skipped"}
  </span>;
}

export function ParameterTable({
  result,
  model,
  registry,
  onModelChange,
  language,
  canRestoreInitialValues = false,
  onRestoreInitialValues,
  onApplyDataBounds,
  canSeedSyntheticGroundTruth = false,
  onSeedSyntheticGroundTruth,
  dataBoundsReport,
  disabled = false,
}: {
  result: FitResult | null;
  model: ModelSpec;
  registry: FunctionDefinition[];
  onModelChange: (model: ModelSpec) => void;
  language: Language;
  canRestoreInitialValues?: boolean;
  onRestoreInitialValues?: () => void;
  onApplyDataBounds?: () => void;
  canSeedSyntheticGroundTruth?: boolean;
  onSeedSyntheticGroundTruth?: () => void;
  dataBoundsReport?: DataBoundsApplicationReport | null;
  disabled?: boolean;
}) {
  void registry;
  const [openKey, setOpenKey] = useState<string | null>(null);
  const allRows = buildParameterRows(model, result);
  const grouped = groupParameterRows(allRows);

  return <section className="card parameter-card">
    <h2>{t(language, "parameters")} <HelpTip text={parameterText("help", language)} /></h2>
    <div className="parameter-filter-bar" role="toolbar" aria-label={parameterText("restoreToolbar", language)}>
      <button type="button" disabled={disabled || !canRestoreInitialValues || !onRestoreInitialValues} onClick={onRestoreInitialValues}>
        {parameterText("restoreInitialValues", language)}
      </button>
      <button type="button" disabled={disabled || !onApplyDataBounds} onClick={onApplyDataBounds} title={language === "zh" ? "根据当前选中 trace 和拟合电压范围生成保守的 data-aware bounds；只覆盖仍为默认值或之前由数据建议生成的 bounds。" : "Generate conservative data-aware bounds from the selected trace and fit voltage range. Only default or previous data-suggested bounds are overwritten."}>
        {language === "zh" ? "应用数据建议边界" : "Apply data bounds"}
      </button>
      <button type="button" disabled={disabled || !canSeedSyntheticGroundTruth || !onSeedSyntheticGroundTruth} onClick={onSeedSyntheticGroundTruth} title={language === "zh" ? "从当前 synthetic trace metadata 中保存的真实参数恢复初值。不会改变模型结构或参数 key。" : "Restore initials from the ground-truth parameters stored in the active synthetic trace metadata. Model structure and parameter keys are not changed."}>
        {language === "zh" ? "使用 synthetic 真值作为初值" : "Seed from synthetic ground truth"}
      </button>
    </div>
    {allRows.length === 0 ? <p className="muted">{t(language, "runFitForParameters")}</p> : grouped.map((placement) => <div className="parameter-placement-group" key={placement.id}>
      <h3>{placement.id === "main" ? t(language, "mainPath") : t(language, "branches")}</h3>
      <div className="table-wrap"><table className="parameter-table interactive-parameter-table compact-parameter-table">
          <thead><tr>
            <th>{t(language, "parameter")}</th>
            <th>{parameterText("initial", language)}</th>
            <th>{parameterText("fitted", language)}</th>
            <th>{language === "zh" ? "状态" : "Status"}</th>
            <th>{t(language, "stdErr")}</th>
            <th>{parameterText("lower", language)}</th>
            <th>{parameterText("upper", language)}</th>
            <th>{parameterText("fitQuestion", language)}</th>
            <th className="desktop-detail">{parameterText("meaningColumn", language)}</th>
          </tr></thead>
          <tbody>{placement.groups.flatMap((group) => {
            const header = <tr className="parameter-component-divider" key={`${group.component.id}-header`}>
              <td colSpan={7}>
                <div className="parameter-component-title">
                  <strong>{nickname(group.component)}</strong>
                  <span>{componentSummary(group.component, language)}</span>
                  <span className="parameter-fit-count">{group.fittedCount}/{group.totalCount} {parameterText("fittedCountSuffix", language)}</span>
                </div>
              </td>
              <td>
                <div className="parameter-fit-batch-toggles">
                  <label><input type="checkbox" disabled={disabled} checked={group.fittedCount === group.totalCount} onChange={(e) => onModelChange(setComponentFitState(model, group.location, group.component.id, e.target.checked))} /> {group.fittedCount === group.totalCount ? parameterText("batchFixAll", language) : parameterText("batchFitAll", language)}</label>
                </div>
              </td>
              <td className="desktop-detail"></td>
            </tr>;
            const parameterRows = group.rows.map(({ location, component: comp, paramName, spec }) => {
            const key = parameterKey(comp.id, paramName);
            const dataBoundsDetails = dataBoundsReport?.details.filter((detail) => detail.key === key) ?? [];
            const dataBoundsDetail = dataBoundsDetails[dataBoundsDetails.length - 1];
            const open = openKey === key;
            const fitted = result?.parameters[key];
            const meaning = result ? parameterMeaning(result, key, language) : (spec.description ?? "");
            const short = result ? parameterShortAssessment(result, key, language) : (spec.description ?? "");
            const information = dataBoundsReport ? <DataBoundsDetail detail={dataBoundsDetail} /> : short;
            const informationTitle = dataBoundsReport ? (dataBoundsDetail ? dataBoundsTitle(dataBoundsDetail) : "") : meaning;
            return <Fragment key={key}>
              <tr className="parameter-summary-row">
                <td title={key} onClick={() => setOpenKey(open ? null : key)}>{labelForModelParameter(model, comp.id, paramName)}</td>
                <td><DraftNumberInput disabled={disabled} value={spec.value} title={parameterText("initialTitle", language)} onCommit={(value) => { if (value !== null) onModelChange(markParameterUserEdited(updateParameter(model, location, comp.id, paramName, { value }), comp.id, paramName, "initial")); }} /></td>
                <td title={fitted ? String(fitted.value) : ""}>{fitted ? formatParameterNumber(fitted.value, fitted.unit ?? spec.unit) : "-"}</td>
                <td><span className="parameter-status-pill">{fitted ? parameterFitStatus(fitted.value, fitted.lower, fitted.upper, fitted.stderr, fitted.fixed) : (spec.fit ?? true ? "free" : "fixed")}</span></td>
                <td className="desktop-detail" title={fitted?.stderr === null || fitted?.stderr === undefined ? "" : String(fitted.stderr)}>{fitted?.stderr === null || fitted?.stderr === undefined ? "-" : formatParameterNumber(fitted.stderr, fitted.unit ?? spec.unit)}</td>
                <td><DraftNumberInput disabled={disabled} value={spec.lower} placeholder="-" title={`${parameterText("lowerTitle", language)}\n${boundsSourceTitle(model, comp.id, paramName, language)}`} onCommit={(value) => onModelChange(markParameterUserEdited(updateParameter(model, location, comp.id, paramName, { lower: value }), comp.id, paramName, "bounds"))} /></td>
                <td><DraftNumberInput disabled={disabled} value={spec.upper} placeholder="-" title={`${parameterText("upperTitle", language)}\n${boundsSourceTitle(model, comp.id, paramName, language)}`} onCommit={(value) => onModelChange(markParameterUserEdited(updateParameter(model, location, comp.id, paramName, { upper: value }), comp.id, paramName, "bounds"))} /></td>
                <td><label className="parameter-fit-toggle"><input type="checkbox" disabled={disabled} checked={spec.fit ?? true} onChange={(e) => onModelChange(updateParameter(model, location, comp.id, paramName, { fit: e.target.checked }))} /> {spec.fit ?? true ? t(language, "fitState") : t(language, "fixed")}</label></td>
                <td className="parameter-meaning desktop-detail" title={informationTitle}>{information}</td>
              </tr>
              <tr className={open ? "parameter-mobile-detail open" : "parameter-mobile-detail"}>
                <td colSpan={9}>
                  <div title={boundsSourceTitle(model, comp.id, paramName, language)}><strong>{parameterText("currentBounds", language)}:</strong> {fmtBounds(spec.lower, spec.upper)}</div>
                  <div><strong>{t(language, "stdErr")}:</strong> {fitted?.stderr === null || fitted?.stderr === undefined ? "-" : formatParameterNumber(fitted.stderr, fitted.unit ?? spec.unit)}</div>
                  {dataBoundsReport ? <DataBoundsDetail detail={dataBoundsDetail} /> : <p title={meaning}>{short}</p>}
                </td>
              </tr>
            </Fragment>;
            });
            return [header, ...parameterRows];
          })}</tbody>
        </table></div>
    </div>)}
  </section>;
}
