/**
 * Frontend validation for custom law expressions.
 *
 * Validates custom expressions before they are sent to the backend.
 * Returns user-friendly error messages in both English and Chinese.
 */

import type { Language } from "./i18n";

export type ValidationError = {
  en: string;
  zh: string;
};

export type ValidationResult = {
  valid: boolean;
  errors: ValidationError[];
};

// Known backend variables and their user-friendly descriptions
export const CUSTOM_VARIABLES: Record<string, { en: string; zh: string; example: string }> = {
  I: {
    en: "Total device current (A)",
    zh: "总器件电流 (A)",
    example: "I * Rs",
  },
  Vi: {
    en: "Internal junction voltage (V)",
    zh: "内结点电压 (V)",
    example: "Vi / Rsh",
  },
  Vext: {
    en: "Externally applied voltage (V)",
    zh: "外加偏压 (V)",
    example: "Vext",
  },
  absVi: {
    en: "Absolute value of internal junction voltage",
    zh: "内结点电压绝对值",
    example: "A * absVi^m",
  },
  signVi: {
    en: "Sign of internal junction voltage (+1 or -1)",
    zh: "内结点电压符号 (+1 或 -1)",
    example: "A * signVi * Vi^m",
  },
  V: {
    en: "Voltage variable (backend context; prefer Vi or Vext)",
    zh: "电压变量（后端上下文；建议使用 Vi 或 Vext）",
    example: "V",
  },
  absV: {
    en: "Absolute value of voltage (backend context; prefer absVi)",
    zh: "电压绝对值（后端上下文；建议使用 absVi）",
    example: "absV",
  },
  u: {
    en: "Normalized transport argument (backend context)",
    zh: "归一化传输参数（后端上下文）",
    example: "u",
  },
  s: {
    en: "Sign term / polarity factor (backend context)",
    zh: "符号项 / 极性因子（后端上下文）",
    example: "s",
  },
};

// Known safe functions
const SAFE_FUNCTIONS = new Set([
  "abs", "sign", "sqrt", "exp", "log", "ln", "softplus", "max", "min",
  "pow", "sin", "cos", "tan", "asin", "acos", "atan",
]);

// Unsafe characters/patterns
const UNSAFE_PATTERNS = [
  /import\s/i,
  /require\s/i,
  /eval\s*\(/i,
  /function\s*\(/i,
  /=>/,
  /;/,
  /\bclass\b/i,
  /\bnew\b/i,
  /\bthis\b/i,
  /\bwindow\b/i,
  /\bdocument\b/i,
];

/**
 * Validates a custom expression for a given zone (main or branches).
 */
export function validateCustomExpression(
  expression: string,
  zone: "main" | "branches",
  language: Language,
): ValidationResult {
  const errors: ValidationError[] = [];
  const trimmed = expression.trim();

  // Empty expression
  if (!trimmed) {
    errors.push({
      en: "Expression cannot be empty.",
      zh: "表达式不能为空。",
    });
    return { valid: false, errors };
  }

  // Check for unsafe patterns
  for (const pattern of UNSAFE_PATTERNS) {
    if (pattern.test(trimmed)) {
      errors.push({
        en: "Expression contains unsafe code patterns.",
        zh: "表达式包含不安全的代码模式。",
      });
      break;
    }
  }

  // Extract variable names (letters/digits not preceded by backslash)
  const varMatches = trimmed.match(/\b([A-Za-z_]\w*)\b/g) ?? [];
  const uniqueVars = [...new Set(varMatches)];

  // Check for unknown variables
  const knownVars = new Set([...Object.keys(CUSTOM_VARIABLES), "A", "Vt_V", "Vs_V", "m", "I0", "Rs", "Rsh"]);
  for (const v of uniqueVars) {
    if (!knownVars.has(v) && !SAFE_FUNCTIONS.has(v.toLowerCase()) && !/^\d/.test(v)) {
      errors.push({
        en: `Unknown variable or parameter: "${v}". Check the variable legend below.`,
        zh: `未知变量或参数："${v}"。请查看下方变量图例。`,
      });
    }
  }

  // Physical form mismatch warnings
  const usesI = /\bI\b/.test(trimmed) && !/\bI0\b/.test(trimmed) && !/\bVi\b/.test(trimmed);
  const usesVi = /\bVi\b/.test(trimmed) || /\babsVi\b/.test(trimmed) || /\bsignVi\b/.test(trimmed);

  if (zone === "branches" && usesI && !usesVi) {
    errors.push({
      en: "Branch laws normally use Vi (junction voltage) as the primary variable, not I. Did you mean to use Vi?",
      zh: "分支定律通常使用 Vi（结点电压）作为主变量，而不是 I。你是否想使用 Vi？",
    });
  }

  if (zone === "main" && usesVi && !usesI) {
    errors.push({
      en: "Main-path voltage drops normally depend on I (current), not Vi. Did you mean to use I?",
      zh: "主路压降通常依赖于 I（电流），而不是 Vi。你是否想使用 I？",
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Returns the user-facing variable legend for a given zone.
 */
export function variableLegend(
  zone: "main" | "branches",
  language: Language,
): Array<{ symbol: string; description: string }> {
  const vars = zone === "main"
    ? ["I", "Vext", "absVi", "signVi", "V", "absV", "u", "s"]
    : ["Vi", "Vext", "absVi", "signVi", "V", "absV", "u", "s"];

  return vars.map((v) => ({
    symbol: v,
    description: CUSTOM_VARIABLES[v]?.[language === "zh" ? "zh" : "en"] ?? v,
  }));
}

/**
 * Returns the default expression for a given zone.
 */
export function defaultCustomExpression(zone: "main" | "branches"): string {
  return zone === "main" ? "A * I" : "A * Vi";
}

/**
 * Returns the physical law form label for a given zone.
 */
export function physicalFormLabel(zone: "main" | "branches", language: Language): string {
  if (zone === "main") {
    return language === "zh" ? "主路压降：ΔV = f(I)" : "Main-path voltage drop: ΔV = f(I)";
  }
  return language === "zh" ? "支路电流：I = f(Vi)" : "Branch current: I = f(Vi)";
}
