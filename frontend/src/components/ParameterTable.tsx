import { Fragment, useMemo, useState } from "react";
import type {
  ComponentSpec,
  FitResult,
  FunctionDefinition,
  Location,
  ModelSpec,
  ParameterSpec,
} from "../model/types";
import {
  fmtBounds,
  formatValueWithUnit,
  parameterFitStatus,
} from "../model/format";
import type { Language } from "../model/i18n";
import { t } from "../model/i18n";
import {
  parameterMeaning,
  parameterShortAssessment,
} from "../model/diagnostics";
import {
  boundsSourceTitle,
  markParameterUserEdited,
  type DataBoundsApplicationDetail,
  type DataBoundsApplicationReport,
} from "../model/boundsSuggestion";
import { updateComponent } from "../model/utils";
import { HelpTip } from "./HelpTip";
import { parameterText } from "../content/localizedText";
import {
  buildParameterRows,
  componentDisplayTag,
  componentLawFormPlacement,
  countParameterFilters,
  filterParameterRows,
  groupParameterRows,
  parameterKey,
  placementGroupTitle,
  seedComponentFromFittedValues,
  setComponentFitState,
  type ParameterTableFilter,
} from "../model/parameterGrouping";

function formatParameterNumber(
  v: number | undefined | null,
  unit?: string | null,
) {
  return formatValueWithUnit(v, unit, 4); // uses 4 significant digits, equivalent to toExponential(3) for scientific notation when abs < 1e-3 || abs >= 1e4
}

function num(v: number | undefined | null) {
  return formatParameterNumber(v);
}

function formatBoundsPair(
  lower: number | null | undefined,
  upper: number | null | undefined,
) {
  return fmtBounds(lower ?? null, upper ?? null);
}

function isPartialNumber(text: string) {
  return (
    text === "" ||
    text === "-" ||
    text === "+" ||
    text === "." ||
    text === "-." ||
    text === "+." ||
    /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d*)?$/.test(text)
  );
}

function commitNumber(text: string): number | null | undefined {
  if (text === "") return null;
  if (["-", "+", ".", "-.", "+."].includes(text) || /[eE][-+]?$/.test(text))
    return undefined;
  const n = Number(text);
  return Number.isFinite(n) ? n : undefined;
}

function DraftNumberInput({
  value,
  placeholder,
  title,
  disabled = false,
  onCommit,
}: {
  value: number | null | undefined;
  placeholder?: string;
  title?: string;
  disabled?: boolean;
  onCommit: (value: number | null) => void;
}) {
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
  return (
    <input
      className="parameter-edit-input"
      title={title}
      disabled={disabled}
      value={draft}
      placeholder={placeholder}
      onChange={(e) => {
        if (isPartialNumber(e.target.value)) setDraft(e.target.value);
      }}
      onBlur={commitOrRevert}
      onKeyDown={(e) => {
        if (e.key === "Enter") commitOrRevert();
        if (e.key === "Escape") setDraft(num(value));
      }}
    />
  );
}

function labelForModelParameter(
  model: ModelSpec,
  componentId: string,
  paramName: string,
) {
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
  const label =
    comp.function_type === "bias_dependent_current" ||
    comp.function_type === "photocurrent_voltage_dependent" ||
    comp.function_type === "voltage_dependent_photocurrent"
      ? (neutralBiasLabels[paramName] ?? param?.label ?? paramName)
      : (param?.label ?? paramName);
  return `${nick}.${label}`;
}

function updateParameter(
  model: ModelSpec,
  location: Location,
  componentId: string,
  paramName: string,
  patch: Partial<ParameterSpec>,
) {
  const comp = model[location].find((item) => item.id === componentId);
  if (!comp || !comp.params[paramName]) return model;
  const next = {
    ...comp,
    params: {
      ...comp.params,
      [paramName]: { ...comp.params[paramName], ...patch },
    },
  };
  return updateComponent(model, location, componentId, next);
}

