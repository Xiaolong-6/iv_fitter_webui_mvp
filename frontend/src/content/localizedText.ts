import type { Language } from "../model/i18n";
type LocalizedText = Record<Language, string>;

function pick(text: LocalizedText, language: Language) {
  return text[language] ?? text.en;
}

const functionLabels: Record<string, LocalizedText> = {
  diode: { en: "Shockley diode", zh: "二极管指数电流" },
  series_diode_barrier: { en: "Series diode barrier", zh: "串联二极管势垒" },
  softplus_rs_modifier: { en: "Softplus transport modifier", zh: "软开启传输调制" },
  power_law: { en: "Softplus power-law current", zh: "软开启幂律电流" },
  soft_breakdown: { en: "Soft reverse-breakdown current", zh: "软反向击穿电流" },
  photocurrent_constant: { en: "Constant photocurrent", zh: "常数光电流" },
  photocurrent_voltage_dependent: { en: "Voltage-dependent photocurrent", zh: "电压依赖光电流" },
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
  autoSeedNote: {
    en: "Fitted values are auto-seeded as the next initials after each completed fit.",
    zh: "每次拟合完成后，拟合值会自动作为下一次初值。",
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
