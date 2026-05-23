import type { EquationSummary } from "../model/types";
import type { Language } from "../model/i18n";
import { t } from "../model/i18n";

interface Props { equations?: EquationSummary | null; language: Language; }

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
function symbolFor(term: Term) {
  const safe = (term.nick || term.id).replace(/[^A-Za-z0-9]+/g, "");
  if (/^rs$/i.test(term.nick) || /^rs$/i.test(term.id)) return { r: "R_s", i: "I", v: "V_{Rs}" };
  if (/rsh|shunt/i.test(term.nick) || /rsh|shunt/i.test(term.id)) return { r: "R_{sh}", i: "I_{Rsh}", v: "V_j" };
  if (isDiode(term)) return { i: `I_{${safe || "D"}}`, r: "", v: "V_j" };
  if (isForwardPower(term)) return { i: `I_{fwd}`, r: "", v: "V_j" };
  if (isBreakdown(term)) return { i: `I_{br}`, r: "", v: "V_j" };
  return { i: `I_{${safe || "branch"}}`, r: `R_{${safe || "x"}}`, v: "V_j" };
}
function seriesDropLatex(series: Term[]) {
  if (!series.length) return "V_j = V_{ext}";
  const drops = series.map((term) => {
    const s = symbolFor(term);
    return isOhmic(term) ? `I${s.r}` : `V_{${term.id.replace(/[^A-Za-z0-9]/g, "")}}(I)`;
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
  if (term.form === "voltage_drop" || term.placement.includes("series")) return language === "zh" ? "主路电压降，改变结点电压" : "main-path voltage drop; modifies junction voltage";
  if (term.form === "current_branch" || term.placement.includes("branch")) return language === "zh" ? "并联支路电流，加入总电流" : "parallel branch current; adds to terminal current";
  return language === "zh" ? "模型项" : "model term";
}
function LatexFormula({ latex, label }: { latex: string; label?: string }) {
  // Lightweight TeX-to-visual renderer for the limited formula set above. The annotation keeps a clean TeX copy for screen readers/debug.
  return <div className="latex-card" aria-label={label ?? latex}>
    <span className="latex-rendered" dangerouslySetInnerHTML={{ __html: renderLatexLite(latex) }} />
    <span className="latex-copy">{latex}</span>
  </div>;
}
function renderLatexLite(src: string) {
  let s = src;
  const frac = (a: string, b: string) => `<span class="frac"><span>${a}</span><span>${b}</span></span>`;
  s = s.replace(/\\frac\{V_\{ext\}-IR_s\}\{nV_T\}/g, frac("V_{ext}−IR_s", "nV_T"));
  s = s.replace(/\\frac\{V_\{ext\}-IR_s\}\{R_\{sh\}\}/g, frac("V_{ext}−IR_s", "R_{sh}"));
  s = s.replace(/\\frac\{V_j - V_t\}\{V_s\}/g, frac("V_j−V_t", "V_s"));
  s = s.replace(/\\frac\{-V_j - V_\{br\}\}\{V_s\}/g, frac("−V_j−V_{br}", "V_s"));
  s = s.replace(/\\frac\{V_j\}\{nV_T\}/g, frac("V_j", "nV_T"));
  s = s.replace(/\\frac\{V_j\}\{R_\{sh\}\}/g, frac("V_j", "R_{sh}"));
  s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '<span class="frac"><span>$1</span><span>$2</span></span>');
  s = s.replace(/\\left|\\right|\\!/g, "");
  s = s.replace(/\\operatorname\{softplus\}/g, "softplus");
  s = s.replace(/\\exp/g, "exp");
  s = s.replace(/([A-Za-z]+)_\{([^{}]+)\}/g, '$1<sub>$2</sub>');
  s = s.replace(/([A-Za-z])_([A-Za-z0-9]+)/g, '$1<sub>$2</sub>');
  s = s.replace(/\^\{([^{}]+)\}/g, '<sup>$1</sup>');
  s = s.replace(/\^([A-Za-z0-9]+)/g, '<sup>$1</sup>');
  s = s.replace(/\\,/g, " ");
  s = s.replace(/\*/g, "·");
  s = s.replace(/\\/g, "");
  return s;
}

function CircuitCard({ series, branches, language }: { series: Term[]; branches: Term[]; language: Language }) {
  return <div className="equation-card circuit-card">
    <h3>{language === "zh" ? "等效电路" : "Equivalent circuit"}</h3>
    <div className="circuit-schematic" aria-label="equivalent circuit schematic">
      <div className="node terminal">{t(language, "terminalPlus")}</div>
      <div className="wire" />
      <div className="main-components">{series.length ? series.map((m) => <span className="component-box" key={m.id}>{m.nick}</span>) : <span className="component-box muted-box">{t(language, "direct")}</span>}</div>
      <div className="wire" />
      <div className="node junction">V<sub>j</sub></div>
      <div className="branch-stack">{branches.length ? branches.map((b) => <div className="branch-line" key={b.id}><span className="component-box branch-box">{b.nick}</span><span className="wire small" /><span className="node terminal small-node">{t(language, "terminalMinus")}</span></div>) : <div className="branch-line"><span className="muted">{t(language, "noBranch")}</span></div>}</div>
    </div>
    <p className="equation-explain">{language === "zh" ? "主路元件先决定结点电压；结点上的并联支路再贡献端口电流。" : "Main-path elements set the junction voltage first; branch elements then contribute terminal current."}</p>
  </div>;
}
function FormulaCards({ series, branches, language }: { series: Term[]; branches: Term[]; language: Language }) {
  return <>
    <div className="equation-card formula-card">
      <h3>{language === "zh" ? "1. 结点电压" : "1. Junction voltage"}</h3>
      <LatexFormula latex={seriesDropLatex(series)} />
    </div>
    <div className="equation-card formula-card">
      <h3>{language === "zh" ? "2. 支路电流" : "2. Branch currents"}</h3>
      <LatexFormula latex={totalCurrentLatex(branches)} />
      <div className="branch-formula-list">{branches.map((b) => <LatexFormula key={b.id} latex={branchCurrentLatex(b)} />)}</div>
    </div>
    <div className="equation-card formula-card wide-equation">
      <h3>{language === "zh" ? "3. 当前模型的合并方程" : "3. Combined equation for this model"}</h3>
      <LatexFormula latex={concreteLatex(series, branches)} />
    </div>
  </>;
}
function SolverCard({ series, branches, language }: { series: Term[]; branches: Term[]; language: Language }) {
  return <div className="equation-card solver-card">
    <h3>{language === "zh" ? "4. 软件怎么求解" : "4. How the software solves it"}</h3>
    <p className="equation-explain">{language === "zh" ? "如果有主路电压降，电流 I 会同时出现在等号两边。软件会对每一个外部电压点求一个 I，使下面的残差为零。" : "When main-path voltage drops are present, I appears on both sides. For each applied voltage, the software solves for the I that makes the residual zero."}</p>
    <LatexFormula latex={residualLatex(branches)} />
    <div className="chip-row"><strong>{t(language, "mainPath")}</strong>{series.map((s) => <span className="mini-chip" key={s.id}>{s.nick}</span>)}</div>
    <div className="chip-row"><strong>{t(language, "branches")}</strong>{branches.map((b) => <span className="mini-chip" key={b.id}>{b.nick}</span>)}</div>
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

export function EquationPreview({ equations, language }: Props) {
  if (!equations) return <section className="card equation-preview"><h2>{t(language, "equationPreview")}</h2><p className="muted">{t(language, "formulaPreviewEmpty")}</p></section>;
  const series = rowsToTerms(equations.series);
  const branches = rowsToTerms([...equations.core, ...equations.parallel]);
  const terms = [...branches, ...series];
  return <section className="card equation-preview structured-preview"><h2>{t(language, "equationPreview")}</h2>
    <div className="equation-layout">
      <CircuitCard series={series} branches={branches} language={language} />
      <FormulaCards series={series} branches={branches} language={language} />
      <SolverCard series={series} branches={branches} language={language} />
      <ComponentRows terms={terms} language={language} />
    </div>
  </section>;
}
