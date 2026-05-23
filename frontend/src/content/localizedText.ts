import type { Language } from "../model/i18n";
import type { ParameterFilter } from "../model/parameterGrouping";

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
  photoconductive_branch: { en: "Photoconductive branch", zh: "光致电导支路" },
  photo_modulated_main_path: { en: "Photo-modulated main path", zh: "光调制主路" },
  custom: { en: "Custom expression law", zh: "自定义表达式定律" },
};

export function localizedFunctionLabel(functionType: string, fallback: string, language: Language) {
  const text = functionLabels[functionType];
  return text ? pick(text, language) : fallback;
}

export const parameterFilterLabels: Record<ParameterFilter, LocalizedText> = {
  all: { en: "All", zh: "全部" },
  fitted: { en: "Fitted", zh: "参与拟合" },
  fixed: { en: "Fixed", zh: "固定" },
  changed: { en: "Changed", zh: "已改动" },
  at_bounds: { en: "At bounds", zh: "贴边界" },
  main: { en: "Main path", zh: "主路" },
  branches: { en: "Junction branches", zh: "结点支路" },
};

export function parameterFilterLabel(filter: ParameterFilter, language: Language) {
  return pick(parameterFilterLabels[filter], language);
}

export const parameterTableText = {
  help: {
    en: "Parameters are grouped by placement and component. Edit initials, bounds, and fit/fixed state for the next fit; fitted value shows the previous fit result.",
    zh: "参数按位置和组件分组。这里可以修改下一次拟合使用的初值、边界和 fit/fixed 状态；Fitted value 是上一次拟合结果。",
  },
  noFilterMatch: {
    en: "No parameters match the current filter.",
    zh: "当前筛选没有匹配参数。",
  },
  filterToolbar: {
    en: "Parameter filters",
    zh: "参数筛选",
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
  batchResetInitials: {
    en: "Reset initials",
    zh: "重置初值",
  },
  batchSeedFromFitted: {
    en: "Seed from fitted values",
    zh: "用拟合值作初值",
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
    en: "What it is telling you",
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
