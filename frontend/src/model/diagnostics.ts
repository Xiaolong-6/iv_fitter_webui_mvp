import type { FitResult, ModelSpec, ParameterResult, ParameterSpec, TraceData } from "./types";
import { fmtEng } from "./format";
import type { Language } from "./i18n";

type Severity = "ok" | "warning" | "error";

function percentile(sorted: number[], p: number) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, (sorted.length - 1) * p));
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  const t = idx - lo;
  return sorted[lo] * (1 - t) + sorted[hi] * t;
}

function finiteAbs(values: number[]) {
  return values.filter(Number.isFinite).map((v) => Math.abs(v));
}

function dataScale(values: number[]) {
  const abs = finiteAbs(values).sort((a, b) => a - b);
  return Math.max(percentile(abs, 0.95), 1e-15);
}

function zh(language: Language, english: string, chinese: string) {
  return language === "zh" ? chinese : english;
}

export function componentNickname(model: ModelSpec, componentId: string) {
  const comp = [...model.core, ...model.series, ...model.parallel].find((item) => item.id === componentId);
  return String(comp?.metadata?.nickname ?? componentId);
}

export function parameterMeaning(result: FitResult, key: string, language: Language) {
  const [componentId, rawName] = key.split(".");
  const comp = [...result.model.core, ...result.model.series, ...result.model.parallel].find((item) => item.id === componentId);
  const name = rawName ?? key;
  const value = result.parameters[key]?.value;
  const lower = result.parameters[key]?.lower;
  const upper = result.parameters[key]?.upper;
  const stderr = result.parameters[key]?.stderr;
  const nick = componentNickname(result.model, componentId);

  const notes: string[] = [];
  if (/^n$/i.test(name)) {
    notes.push(zh(language,
      "Ideality factor: near 1 often indicates diffusion-dominated current; near 2 often indicates recombination; values above 2 usually deserve a model/data check.",
      "理想因子：接近 1 常见于扩散主导，接近 2 常见于复合主导；大于 2 通常需要检查模型或数据质量。",
    ));
    if (Number.isFinite(value) && value > 2) {
      notes.push(zh(language, "This fitted value is above 2, so treat the fit as a diagnostic result rather than a final physical claim.", "当前值大于 2，建议先把它当作诊断结果，不要直接作为最终物理结论。"));
    }
  } else if (/I0|I_?0/i.test(name)) {
    notes.push(zh(language,
      "Saturation/current scale. It can span many decades; a poor initial value can make the solver chase an unphysical curve.",
      "饱和电流/电流尺度，可能跨很多数量级；初始值偏太远时，求解器容易跑到不物理的曲线。",
    ));
    if (Number.isFinite(value) && value > 1e-6) notes.push(zh(language, "This is large for many diode-like junctions; verify units, leakage paths, and the selected trace.", "对很多二极管结来说这个值偏大；请确认单位、漏电支路和当前 trace。"));
  } else if (/^Rs|Rs_ohm|R_s/i.test(name) || /^rs$/i.test(nick)) {
    notes.push(zh(language,
      "Series resistance: controls high-current voltage drop and the slope/roll-off at large forward bias.",
      "串联电阻：控制大电流区的压降，以及正向高偏压处的斜率/弯折。",
    ));
  } else if (/Rsh|Rsh_ohm/i.test(name) || /rsh|shunt|leak/i.test(nick)) {
    notes.push(zh(language,
      "Shunt/leakage resistance: controls low-bias leakage. Smaller values mean more leakage current.",
      "并联/漏电电阻：控制低偏压漏电；数值越小，漏电越明显。",
    ));
  } else if (/Vt|Vbr|Vs|w_V/i.test(name)) {
    notes.push(zh(language,
      "Voltage scale or threshold: moves where this empirical branch turns on along the voltage axis.",
      "电压尺度或阈值：决定这个经验支路沿电压轴从哪里开始明显起作用。",
    ));
  } else if (/^A$|scale|amplitude/i.test(name)) {
    notes.push(zh(language,
      "Amplitude/current scale for this branch; compare it with the measured current range before trusting it.",
      "该支路的幅值/电流尺度；可信前应和实测电流范围对照。",
    ));
  } else {
    notes.push(zh(language,
      "Model parameter for this component. Check whether its fitted value is near a bound or has large uncertainty.",
      "该组件的模型参数。重点看它是否贴近边界，或不确定度是否很大。",
    ));
  }

  if (Number.isFinite(value) && ((lower !== null && lower !== undefined && Math.abs(value - lower) <= Math.max(Math.abs(value), 1) * 1e-6) || (upper !== null && upper !== undefined && Math.abs(value - upper) <= Math.max(Math.abs(value), 1) * 1e-6))) {
    notes.push(zh(language, "It is sitting on a bound; widen bounds only if that remains physically reasonable.", "当前值贴近边界；只有在物理上合理时才应放宽边界。"));
  }
  if (Number.isFinite(value) && Number.isFinite(stderr) && stderr !== null && stderr !== undefined && Math.abs(value) > 0 && Math.abs(stderr / value) > 1) {
    notes.push(zh(language, "The uncertainty is larger than the value, so this parameter is weakly identified by the current data/model.", "不确定度大于参数值，说明当前数据/模型对这个参数约束较弱。"));
  }
  return notes.join(" ");
}

