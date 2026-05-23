import type { CSSProperties } from "react";

export function renderLatexLite(src: string) {
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
  return <span className={classes} aria-label={label ?? latex} style={style}>
    <span className="latex-rendered" dangerouslySetInnerHTML={{ __html: renderLatexLite(latex) }} />
    <span className="latex-copy">{latex}</span>
  </span>;
}
