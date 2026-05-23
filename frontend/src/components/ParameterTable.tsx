import { Fragment, useState } from "react";
import type { ComponentSpec, FitResult, FunctionDefinition, Location, ModelSpec, ParameterSpec } from "../model/types";
import { fmtBounds } from "../model/format";
import type { Language } from "../model/i18n";
import { t } from "../model/i18n";
import { parameterMeaning, parameterShortAssessment } from "../model/diagnostics";
import { buildParams, updateComponent } from "../model/utils";
import { HelpTip } from "./HelpTip";
import { parameterFilterLabel, parameterText } from "../content/localizedText";
import {
  buildParameterRows,
  filterParameterRows,
  groupParameterRows,
  parameterKey,
  replaceComponentParams,
  seedComponentFromFittedValues,
  setComponentFitState,
  type ComponentParameterGroup,
  type ParameterFilter,
} from "../model/parameterGrouping";

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

function labelForModelParameter(model: ModelSpec, componentId: string, paramName: string) {
  const components = [...model.core, ...model.series, ...model.parallel];
  const comp = components.find((c) => c.id === componentId);
  if (!comp) return `${componentId}.${paramName}`;
  const nick = String(comp.metadata?.nickname ?? comp.id);
  const param = comp.params[paramName];
  return `${nick}.${param?.label ?? paramName}`;
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
  const law = comp.law_id ?? comp.function_type;
  const form = comp.evaluation_form ?? "auto";
  const placement = comp.placement ?? "auto";
  const polarity = comp.polarity ? `${parameterText("polarity", language)}: ${comp.polarity}` : parameterText("noPolarity", language);
  return `${law} | ${form} | ${placement} | ${polarity}`;
}

function resetComponentInitials(model: ModelSpec, registry: FunctionDefinition[], group: ComponentParameterGroup) {
  const definition = registry.find((item) => item.function_type === group.component.function_type);
  if (!definition) return model;
  return replaceComponentParams(model, group.location, group.component.id, buildParams(definition, nickname(group.component)));
}

const filters: ParameterFilter[] = ["all", "fitted", "fixed", "changed", "at_bounds", "main", "branches"];