export function initialValueGuidance(name: string, spec: ParameterSpec, language: Language) {
  const label = spec.label ?? name;
  if (/I0|I_?0/i.test(name) || /I0/i.test(label)) {
    return zh(language,
      "Initial-value hint: silicon junctions often start near 1e-12 A; wide-bandgap or very low-leakage devices may need 1e-20 A or smaller. If reverse leakage is visible, start near that current scale.",
      "初始值提示：普通硅结可从 1e-12 A 附近开始；宽禁带或极低漏电器件可能需要 1e-20 A 或更小。若反偏漏电明显，可用漏电量级作起点。",
    );
  }
  if (/^n$/i.test(name)) {
    return zh(language, "Typical start: 1 to 2. Values much above 2 often mean the model needs another current path or the data need review.", "典型初始值：1 到 2。明显大于 2 时，常表示模型需要额外电流通道或数据需要复查。");
  }
  if (/Rs_ohm|^Rs$/i.test(name) || /Rs/i.test(label)) {
    return zh(language, "Choose a value that roughly explains the high-current slope; try multistart if this is unknown.", "可按高电流区斜率粗估；若不确定，建议启用 multistart。");
  }
  if (/Rsh|Rsh_ohm/i.test(name) || /Rsh/i.test(label)) {
    return zh(language, "Choose a value close to low-bias V/I leakage resistance; very large values approximate no leakage branch.", "可按低偏压 V/I 漏电电阻粗估；极大值近似无漏电支路。");
  }
  return "";
}

export function fitQualityVerdict(result: FitResult, language: Language): { severity: Severity; title: string; message: string } {
  const errors = result.warnings.filter((w) => w.severity === "error");
  const rmse = result.metrics.linear_rmse_A;
  const logMae = result.metrics.log_magnitude_mae_decades;
  const scale = dataScale(result.curves.current_measured_A);
  const rmseRatio = Number.isFinite(rmse) ? rmse / scale : Infinity;
  const maxFit = Math.max(...finiteAbs(result.curves.current_fit_A), 0);
  const maxMeas = Math.max(...finiteAbs(result.curves.current_measured_A), 0);
  const explosion = maxFit > Math.max(1e3, 1e8 * Math.max(maxMeas, scale));

  if (errors.length || !result.success || explosion || !Number.isFinite(rmse)) {
    return {
      severity: "error",
      title: zh(language, "Not reportable yet", "暂不适合报告"),
      message: zh(language,
        `The fit has numerical/quality issues. RMSE is ${fmtEng(rmse, 4)} A versus a data scale near ${fmtEng(scale, 3)} A; check initial values, bounds, selected trace, and whether the model needs another branch.`,
        `该拟合存在数值或质量问题。RMSE 为 ${fmtEng(rmse, 4)} A，而数据量级约 ${fmtEng(scale, 3)} A；建议检查初始值、边界、当前 trace，以及模型是否缺少支路。`,
      ),
    };
  }
  if (rmseRatio > 0.25 || (Number.isFinite(logMae) && logMae > 0.5)) {
    return {
      severity: "warning",
      title: zh(language, "Converged, but inspect residuals", "已收敛，但需要看残差"),
      message: zh(language,
        `The optimizer converged, but RMSE is still large relative to the current scale. Use the log I-V and residual plots to find the voltage region driving the mismatch.`,
        `优化器已收敛，但 RMSE 相对电流量级仍偏大。请用对数 I-V 和残差图定位主要失配的电压区间。`,
      ),
    };
  }
  return {
    severity: "ok",
    title: zh(language, "Looks numerically plausible", "数值上看起来可信"),
    message: zh(language,
      "The fit passed the current numerical checks. Still review residual structure and whether the parameter values make physical sense before reporting.",
      "该拟合通过了当前数值检查。报告前仍应检查残差结构，并确认参数值在物理上合理。",
    ),
  };
}

export function plotAnomalyMessage(result: FitResult | null, trace: TraceData, language: Language) {
  if (!result) return null;
  const measuredScale = dataScale(trace.current_A);
  const maxFit = Math.max(...finiteAbs(result.curves.current_fit_A), 0);
  const maxResidual = Math.max(...finiteAbs(result.curves.residual_A), 0);
  const nonFinite = [...result.curves.current_fit_A, ...result.curves.residual_A].some((v) => !Number.isFinite(v));
  if (nonFinite || maxFit > Math.max(1e3, 1e8 * measuredScale) || maxResidual > Math.max(1e3, 1e8 * measuredScale)) {
    return zh(language,
      "Current display range is abnormal. The fit or residuals may have numerically diverged; check initial values, bounds, and whether this model can represent the selected trace.",
      "当前显示范围异常。拟合曲线或残差可能发生数值发散；请检查初始值、边界，以及当前模型是否能描述选中的 trace。",
    );
  }
  return null;
}

export function parameterValueRows(model: ModelSpec, result: FitResult | null) {
  const rows: { key: string; label: string; value: ParameterResult | ParameterSpec }[] = [];
  for (const comp of [...model.core, ...model.series, ...model.parallel]) {
    const nick = String(comp.metadata?.nickname ?? comp.id);
    for (const [name, spec] of Object.entries(comp.params)) {
      const key = `${comp.id}.${name}`;
      rows.push({ key, label: `${nick}.${spec.label ?? name}`, value: result?.parameters[key] ?? spec });
    }
  }
  return rows;
}
