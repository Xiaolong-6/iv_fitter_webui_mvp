import type { CSSProperties, ReactNode } from "react";
import { BlockMath, InlineMath } from "react-katex";

export function renderLatexLite(src: string) {
  let s = src;

  // \mathrm{text} → text
  s = s.replace(/\\mathrm\{([^{}]+)\}/g, "$1");

  // \sum, \prod, \int symbols
  s = s.replace(/\\sum/g, "Σ");
  s = s.replace(/\\prod/g, "Π");
  s = s.replace(/\\int/g, "∫");

  // Fractions: handle specific common patterns first, then generic
  const frac = (a: string, b: string) => `<span class="frac"><span>${a}</span><span>${b}</span></span>`;
  s = s.replace(/\\frac\{V_\{ext\}-IR_s\}\{nV_T\}/g, frac("V_ext−IR_s", "nV_T"));
  s = s.replace(/\\frac\{V_\{ext\}-IR_s\}\{R_\{sh\}\}/g, frac("V_ext−IR_s", "R_sh"));
  s = s.replace(/\\frac\{V_j - V_t\}\{V_s\}/g, frac("V_j−V_t", "V_s"));
  s = s.replace(/\\frac\{-V_j - V_\{br\}\}\{V_s\}/g, frac("−V_j−V_br", "V_s"));
  s = s.replace(/\\frac\{V_j\}\{nV_T\}/g, frac("V_j", "nV_T"));
  s = s.replace(/\\frac\{V_j\}\{R_\{sh\}\}/g, frac("V_j", "R_sh"));
  s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '<span class="frac"><span>$1</span><span>$2</span></span>');

  // Remove sizing/spacing commands
  s = s.replace(/\\left|\\right|\\!|\\;|\\,/g, "");

  // Function names
  s = s.replace(/\\operatorname\{softplus\}/g, "softplus");
  s = s.replace(/\\text\{([^{}]+)\}/g, "$1");

  // Greek and special symbols
  s = s.replace(/\\pm/g, "±");
  s = s.replace(/\\Delta/g, "Δ");
  s = s.replace(/\\delta/g, "δ");
  s = s.replace(/\\sigma/g, "σ");
  s = s.replace(/\\exp/g, "exp");
  s = s.replace(/\\ln/g, "ln");
  s = s.replace(/\\log/g, "log");
  s = s.replace(/\\sqrt/g, "√");

  // Subscripts: x_{text} → x<sub>text</sub>, then x_y
  s = s.replace(/([A-Za-z]+)_\{([^{}]+)\}/g, '$1<sub>$2</sub>');
  s = s.replace(/([A-Za-z])_([A-Za-z0-9]+)/g, '$1<sub>$2</sub>');

  // Superscripts: x^{text} → x<sup>text</sup>, then x^y
  s = s.replace(/\^\{([^{}]+)\}/g, '<sup>$1</sup>');
  s = s.replace(/\^([A-Za-z0-9]+)/g, '<sup>$1</sup>');

  // Spacing and multiplication
  s = s.replace(/\\,/g, " ");
  s = s.replace(/\*/g, "·");

  // Clean up any remaining backslashes
  s = s.replace(/\\/g, "");

  return s;
}

function sanitizeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function FormulaError({ latex, inline }: { latex: string; inline: boolean }) {
  const safe = renderLatexLite(latex);
  const Tag = inline ? "span" : "code";
  return <Tag className="latex-fallback" dangerouslySetInnerHTML={{ __html: safe }} />;
}

export function MathFormula({
  latex,
  label,
  inline = false,
  className = "",
  style,
}: {
  latex: string;
  label?: string;
  inline?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const base = inline ? "math-inline" : "latex-card";
  const classes = [base, className].filter(Boolean).join(" ");
  const rendered: ReactNode = inline
    ? <InlineMath math={latex} errorColor="#b91c1c" renderError={() => <FormulaError latex={latex} inline />} />
    : <BlockMath math={latex} errorColor="#b91c1c" renderError={() => <FormulaError latex={latex} inline={false} />} />;
  const Wrapper = inline ? "span" : "div";
  return <Wrapper className={classes} aria-label={label ?? latex} style={style}>
    <span className="latex-rendered katex-formula-rendered">{rendered}</span>
    <code className="latex-copy">{latex}</code>
  </Wrapper>;
}
