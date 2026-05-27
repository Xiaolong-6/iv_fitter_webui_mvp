import type { Language } from "../model/i18n";
type LocalizedText = Record<Language, string>;

function pick(text: LocalizedText, language: Language) {
  return text[language] ?? text.en;
}

const functionLabels: Record<string, LocalizedText> = {
  diode: { en: "Shockley diode", zh: "二极管指数电流" },
  series_diode_barrier: { en: "Diode-like series barrier drop", zh: "类二极管串联势垒压降" },
  softplus_rs_modifier: { en: "Bias-dependent series conductance modifier", zh: "偏压相关串联电导调制" },
  power_law: { en: "Soft-threshold power-law current branch", zh: "软阈值幂律电流支路" },
  soft_breakdown: { en: "Reverse leakage / soft-breakdown current", zh: "反向漏电 / 软击穿电流" },
  photocurrent_constant: { en: "Constant photocurrent", zh: "常数光电流" },
  bias_dependent_current: { en: "Bias-dependent current branch", zh: "偏压相关电流支路" },
  photocurrent_voltage_dependent: { en: "Bias-dependent current branch", zh: "偏压相关电流支路" },
  voltage_dependent_photocurrent: { en: "Bias-dependent current branch", zh: "偏压相关电流支路" },
  custom: { en: "Custom expression law", zh: "自定义表达式定律" },
};

export function localizedFunctionLabel(functionType: string, fallback: string, language: Language) {
  const text = functionLabels[functionType];
  return text ? pick(text, language) : fallback;
}

export const parameterTableText = {
  help: {
    en: "Parameters are grouped by placement and component. After a fit, fitted values are automatically written back as the next initial values. Use Restore initial values to recover the values that were present before the most recent fit.",
    zh: "参数按位置和组件分组。每次拟合完成后，拟合值会自动写回为下一次拟合初值。可用 Restore initial values 恢复最近一次拟合前的初值。",
  },
  restoreToolbar: {
    en: "Parameter restore controls",
    zh: "参数恢复控制",
  },
  restoreInitialValues: {
    en: "Restore initial values",
    zh: "恢复初始值",
  },
  fittedCountSuffix: {
    en: "fitted",
    zh: "参与拟合",
  },
  batchFitAll: {
    en: "Fit all",
    zh: "全部拟合",
  },
  batchFixAll: {
    en: "Fix all",
    zh: "全部固定",
  },
  initial: {
    en: "Initial",
    zh: "初值",
  },
  fitted: {
    en: "Fitted",
    zh: "拟合值",
  },
  lower: {
    en: "Lower",
    zh: "下限",
  },
  upper: {
    en: "Upper",
    zh: "上限",
  },
  fitQuestion: {
    en: "Fit?",
    zh: "拟合?",
  },
  meaningColumn: {
    en: "Information",
    zh: "这个参数在说什么",
  },
  initialTitle: {
    en: "Initial value for next fit",
    zh: "下一次拟合的初始值",
  },
  lowerTitle: {
    en: "Lower bound; blank means unbounded",
    zh: "下边界，空白表示无下限",
  },
  upperTitle: {
    en: "Upper bound; blank means unbounded",
    zh: "上边界，空白表示无上限",
  },
  currentBounds: {
    en: "Current bounds",
    zh: "当前边界",
  },
  polarity: {
    en: "polarity",
    zh: "极性",
  },
  noPolarity: {
    en: "no polarity",
    zh: "无极性",
  },
} satisfies Record<string, LocalizedText>;

export function parameterText(key: keyof typeof parameterTableText, language: Language) {
  return pick(parameterTableText[key], language);
}