function nickname(comp: ComponentSpec) {
  return String(comp.metadata?.nickname ?? comp.id);
}

function componentSummary(comp: ComponentSpec, language: Language) {
  const location =
    comp.placement?.includes("series") || comp.location === "series"
      ? language === "zh"
        ? "主路"
        : "main path"
      : language === "zh"
        ? "电流支路"
        : "current branch";
  const role =
    comp.function_type === "diode" || /shockley/i.test(comp.law_id ?? "")
      ? language === "zh"
        ? "Shockley 二极管"
        : "Shockley diode"
      : /ohmic/i.test(comp.law_id ?? "")
        ? comp.location === "series"
          ? language === "zh"
            ? "欧姆串联电阻"
            : "Ohmic series resistance"
          : language === "zh"
            ? "欧姆漏电/旁路"
            : "Ohmic leakage/shunt"
        : comp.function_type === "series_diode_barrier"
          ? language === "zh"
            ? "类二极管串联势垒压降"
            : "diode-like series barrier drop"
          : language === "zh"
            ? "经验模型项"
            : "empirical model term";
  const polarity = comp.polarity
    ? `${parameterText("polarity", language)}: ${comp.polarity}`
    : parameterText("noPolarity", language);
  return `${role} | ${location} | ${polarity}`;
}

function parameterMeaningFromSpec(
  comp: ComponentSpec,
  paramName: string,
  spec: ParameterSpec,
  language: Language,
) {
  const label = spec.label ?? paramName;
  const componentName = nickname(comp);
  const en = (text: string, zh: string) => (language === "zh" ? zh : text);
  let base = "";
  if (/^n$/i.test(paramName)) {
    base = en(
      `Ideality factor for ${componentName}. It controls how steeply the diode-like exponential turns on. Typical diode-like values are around 1–2; larger values usually need model/data review.`,
      `${componentName} 的理想因子，控制类二极管指数开启的陡峭程度。典型值约 1–2；更大值通常需要检查模型或数据。`,
    );
  } else if (/I0|I_?0/i.test(paramName) || /I0/i.test(label)) {
    base = en(
      `Current scale for ${componentName}. For diode-like terms this is the saturation-current scale; it may span many decades, so use physically reasonable bounds.`,
      `${componentName} 的电流尺度。对类二极管项通常是饱和电流尺度，可能跨很多数量级，应使用物理合理边界。`,
    );
  } else if (/Rs_ohm|^Rs$/i.test(paramName) || /^rs$/i.test(componentName)) {
    base = en(
      `Series resistance for ${componentName}. It controls high-current voltage loss and forward-bias roll-off.`,
      `${componentName} 的串联电阻，控制大电流区压降和正向高偏压弯折。`,
    );
  } else if (
    /Rsh|Rsh_ohm/i.test(paramName) ||
    /rsh|shunt/i.test(componentName)
  ) {
    base = en(
      `Shunt/leakage resistance for ${componentName}. Smaller values mean stronger linear leakage.`,
      `${componentName} 的并联/漏电电阻；数值越小表示线性漏电越强。`,
    );
  } else if (/Vt|Vbr/i.test(paramName)) {
    base = en(
      `Threshold voltage for ${componentName}. It shifts where this empirical term starts to turn on.`,
      `${componentName} 的阈值电压，决定经验项从哪个电压附近开始开启。`,
    );
  } else if (/Vs|w_V/i.test(paramName)) {
    base = en(
      `Voltage softness/scale for ${componentName}. It controls how gradual the turn-on is.`,
      `${componentName} 的电压软化/尺度参数，控制开启过程有多平滑。`,
    );
  } else if (/^A$|Aph|amplitude|scale/i.test(paramName)) {
    base = en(
      `Amplitude scale for ${componentName}. Compare it with the measured current or voltage range before trusting the fitted value.`,
      `${componentName} 的幅值尺度。可信前应和实测电流或电压范围对照。`,
    );
  } else if (/gain/i.test(paramName)) {
    base = en(
      `Bias coefficient for ${componentName}. It controls how strongly this current branch changes with voltage.`,
      `${componentName} 的偏压系数，控制该电流支路随电压变化的强弱。`,
    );
  } else if (/direction_sign/i.test(paramName)) {
    base = en(
      `Direction sign for ${componentName}. It controls whether this branch adds to or subtracts from terminal current.`,
      `${componentName} 的方向符号，控制该支路是增加还是减少端口电流。`,
    );
  } else {
    base =
      spec.description ||
      en(
        `Parameter ${label} for ${componentName}. Review fitted value, uncertainty, and bounds together.`,
        `${componentName} 的参数 ${label}。请结合拟合值、不确定度和边界一起判断。`,
      );
  }
  if (spec.description && !base.includes(spec.description)) {
    base += ` ${spec.description}`;
  }
  return base;
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
  if (!applied && detail.skipReason)
    rows.push(`Skip reason: ${detail.skipReason}`);
  rows.push(`Basis: ${detail.reason}`);
  return rows.join("\n");
}

