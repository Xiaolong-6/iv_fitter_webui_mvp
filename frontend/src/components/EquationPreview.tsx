import type { EquationSummary, FitResult, ModelSpec } from "../model/types";
import type { Language } from "../model/i18n";
import { t } from "../model/i18n";
import { fmtEng } from "../model/format";
import { parameterValueRows } from "../model/diagnostics";
import { MathFormula } from "./MathFormula";

interface Props { equations?: EquationSummary | null; model: ModelSpec; result?: FitResult | null; language: Language; }

type Term = { id: string; nick: string; row: string; law: string; form: string; placement: string };

function idFromRow(row: string) {
  const beforeColon = row.split(":")[0]?.trim();
  return beforeColon || row.slice(0, 24);
}
function parseLaw(row: string) {
  const law = row.match(/law=([^;·,\s]+)/)?.[1] ?? row.match(/law_id[:=]\s*([^;·,\s]+)/)?.[1] ?? "unknown";
  const form = row.match(/form=([^;·,\s]+)/)?.[1] ?? "unknown";
  const placement = row.match(/placement=([^;·,\s]+)/)?.[1] ?? "unknown";
  const nick = row.match(/nick=([^;·,]+)/)?.[1]?.trim() || idFromRow(row);
  return { law, form, placement, nick };
}
function rowsToTerms(rows: string[]): Term[] {
  return rows.map((row) => ({ id: idFromRow(row), row, ...parseLaw(row) }));
}
function isOhmic(term: Term) { return /ohmic|shunt|constant_rs|resistance/i.test(`${term.row} ${term.law}`); }
function isDiode(term: Term) { return /diode|shockley|D\d/i.test(`${term.row} ${term.law} ${term.id}`); }
function isForwardPower(term: Term) { return /forward|power/i.test(`${term.row} ${term.id}`) && !isDiode(term); }
function isBreakdown(term: Term) { return /break|reverse/i.test(`${term.row} ${term.id}`); }
function isPhotocurrentConstant(term: Term) { return /photocurrent_constant/i.test(`${term.row} ${term.law} ${term.id}`); }
function isPhotocurrentVoltage(term: Term) { return /photocurrent_voltage_dependent/i.test(`${term.row} ${term.law} ${term.id}`); }
function isPhotoconductive(term: Term) { return /photoconductive_branch/i.test(`${term.row} ${term.law} ${term.id}`); }
function isPhotoMainPath(term: Term) { return /photo_modulated_main_path/i.test(`${term.row} ${term.law} ${term.id}`); }
function isConductanceModifier(term: Term) { return term.form === "conductance_modifier" || /conductance_modifier|softplus_rs_modifier|series-path modifier/i.test(`${term.row} ${term.law} ${term.id}`); }
function isSeriesPowerDrop(term: Term) { return /softplus_power_law_voltage_drop|series_power_law_drop/i.test(`${term.row} ${term.law} ${term.id}`); }
function symbolFor(term: Term) {
  const safe = (term.nick || term.id).replace(/[^A-Za-z0-9]+/g, "");
  if (/^rs$/i.test(term.nick) || /^rs$/i.test(term.id)) return { r: "R_s", i: "I", v: "V_{Rs}" };
  if (/rsh|shunt/i.test(term.nick) || /rsh|shunt/i.test(term.id)) return { r: "R_{sh}", i: "I_{Rsh}", v: "V_j" };
  if (isDiode(term)) return { i: `I_{${safe || "D"}}`, r: "", v: "V_j" };
  if (isPhotocurrentConstant(term) || isPhotocurrentVoltage(term)) return { i: `I_{ph}`, r: "", v: "V_j" };
  if (isPhotoconductive(term)) return { i: `I_{pc}`, r: "", v: "V_j" };
  if (isForwardPower(term)) return { i: `I_{fwd}`, r: "", v: "V_j" };
  if (isBreakdown(term)) return { i: `I_{br}`, r: "", v: "V_j" };
  return { i: `I_{${safe || "branch"}}`, r: `R_{${safe || "x"}}`, v: "V_j" };
}
function seriesDropLatex(series: Term[]) {
  if (!series.length) return "V_j = V_{ext}";
  const drops = series.map((term) => {
    const s = symbolFor(term);
    if (isOhmic(term)) return `I${s.r}`;
    if (isPhotoMainPath(term)) return `I\\frac{R_0}{1+g_{ph}}`;
    if (isSeriesPowerDrop(term)) return `sA_V\\,\\operatorname{softplus}\\!\\left(\\frac{sI-I_t}{I_s}\\right)^m`;
    if (isConductanceModifier(term)) return `I R_{base}/[1 + A\\,\\operatorname{softplus}(u)]`;
    return `V_{${term.id.replace(/[^A-Za-z0-9]/g, "")}}(I)`;
  });
  return `V_j = V_{ext} - ${drops.join(" - ")}`;
}
function branchCurrentLatex(branch: Term) {
  const s = symbolFor(branch);
  if (isDiode(branch)) return `${s.i} = I_0\\left[\\exp\\!\\left(\\frac{V_j}{nV_T}\\right)-1\\right]`;
  if (isOhmic(branch)) return `${s.i} = \\frac{V_j}{${s.r}}`;
  if (isForwardPower(branch)) return `${s.i} = A_{fwd}\\,\\operatorname{softplus}\\!\\left(\\frac{V_j - V_t}{V_s}\\right)^{m}`;
  if (isBreakdown(branch)) return `${s.i} = I_{br0}\\,\\operatorname{softplus}\\!\\left(\\frac{-V_j - V_{br}}{V_s}\\right)^{m}`;
  return `${s.i} = f_{${branch.id.replace(/[^A-Za-z0-9]/g, "")}}(V_j)`;
}
function totalCurrentLatex(branches: Term[]) {
  if (!branches.length) return "I = 0";
  return `I = ${branches.map((b) => symbolFor(b).i).join(" + ")}`;
}
function concreteLatex(series: Term[], branches: Term[]) {
  const rs = series.find((t) => /rs/i.test(t.nick) && isOhmic(t));
  const diode = branches.find(isDiode);
  const rsh = branches.find((t) => /rsh|shunt/i.test(t.nick) && isOhmic(t));
  if (rs && diode && rsh && branches.length === 2 && series.length === 1) {
    return "I = I_0\\left[\\exp\\!\\left(\\frac{V_{ext}-IR_s}{nV_T}\\right)-1\\right] + \\frac{V_{ext}-IR_s}{R_{sh}}";
  }
  const vj = series.length ? "V_j" : "V_{ext}";
  const pieces = branches.map((b) => {
    const s = symbolFor(b);
    if (isDiode(b)) return `I_0\\left[\\exp\\!\\left(\\frac{${vj}}{nV_T}\\right)-1\\right]`;
    if (isOhmic(b)) return `\\frac{${vj}}{${s.r}}`;
    if (isForwardPower(b)) return `A_{fwd}\\,\\operatorname{softplus}\\!\\left(\\frac{${vj}-V_t}{V_s}\\right)^m`;
    if (isBreakdown(b)) return `I_{br0}\\,\\operatorname{softplus}\\!\\left(\\frac{-${vj}-V_{br}}{V_s}\\right)^m`;
    return `f_{${b.id.replace(/[^A-Za-z0-9]/g, "")}}(${vj})`;
  });
  return `I = ${pieces.length ? pieces.join(" + ") : "0"}`;
}
function residualLatex(branches: Term[]) {
  return `F(I;V_{ext}) = I - \\left(${branches.map((b) => symbolFor(b).i).join(" + ") || "0"}\\right) = 0`;
}
function termMeaning(term: Term, language: Language) {
  if (term.form === "conductance_modifier" || term.placement.includes("series_conductance_modifier")) return language === "zh" ? "主路传输调制，改变有效主路电阻" : "main-path transport modifier; changes effective series resistance";
  if (term.form === "voltage_drop" || term.placement.includes("series")) return language === "zh" ? "主路电压降，改变结点电压" : "main-path voltage drop; modifies junction voltage";
  if (term.form === "current_branch" || term.placement.includes("branch")) return language === "zh" ? "并联支路电流，加入总电流" : "parallel branch current; adds to terminal current";
  return language === "zh" ? "模型项" : "model term";
}
function FormulaCards({ series, branches, language }: { series: Term[]; branches: Term[]; language: Language }) {
  return <>
    <div className="equation-card formula-card">
      <h3>{language === "zh" ? "1. 结点电压" : "1. Junction voltage"}</h3>
      <MathFormula latex={seriesDropLatex(series)} />
    </div>
    <div className="equation-card formula-card">
      <h3>{language === "zh" ? "2. 支路电流" : "2. Branch currents"}</h3>
      <MathFormula latex={totalCurrentLatex(branches)} />
      <div className="branch-formula-list">{branches.map((b) => <MathFormula key={b.id} latex={branchCurrentLatex(b)} />)}</div>
    </div>
    <div className="equation-card formula-card wide-equation">
      <h3>{language === "zh" ? "3. 当前模型的合并方程" : "3. Combined equation for this model"}</h3>
      <MathFormula latex={concreteLatex(series, branches)} />
    </div>
  </>;
}
function SolverCard({ series, branches, language }: { series: Term[]; branches: Term[]; language: Language }) {
  return <div className="equation-card solver-card">
    <h3>{language === "zh" ? "4. 软件怎么求解" : "4. How the software solves it"}</h3>
    <p className="equation-explain">{language === "zh" ? "如果有主路电压降，电流 I 会同时出现在等号两边。软件会对每一个外部电压点求一个 I，使下面的残差为零。" : "When main-path voltage drops are present, I appears on both sides. For each applied voltage, the software solves for the I that makes the residual zero."}</p>
    <MathFormula latex={residualLatex(branches)} />
    <div className="chip-row"><strong>{t(language, "mainPath")}</strong>{series.map((s) => <span className="mini-chip" key={s.id}>{s.nick}</span>)}</div>
    <div className="chip-row"><strong>{t(language, "branches")}</strong>{branches.map((b) => <span className="mini-chip" key={b.id}>{b.nick}</span>)}</div>
  </div>;
}
function CurrentValuesCard({ model, result, language }: { model: ModelSpec; result?: FitResult | null; language: Language }) {
  const rows = parameterValueRows(model, result ?? null);
  return <div className="equation-card current-values-card">
    <h3>{language === "zh" ? "当前参数值" : "Current parameter values"}</h3>
    <p className="equation-explain">{language === "zh" ? "这些数值会代入上面的公式；运行拟合后这里显示拟合值，拟合前显示初始值。" : "These values plug into the formulas above. Before fitting they are initial values; after fitting they are fitted values."}</p>
    <div className="parameter-chip-grid">
      {rows.map((row) => <span className="parameter-chip" key={row.key} title={row.key}>
        <strong>{row.label}</strong>
        <span>{fmtEng(row.value.value, 4)} {"unit" in row.value && row.value.unit ? row.value.unit : ""}</span>
      </span>)}
    </div>
  </div>;
}
function ComponentRows({ terms, language }: { terms: Term[]; language: Language }) {
  return <div className="equation-card component-card">
    <h3>{language === "zh" ? "元件含义" : "Component meaning"}</h3>
    <div className="component-table readable-component-table">
      {terms.map((term) => <div className="component-row readable-component-row" key={`${term.id}-${term.row}`}>
        <span className="component-group"><strong>{term.nick}</strong></span>
        <span className="component-readable"><em>{termMeaning(term, language)}</em><small>{t(language, "law")}: {term.law} · {t(language, "evalForm")}: {term.form} · {t(language, "place")}: {term.placement}</small></span>
      </div>)}
    </div>
  </div>;
}

export function EquationPreview({ equations, model, result, language }: Props) {
  if (!equations) return <section className="card equation-preview"><h2>{t(language, "equationPreview")}</h2><p className="muted">{t(language, "formulaPreviewEmpty")}</p></section>;
  const series = rowsToTerms(equations.series);
  const branches = rowsToTerms([...equations.core, ...equations.parallel]);
  const terms = [...branches, ...series];
  return <section className="card equation-preview structured-preview"><h2>{t(language, "equationPreview")}</h2>
    <div className="equation-layout">
      <FormulaCards series={series} branches={branches} language={language} />
      <CurrentValuesCard model={model} result={result} language={language} />
      <SolverCard series={series} branches={branches} language={language} />
      <ComponentRows terms={terms} language={language} />
    </div>
  </section>;
}