export function ParameterTable({
  result,
  model,
  registry,
  onModelChange,
  language,
}: {
  result: FitResult | null;
  model: ModelSpec;
  registry: FunctionDefinition[];
  onModelChange: (model: ModelSpec) => void;
  language: Language;
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [filter, setFilter] = useState<ParameterFilter>("all");
  const allRows = buildParameterRows(model, result);
  const rows = filterParameterRows(allRows, filter);
  const grouped = groupParameterRows(rows);

  return <section className="card parameter-card">
    <h2>{t(language, "parameters")} <HelpTip text={parameterText("help", language)} /></h2>
    <div className="parameter-filter-bar" role="toolbar" aria-label={parameterText("filterToolbar", language)}>
      {filters.map((item) => <button key={item} type="button" className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>
        {parameterFilterLabel(item, language)}
      </button>)}
    </div>
    {allRows.length === 0 ? <p className="muted">{t(language, "runFitForParameters")}</p> : grouped.length === 0 ? <p className="muted">{parameterText("noFilterMatch", language)}</p> : grouped.map((placement) => <div className="parameter-placement-group" key={placement.id}>
      <h3>{placement.id === "main" ? t(language, "mainPath") : t(language, "branches")}</h3>
      <div className="table-wrap"><table className="parameter-table interactive-parameter-table compact-parameter-table">
          <thead><tr>
            <th>{t(language, "parameter")}</th>
            <th>{parameterText("initial", language)}</th>
            <th>{parameterText("fitted", language)}</th>
            <th>{t(language, "stdErr")}</th>
            <th>{parameterText("lower", language)}</th>
            <th>{parameterText("upper", language)}</th>
            <th>{parameterText("fitQuestion", language)}</th>
            <th className="desktop-detail">{parameterText("meaningColumn", language)}</th>
          </tr></thead>
          <tbody>{placement.groups.flatMap((group) => {
            const header = <tr className="parameter-component-divider" key={`${group.component.id}-header`}>
              <td colSpan={8}>
                <div className="parameter-component-inline">
                  <div className="parameter-component-title">
                    <strong>{nickname(group.component)}</strong>
                    <span>{componentSummary(group.component, language)}</span>
                    <span className="parameter-fit-count">{group.fittedCount}/{group.totalCount} {parameterText("fittedCountSuffix", language)}</span>
                  </div>
                  <div className="parameter-batch-actions">
                    <button type="button" onClick={() => onModelChange(setComponentFitState(model, group.location, group.component.id, true))}>{parameterText("batchFitAll", language)}</button>
                    <button type="button" onClick={() => onModelChange(setComponentFitState(model, group.location, group.component.id, false))}>{parameterText("batchFixAll", language)}</button>
                    <button type="button" onClick={() => onModelChange(resetComponentInitials(model, registry, group))}>{parameterText("batchResetInitials", language)}</button>
                    <button type="button" disabled={!result} onClick={() => onModelChange(seedComponentFromFittedValues(model, result, group.location, group.component.id))}>{parameterText("batchSeedFromFitted", language)}</button>
                  </div>
                </div>
              </td>
            </tr>;
            const parameterRows = group.rows.map(({ location, component: comp, paramName, spec, isChanged, isAtBounds }) => {
            const key = parameterKey(comp.id, paramName);
            const open = openKey === key;
            const fitted = result?.parameters[key];
            const meaning = result ? parameterMeaning(result, key, language) : (spec.description ?? "");
            const short = result ? parameterShortAssessment(result, key, language) : (spec.description ?? "");
            return <Fragment key={key}>
              <tr className={["parameter-summary-row", isChanged ? "changed" : "", isAtBounds ? "at-bounds" : ""].filter(Boolean).join(" ")}>
                <td title={key} onClick={() => setOpenKey(open ? null : key)}>{labelForModelParameter(model, comp.id, paramName)}</td>
                <td><DraftNumberInput value={spec.value} title={parameterText("initialTitle", language)} onCommit={(value) => { if (value !== null) onModelChange(updateParameter(model, location, comp.id, paramName, { value })); }} /></td>
                <td title={fitted ? String(fitted.value) : ""}>{fitted ? `${formatParameterNumber(fitted.value)} ${fitted.unit ?? spec.unit ?? ""}` : "-"}</td>
                <td className="desktop-detail" title={fitted?.stderr === null || fitted?.stderr === undefined ? "" : String(fitted.stderr)}>{fitted?.stderr === null || fitted?.stderr === undefined ? "-" : formatParameterNumber(fitted.stderr)}</td>
                <td><DraftNumberInput value={spec.lower} placeholder="-" title={parameterText("lowerTitle", language)} onCommit={(value) => onModelChange(updateParameter(model, location, comp.id, paramName, { lower: value }))} /></td>
                <td><DraftNumberInput value={spec.upper} placeholder="-" title={parameterText("upperTitle", language)} onCommit={(value) => onModelChange(updateParameter(model, location, comp.id, paramName, { upper: value }))} /></td>
                <td><label className="parameter-fit-toggle"><input type="checkbox" checked={spec.fit ?? true} onChange={(e) => onModelChange(updateParameter(model, location, comp.id, paramName, { fit: e.target.checked }))} /> {spec.fit ?? true ? t(language, "fitState") : t(language, "fixed")}</label></td>
                <td className="parameter-meaning desktop-detail" title={meaning}>{short}</td>
              </tr>
              <tr className={open ? "parameter-mobile-detail open" : "parameter-mobile-detail"}>
                <td colSpan={8}>
                  <div><strong>{parameterText("currentBounds", language)}:</strong> {fmtBounds(spec.lower, spec.upper)}</div>
                  <div><strong>{t(language, "stdErr")}:</strong> {fitted?.stderr === null || fitted?.stderr === undefined ? "-" : formatParameterNumber(fitted.stderr)}</div>
                  <p title={meaning}>{short}</p>
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