function DataBoundsDetail({
  detail,
}: {
  detail?: DataBoundsApplicationDetail;
}) {
  if (!detail) return null;
  const applied = detail.action === "applied";
  return (
    <span
      className={
        applied ? "data-bounds-note applied" : "data-bounds-note skipped"
      }
      title={dataBoundsTitle(detail)}
    >
      {applied ? "auto bounds applied" : "auto bounds skipped"}
    </span>
  );
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
  const [parameterFilter, setParameterFilter] = useState<ParameterTableFilter>("all");
  const sourceRows = useMemo(() => buildParameterRows(model, result), [model, result]);
  const filterCounts = useMemo(() => countParameterFilters(sourceRows, result), [sourceRows, result]);
  const allRows = useMemo(() => filterParameterRows(sourceRows, result, parameterFilter), [sourceRows, result, parameterFilter]);
  const grouped = useMemo(() => groupParameterRows(allRows, result), [allRows, result]);
  const totalNearOrWeak = filterCounts.near_bound + filterCounts.weak;

  return (
    <section className="card parameter-card">
      <h2>
        {t(language, "parameters")}{" "}
        <HelpTip text={parameterText("help", language)} />
      </h2>
      <div
        className="parameter-filter-bar"
        role="toolbar"
        aria-label={parameterText("restoreToolbar", language)}
      >
        <button
          type="button"
          disabled={
            disabled || !canRestoreInitialValues || !onRestoreInitialValues
          }
          onClick={onRestoreInitialValues}
        >
          {language === "zh" ? "恢复初值" : "Restore"}
        </button>
        <button
          type="button"
          disabled={disabled || !onApplyDataBounds}
          onClick={onApplyDataBounds}
          title={
            language === "zh"
              ? "根据当前选中 trace 和拟合电压范围生成保守的 data-aware bounds；只覆盖仍为默认值或之前由数据建议生成的 bounds。"
              : "Generate conservative data-aware bounds from the selected trace and fit voltage range. Only default or previous data-suggested bounds are overwritten."
          }
        >
          {language === "zh" ? "应用边界" : "Apply bounds"}
        </button>
        <button
          type="button"
          disabled={
            disabled ||
            !canSeedSyntheticGroundTruth ||
            !onSeedSyntheticGroundTruth
          }
          onClick={onSeedSyntheticGroundTruth}
          title={
            language === "zh"
              ? "从当前 synthetic trace metadata 中保存的真实参数恢复初值。不会改变模型结构或参数 key。"
              : "Restore initials from the ground-truth parameters stored in the active synthetic trace metadata. Model structure and parameter keys are not changed."
          }
        >
          {language === "zh" ? "Synthetic 真值" : "Seed synthetic"}
        </button>
        <label className="inline-select parameter-filter-select">
          <span>{language === "zh" ? "显示" : "Show"}</span>
          <select value={parameterFilter} onChange={(e) => setParameterFilter(e.target.value as ParameterTableFilter)}>
            <option value="all">{language === "zh" ? "全部参数" : "All parameters"} ({filterCounts.all})</option>
            <option value="free">{language === "zh" ? "自由参数" : "Free"} ({filterCounts.free})</option>
            <option value="fixed">{language === "zh" ? "固定参数" : "Fixed"} ({filterCounts.fixed})</option>
            <option value="near_bound">{language === "zh" ? "接近边界" : "Near bound"} ({filterCounts.near_bound})</option>
            <option value="weak">{language === "zh" ? "弱识别" : "Weakly identified"} ({filterCounts.weak})</option>
          </select>
        </label>
      </div>
      <div className="parameter-diagnostic-strip" role="status">
        <span>{language === "zh" ? "参数总数" : "Parameters"}: <strong>{filterCounts.all}</strong></span>
        <button type="button" className={parameterFilter === "near_bound" ? "active" : ""} onClick={() => setParameterFilter("near_bound")} disabled={filterCounts.near_bound === 0}>{language === "zh" ? "贴近边界" : "Near bound"}: {filterCounts.near_bound}</button>
        <button type="button" className={parameterFilter === "weak" ? "active" : ""} onClick={() => setParameterFilter("weak")} disabled={filterCounts.weak === 0}>{language === "zh" ? "弱识别" : "Weak"}: {filterCounts.weak}</button>
        <span className={totalNearOrWeak ? "parameter-diagnostic-warning" : "parameter-diagnostic-ok"}>{totalNearOrWeak ? (language === "zh" ? "需要复核参数诊断" : "Review parameter diagnostics") : (language === "zh" ? "未发现参数诊断警告" : "No parameter diagnostic warnings")}</span>
      </div>
      {sourceRows.length === 0 ? (
        <p className="muted">{t(language, "runFitForParameters")}</p>
      ) : allRows.length === 0 ? (
        <p className="muted">{language === "zh" ? "当前筛选条件下没有参数。" : "No parameters match the current filter."}</p>
      ) : (
        <div className="parameter-groups-scroll">
          {grouped.map((placement) => (
            <div className="parameter-placement-group" key={placement.id}>
              <h3>{placementGroupTitle(placement.id, language)}</h3>
              <div className="table-wrap">
                <table className="parameter-table interactive-parameter-table compact-parameter-table">
                  <thead>
                    <tr>
                      <th>{t(language, "parameter")}</th>
                      <th>{parameterText("initial", language)}</th>
                      <th>{parameterText("fitted", language)}</th>
                      <th>{language === "zh" ? "状态" : "Status"}</th>
                      <th>{t(language, "stdErr")}</th>
                      <th>{parameterText("lower", language)}</th>
                      <th>{parameterText("upper", language)}</th>
                      <th>{parameterText("fitQuestion", language)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {placement.groups.flatMap((group, groupIndex) => {
                      const lawFormPlacement = componentLawFormPlacement(group.component);
                      const canSeedComponent = group.fittedResultCount > 0 && Boolean(result);
                      const header = (
                        <tr
                          className={`parameter-component-divider component-accent-${groupIndex % 8}`}
                          key={`${group.component.id}-header`}
                        >
                          <td colSpan={7}>
                            <div className="parameter-component-title">
                              <strong>{nickname(group.component)}</strong>
                              <span
                                title={`${componentSummary(group.component, language)}
Law: ${lawFormPlacement.law}
Form: ${lawFormPlacement.form}
Placement: ${lawFormPlacement.placement}`}
                              >
                                {componentSummary(group.component, language)}
                              </span>
                              <span className="parameter-law-form-placement" title={componentDisplayTag(group.component)}>
                                Law: {lawFormPlacement.law} · Form: {lawFormPlacement.form} · Placement: {lawFormPlacement.placement}
                              </span>
                              <span className="parameter-fit-count">
                                {group.fittedCount}/{group.totalCount}{" "}
                                {parameterText("fittedCountSuffix", language)}
                              </span>
                              {group.nearBoundCount || group.weakCount ? <span className="parameter-component-warning">{group.nearBoundCount ? `${group.nearBoundCount} near bound` : ""}{group.nearBoundCount && group.weakCount ? " · " : ""}{group.weakCount ? `${group.weakCount} weak` : ""}</span> : null}
                            </div>
                          </td>
                          <td>
                            <div className="parameter-fit-batch-toggles">
                              <button
                                type="button"
                                disabled={disabled || !canSeedComponent}
                                onClick={() => onModelChange(seedComponentFromFittedValues(model, result, group.location, group.component.id))}
                                title={language === "zh" ? "把这个组件的 fitted value 写回下一轮初值；不会改变模型结构。" : "Seed this component from fitted values for the next run. Model structure is unchanged."}
                              >
                                {language === "zh" ? "用拟合值作初值" : "Seed from fit"}
                              </button>
                              <label
                                title={componentSummary(
                                  group.component,
                                  language,
                                )}
                              >
                                <input
                                  type="checkbox"
                                  disabled={disabled}
                                  checked={
                                    group.fittedCount === group.totalCount
                                  }
                                  onChange={(e) =>
                                    onModelChange(
                                      setComponentFitState(
                                        model,
                                        group.location,
                                        group.component.id,
                                        e.target.checked,
                                      ),
                                    )
                                  }
                                />{" "}
                                {group.fittedCount === group.totalCount
                                  ? parameterText("batchFixAll", language)
                                  : parameterText("batchFitAll", language)}
                              </label>
                            </div>
                          </td>
                        </tr>
                      );
                      const parameterRows = group.rows.map(
                        ({ location, component: comp, paramName, spec }) => {
                          const key = parameterKey(comp.id, paramName);
                          const dataBoundsDetails =
                            dataBoundsReport?.details.filter(
                              (detail) => detail.key === key,
                            ) ?? [];
                          const dataBoundsDetail =
                            dataBoundsDetails[dataBoundsDetails.length - 1];
                          const open = openKey === key;
                          const fitted = result?.parameters[key];
                          const prefitMeaning = parameterMeaningFromSpec(
                            comp,
                            paramName,
                            spec,
                            language,
                          );
                          const meaning = result
                            ? parameterMeaning(result, key, language)
                            : prefitMeaning;
                          const short = result
                            ? parameterShortAssessment(result, key, language)
                            : prefitMeaning;
                          const information = dataBoundsReport ? (
                            <DataBoundsDetail detail={dataBoundsDetail} />
                          ) : (
                            short
                          );
                          const informationTitle = dataBoundsReport
                            ? dataBoundsDetail
                              ? dataBoundsTitle(dataBoundsDetail)
                              : ""
                            : meaning;
                          return (
                            <Fragment key={key}>
                              <tr className="parameter-summary-row">
                                <td
                                  title={meaning}
                                  onClick={() => setOpenKey(open ? null : key)}
                                >
                                  {labelForModelParameter(
                                    model,
                                    comp.id,
                                    paramName,
                                  )}
                                </td>
                                <td>
                                  <DraftNumberInput
                                    disabled={disabled}
                                    value={spec.value}
                                    title={parameterText(
                                      "initialTitle",
                                      language,
                                    )}
                                    onCommit={(value) => {
                                      if (value !== null)
                                        onModelChange(
                                          markParameterUserEdited(
                                            updateParameter(
                                              model,
                                              location,
                                              comp.id,
                                              paramName,
                                              { value },
                                            ),
                                            comp.id,
                                            paramName,
                                            "initial",
                                          ),
                                        );
                                    }}
                                  />
                                </td>
                                <td title={fitted ? String(fitted.value) : ""}>
                                  {fitted
                                    ? formatParameterNumber(
                                        fitted.value,
                                        fitted.unit ?? spec.unit,
                                      )
                                    : "-"}
                                </td>
                                <td>
                                  <span className="parameter-status-pill">
                                    {fitted
                                      ? parameterFitStatus(
                                          fitted.value,
                                          fitted.lower,
                                          fitted.upper,
                                          fitted.stderr,
                                          fitted.fixed,
                                        )
                                      : (spec.fit ?? true)
                                        ? "free"
                                        : "fixed"}
                                  </span>
                                </td>
                                <td
                                  className="desktop-detail"
                                  title={
                                    fitted?.stderr === null ||
                                    fitted?.stderr === undefined
                                      ? ""
                                      : String(fitted.stderr)
                                  }
                                >
                                  {fitted?.stderr === null ||
                                  fitted?.stderr === undefined
                                    ? "-"
                                    : formatParameterNumber(
                                        fitted.stderr,
                                        fitted.unit ?? spec.unit,
                                      )}
                                </td>
                                <td>
                                  <DraftNumberInput
                                    disabled={disabled}
                                    value={spec.lower}
                                    placeholder="-"
                                    title={`${parameterText("lowerTitle", language)}\n${boundsSourceTitle(model, comp.id, paramName, language)}`}
                                    onCommit={(value) =>
                                      onModelChange(
                                        markParameterUserEdited(
                                          updateParameter(
                                            model,
                                            location,
                                            comp.id,
                                            paramName,
                                            { lower: value },
                                          ),
                                          comp.id,
                                          paramName,
                                          "bounds",
                                        ),
                                      )
                                    }
                                  />
                                </td>
                                <td>
                                  <DraftNumberInput
                                    disabled={disabled}
                                    value={spec.upper}
                                    placeholder="-"
                                    title={`${parameterText("upperTitle", language)}\n${boundsSourceTitle(model, comp.id, paramName, language)}`}
                                    onCommit={(value) =>
                                      onModelChange(
                                        markParameterUserEdited(
                                          updateParameter(
                                            model,
                                            location,
                                            comp.id,
                                            paramName,
                                            { upper: value },
                                          ),
                                          comp.id,
                                          paramName,
                                          "bounds",
                                        ),
                                      )
                                    }
                                  />
                                </td>
                                <td>
                                  <label
                                    className="parameter-fit-toggle"
                                    title={informationTitle || meaning}
                                  >
                                    <input
                                      type="checkbox"
                                      disabled={disabled}
                                      checked={spec.fit ?? true}
                                      onChange={(e) =>
                                        onModelChange(
                                          updateParameter(
                                            model,
                                            location,
                                            comp.id,
                                            paramName,
                                            { fit: e.target.checked },
                                          ),
                                        )
                                      }
                                    />{" "}
                                    {(spec.fit ?? true)
                                      ? t(language, "fitState")
                                      : t(language, "fixed")}
                                  </label>
                                </td>
                              </tr>
                              <tr
                                className={
                                  open
                                    ? "parameter-mobile-detail open"
                                    : "parameter-mobile-detail"
                                }
                              >
                                <td colSpan={8}>
                                  <div
                                    title={boundsSourceTitle(
                                      model,
                                      comp.id,
                                      paramName,
                                      language,
                                    )}
                                  >
                                    <strong>
                                      {parameterText("currentBounds", language)}
                                      :
                                    </strong>{" "}
                                    {fmtBounds(spec.lower, spec.upper)}
                                  </div>
                                  <div>
                                    <strong>{t(language, "stdErr")}:</strong>{" "}
                                    {fitted?.stderr === null ||
                                    fitted?.stderr === undefined
                                      ? "-"
                                      : formatParameterNumber(
                                          fitted.stderr,
                                          fitted.unit ?? spec.unit,
                                        )}
                                  </div>
                                  {dataBoundsReport ? (
                                    <DataBoundsDetail
                                      detail={dataBoundsDetail}
                                    />
                                  ) : (
                                    <p title={meaning}>{short}</p>
                                  )}
                                </td>
                              </tr>
                            </Fragment>
                          );
                        },
                      );
                      return [header, ...parameterRows];
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
