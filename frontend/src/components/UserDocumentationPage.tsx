import { useMemo, useState, type ReactNode } from "react";
import type { AppView } from "./WorkflowSidebar";
import type { FunctionDefinition } from "../model/types";
import type { Language } from "../model/i18n";
import { MathFormula } from "./MathFormula";

function ManualSection({ id, title, children, wide = false }: { id: string; title: string; children: ReactNode; wide?: boolean }) {
  return <section id={id} className={wide ? "card doc-card wide-card manual-section" : "card doc-card manual-section"}>
    <h2>{title}</h2>
    {children}
  </section>;
}

function InlineFormula({ latex }: { latex: string }) {
  return <MathFormula latex={latex} inline className="manual-inline-formula" />;
}

function FormulaStack({ formulas }: { formulas: string[] }) {
  return <div className="manual-equations">{formulas.map((latex) => <MathFormula key={latex} latex={latex} className="manual-formula" />)}</div>;
}

function InlineNav({ language }: { language: Language }) {
  const items = language === "zh"
    ? [
      ["solving", "在求什么"],
      ["workflow", "流程"],
      ["data", "数据"],
      ["model", "模型"],
      ["functions", "函数"],
      ["formulas", "公式"],
      ["fitting", "拟合"],
      ["recipes", "流程建议"],
      ["residuals", "残差"],
      ["reportability", "可报告性"],
      ["light-response", "光响应"],
      ["troubleshooting", "排查"],
      ["glossary", "术语"],
    ]
    : [
      ["solving", "What is solved"],
      ["workflow", "Workflow"],
      ["data", "Data"],
      ["model", "Model Builder"],
      ["functions", "Functions"],
      ["formulas", "Formulas"],
      ["fitting", "Fitting"],
      ["recipes", "Recipes"],
      ["residuals", "Residuals"],
      ["reportability", "Reportability"],
      ["light-response", "Light response"],
      ["troubleshooting", "Troubleshooting"],
      ["glossary", "Glossary"],
    ];
  return <div className="manual-toc">{items.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}</div>;
}

type Copy = {
  name: string;
  oneLine: string;
  tags: string[];
  purpose: string;
  suitable: string;
  notSuitable: string;
  curveEffect: string;
  fitAdvice: string;
  parameters: [string, string][];
  formula: string;
  advancedFormula?: string;
};

type FunctionDoc = { lawId: string; en: Copy; zh: Copy };

const FUNCTION_DOCS: FunctionDoc[] = [
  {
    lawId: "shockley_diode",
    en: {
      name: "Shockley diode",
      oneLine: "Branch current from a p-n, barrier, or equivalent junction.",
      tags: ["junction", "forward turn-on", "start simple"],
      purpose: "Models exponential current through a p-n junction, barrier junction, or equivalent junction.",
      suitable: "Low-to-medium forward bias before series resistance, high injection, breakdown, extra channels, or compliance dominate.",
      notSuitable: "High-forward extra conduction, abrupt jumps, strong series limitation, or reverse breakdown.",
      curveEffect: "Sets the exponential slope and apparent turn-on behavior.",
      fitAdvice: "Fit D1 first over a narrow forward range. Add Rs, leakage, or empirical branches only after the residual pattern requires them.",
      parameters: [["I₀", "Current scale."], ["n", "Ideality factor; larger values rise more slowly with voltage."], ["Polarity", "Forward or reverse branch direction."]],
      formula: "I_D=I_0[\\exp(\\frac{V_j}{nV_T})-1]",
    },
    zh: {
      name: "二极管指数电流",
      oneLine: "描述 p-n 结、势垒结或等效结的支路指数电流。",
      tags: ["结电流", "正向开启", "优先起点"],
      purpose: "描述普通 p-n 结、势垒结或等效结的指数型导通电流。",
      suitable: "低到中等正向偏压区，尚未被串联电阻、高注入、击穿、额外导通通道或测量合规限制主导。",
      notSuitable: "高正向额外导通、跳变、强串联限制或反向击穿区。",
      curveEffect: "决定指数斜率和表观开启行为。",
      fitAdvice: "先在窄正向范围拟合 D1。只有残差明确需要时，再加入 Rs、漏电或经验支路。",
      parameters: [["I₀", "电流尺度。"], ["n", "理想因子；越大表示电流随电压上升越慢。"], ["极性", "正向或反向支路方向。"]],
      formula: "I_D=I_0[\\exp(\\frac{V_j}{nV_T})-1]",
    },
  },
  {
    lawId: "shockley_diode_series",
    en: {
      name: "Series diode barrier",
      oneLine: "Main-path voltage drop from a diode-like contact or injection barrier.",
      tags: ["main path", "barrier", "advanced"],
      purpose: "Represents a diode-like barrier in the main current path rather than an independent branch current.",
      suitable: "A contact, injection barrier, or back-to-back junction acts as a transport bottleneck.",
      notSuitable: "An ordinary parallel junction current; use a branch diode for that role.",
      curveEffect: "Adds nonlinear voltage drop, shifts apparent turn-on, and can limit transport without adding a branch.",
      fitAdvice: "Advanced term. Compare against simpler Rs plus branch-diode models before freeing extra parameters.",
      parameters: [["I₀", "Barrier current scale."], ["n", "Controls voltage-drop growth."], ["Polarity", "Current direction mainly resisted."]],
      formula: "V_{drop}=nV_T\\ln(|I|/I_0+1)",
    },
    zh: {
      name: "串联二极管势垒",
      oneLine: "主路中由接触或注入势垒产生的二极管式压降。",
      tags: ["主路", "势垒", "高级"],
      purpose: "描述主电流路径中的二极管式势垒，而不是独立并联电流支路。",
      suitable: "接触、注入势垒或背靠背结表现为串联传输瓶颈。",
      notSuitable: "普通并联结电流；这种情况应使用支路二极管。",
      curveEffect: "增加非线性压降，改变表观开启，并可能限制传输。",
      fitAdvice: "高级项。先与更简单的 Rs 加支路二极管模型比较，再释放额外参数。",
      parameters: [["I₀", "势垒电流尺度。"], ["n", "控制压降增长。"], ["极性", "主要阻碍的电流方向。"]],
      formula: "V_{drop}=nV_T\\ln(|I|/I_0+1)",
    },
  },
  {
    lawId: "ohmic",
    en: {
      name: "Ohmic resistance",
      oneLine: "Linear resistance used as a main-path drop or leakage branch.",
      tags: ["series resistance", "leakage", "linear"],
      purpose: "Describes linear resistance. Rs and Rsh are nicknames for the same law in different roles.",
      suitable: "Main path for contact, wire, conductive-layer, or channel resistance; branch for leakage or bypass current.",
      notSuitable: "Do not use a main-path resistance to represent an added parallel current, or a branch resistance to explain high-current voltage drop.",
      curveEffect: "Main-path Ohmic bends high-current behavior; branch Ohmic changes low-bias or reverse leakage background.",
      fitAdvice: "Use Rs for high-current roll-off. Use Rsh for nearly linear leakage in low-current or reverse-bias regions.",
      parameters: [["R", "Resistance value."], ["Nickname", "Usually Rs in the main path and Rsh as a branch."]],
      formula: "V_{drop}=IR_s",
      advancedFormula: "I_{leak}=\\frac{V_j}{R_{sh}}",
    },
    zh: {
      name: "欧姆电阻",
      oneLine: "可作为主路压降或漏电支路的线性电阻。",
      tags: ["串联电阻", "漏电", "线性"],
      purpose: "描述线性电阻。Rs 和 Rsh 是同一数学关系在不同角色下的昵称。",
      suitable: "主路中用于接触、导线、导电层或通道电阻；支路中用于漏电或旁路电流。",
      notSuitable: "不要用主路电阻表示新增并联电流，也不要用支路电阻解释高电流主路压降。",
      curveEffect: "主路 Ohmic 影响高电流弯折；支路 Ohmic 改变低偏压或反向漏电背景。",
      fitAdvice: "高电流 roll-off 用 Rs。低电流或反向区近似线性漏电用 Rsh。",
      parameters: [["R", "电阻值。"], ["昵称", "主路常叫 Rs，支路常叫 Rsh。"]],
      formula: "V_{drop}=IR_s",
      advancedFormula: "I_{leak}=\\frac{V_j}{R_{sh}}",
    },
  },
  {
    lawId: "softplus_conductance_modifier",
    en: {
      name: "Bias-dependent conductance modifier",
      oneLine: "Softly changes main-path conductance with bias.",
      tags: ["main path", "high bias", "soft threshold"],
      purpose: "Models a main transport path whose conductance changes with bias.",
      suitable: "High-bias slope change or soft threshold in the main path that simple Rs cannot describe.",
      notSuitable: "If the missing behavior is an additional parallel current, use a branch law instead.",
      curveEffect: "Changes high-current slope and curvature through the main-path voltage drop.",
      fitAdvice: "Use only after a simpler Rs model is inadequate. Keep shape parameters fixed unless residuals require them.",
      parameters: [["A", "Modulation strength."], ["Vt", "Onset voltage."], ["Vs", "Softness."], ["shape", "Optional exponent/shape terms."]],
      formula: "R_{eff}=R_{base}/[1+A\\,\\operatorname{softplus}(\\frac{V_j-V_t}{V_s})]",
    },
    zh: {
      name: "偏压相关主路电导调制",
      oneLine: "随偏压软开启地改变主路电导。",
      tags: ["主路", "高偏压", "软阈值"],
      purpose: "描述主路传输随偏压改变，例如通道、接触或传输路径软开启。",
      suitable: "高偏压区出现普通 Rs 无法描述的斜率变化或软阈值。",
      notSuitable: "如果缺失行为是新增并联电流，应使用支路电流关系。",
      curveEffect: "通过主路压降改变高电流区斜率和曲率。",
      fitAdvice: "只有简单 Rs 不够时再用。形状参数默认固定，除非残差明确需要。",
      parameters: [["A", "调制强度。"], ["Vt", "开启电压。"], ["Vs", "软开启宽度。"], ["形状", "可选指数或形状参数。"]],
      formula: "R_{eff}=R_{base}/[1+A\\,\\operatorname{softplus}(\\frac{V_j-V_t}{V_s})]",
    },
  },
  {
    lawId: "softplus_power_law_voltage_drop",
    en: {
      name: "Softplus power-law voltage drop",
      oneLine: "Empirical main-path voltage loss that softly turns on with current.",
      tags: ["main path", "voltage drop", "high current"],
      purpose: "Models an extra current-activated voltage drop in the main path when a constant Rs is too simple.",
      suitable: "High-current roll-off or transport loss that behaves like an additional main-path voltage loss.",
      notSuitable: "If the missing behavior is an added parallel current, use the branch softplus power-law current instead.",
      curveEffect: "Consumes more external voltage near and above the current threshold, reducing the voltage seen by junction branches.",
      fitAdvice: "Use after Rs is inadequate. Keep current threshold and softness bounded to avoid overfitting.",
      parameters: [["A_V", "Voltage-drop scale."], ["It", "Turn-on current."], ["Is", "Softness current."], ["m", "Growth exponent."], ["Polarity", "Current direction."]],
      formula: "V_{drop}=\\pm A_V\\,\\operatorname{softplus}(\\frac{\\pm I-I_t}{I_s})^m",
    },
    zh: {
      name: "Softplus power-law voltage drop",
      oneLine: "Empirical main-path voltage loss that softly turns on with current.",
      tags: ["main path", "voltage drop", "high current"],
      purpose: "Models an extra current-activated voltage drop in the main path when a constant Rs is too simple.",
      suitable: "Use for high-current roll-off that behaves like an additional main-path voltage loss.",
      notSuitable: "If the missing behavior is an added parallel current, use the branch softplus power-law current instead.",
      curveEffect: "Consumes more external voltage near and above the current threshold.",
      fitAdvice: "Use after Rs is inadequate. Keep current threshold and softness bounded.",
      parameters: [["A_V", "Voltage-drop scale."], ["It", "Turn-on current."], ["Is", "Softness current."], ["m", "Growth exponent."], ["Polarity", "Current direction."]],
      formula: "V_{drop}=\\pm A_V\\,\\operatorname{softplus}(\\frac{\\pm I-I_t}{I_s})^m",
    },
  },
  {
    lawId: "softplus_power_law_current",
    en: {
      name: "Softplus power-law current",
      oneLine: "Empirical extra current branch that softly turns on at high bias.",
      tags: ["extra branch", "threshold-like", "high bias"],
      purpose: "Models an additional empirical current path such as non-ideal, trap-assisted, or threshold-like conduction.",
      suitable: "A clear extra current appears after a threshold and behaves like a branch contribution.",
      notSuitable: "If high-current behavior is simply series-limited, use main-path Rs first.",
      curveEffect: "Adds current near and above threshold, making the high-bias curve turn upward or softly open.",
      fitAdvice: "Use after diode/Rs/Rsh fail. Keep bounds physically meaningful and inspect residuals for overfitting.",
      parameters: [["A", "Current scale."], ["Vt", "Turn-on voltage."], ["Vs", "Softness."], ["m", "Growth exponent."], ["Polarity", "Bias direction."]],
      formula: "I_{extra}=\\pm A\\,\\operatorname{softplus}(\\frac{\\pm V_j-V_t}{V_s})^m",
    },
    zh: {
      name: "高偏压额外导通支路",
      oneLine: "在高偏压下软开启的经验电流支路。",
      tags: ["额外支路", "阈值型", "高偏压"],
      purpose: "描述非理想导通、陷阱辅助导通或阈值型导通等额外经验电流通道。",
      suitable: "某偏压后出现明显额外电流，且表现为支路贡献。",
      notSuitable: "如果高电流区只是串联限制，应先用主路 Rs。",
      curveEffect: "阈值附近开始增加额外电流，使高偏压曲线上翘或软开启。",
      fitAdvice: "简单 diode/Rs/Rsh 不足后再用；保持物理合理边界并检查过拟合。",
      parameters: [["A", "电流尺度。"], ["Vt", "开启电压。"], ["Vs", "软开启宽度。"], ["m", "增长指数。"], ["极性", "作用偏压方向。"]],
      formula: "I_{extra}=\\pm A\\,\\operatorname{softplus}(\\frac{\\pm V_j-V_t}{V_s})^m",
    },
  },
  {
    lawId: "soft_reverse_breakdown_current",
    en: {
      name: "Smooth reverse breakdown",
      oneLine: "Reverse-bias leakage or soft breakdown onset.",
      tags: ["reverse bias", "leakage", "breakdown"],
      purpose: "Models reverse-bias leakage or soft breakdown that gradually turns on.",
      suitable: "Reverse data show a repeatable current increase near an onset voltage.",
      notSuitable: "Linear leakage should use branch Ohmic. Noisy reverse data without an onset should not get a breakdown term early.",
      curveEffect: "Increases high-magnitude reverse current after onset.",
      fitAdvice: "Fit the reverse range deliberately. Keep parameters fixed or tightly bounded when the onset is weak.",
      parameters: [["I₀", "Current scale."], ["VBR", "Onset voltage."], ["Vslope", "Exponential slope."], ["w", "Smooth width."]],
      formula: "I_{BR}=-I_0[\\exp(\\frac{|V_j|-V_{BR}}{V_{slope}})-1]S(\\frac{|V_j|-V_{BR}}{w})",
    },
    zh: {
      name: "平滑反向击穿或漏电开启",
      oneLine: "反向偏压下逐渐开启的漏电或软击穿电流。",
      tags: ["反向偏压", "漏电", "击穿"],
      purpose: "描述反向偏压下逐渐开启的漏电或软击穿电流。",
      suitable: "反向区某个电压附近出现可重复电流增加，但不是硬阶跃。",
      notSuitable: "线性漏电用支路 Ohmic。无明显开启的噪声数据不要过早加入击穿项。",
      curveEffect: "主要增加反向高电压区电流。",
      fitAdvice: "有意识选择反向范围；开启不强时固定或收紧边界。",
      parameters: [["I₀", "电流尺度。"], ["VBR", "开启电压。"], ["Vslope", "指数斜率。"], ["w", "平滑宽度。"]],
      formula: "I_{BR}=-I_0[\\exp(\\frac{|V_j|-V_{BR}}{V_{slope}})-1]S(\\frac{|V_j|-V_{BR}}{w})",
    },
  },
  {
    lawId: "photocurrent_constant",
    en: {
      name: "Constant photocurrent",
      oneLine: "Bias-independent light-generated current source.",
      tags: ["light response", "photodiode", "first approximation"],
      purpose: "Models photocurrent that is approximately independent of bias.",
      suitable: "Light-dark difference is nearly constant over the selected voltage range.",
      notSuitable: "Strongly bias-dependent light response, threshold-like response, or high-current slope change.",
      curveEffect: "Shifts the light I-V curve up or down relative to the dark curve.",
      fitAdvice: "Fit the dark trace first; then fix or seed dark parameters and add this term to the light trace.",
      parameters: [["Iph0", "Photocurrent magnitude."], ["Direction", "Sign convention and wiring direction."]],
      formula: "I_{ph}=\\pm I_{ph0}",
    },
    zh: {
      name: "常数光电流",
      oneLine: "近似不随偏压变化的光生电流。",
      tags: ["光响应", "光电二极管", "第一近似"],
      purpose: "描述近似不随偏压变化的光生电流。",
      suitable: "light-dark 差值在选定电压范围内近似为常数。",
      notSuitable: "光响应强烈依赖偏压、在阈值附近开启或明显改变高电流斜率。",
      curveEffect: "使光照 I-V 相对暗态曲线上下平移。",
      fitAdvice: "先拟合暗态；再固定或继承暗态参数，并在光照 trace 中加入该项。",
      parameters: [["Iph0", "光电流大小。"], ["方向", "由软件符号约定和接线决定。"]],
      formula: "I_{ph}=\\pm I_{ph0}",
    },
  },
  {
    lawId: "photocurrent_voltage_dependent",
    en: {
      name: "Voltage-dependent photocurrent",
      oneLine: "Photocurrent that changes with junction voltage.",
      tags: ["light response", "field-assisted", "photogain"],
      purpose: "Models bias-dependent photocurrent such as field-assisted collection, trap-assisted gain, photoconductive gain, or sub-bandgap response.",
      suitable: "Light-dark difference strengthens, saturates, or rises after a threshold.",
      notSuitable: "Sparse, noisy, or weak light-dark differences can overfit; try simpler light terms first.",
      curveEffect: "Makes light-generated current bias-dependent instead of a simple shift.",
      fitAdvice: "Fit dark first. In light data, free base magnitude and linear gain first; keep threshold terms fixed unless residuals demand them.",
      parameters: [["Iph0", "Base photocurrent."], ["gain", "Linear bias enhancement."], ["Aph", "Threshold scale."], ["Vt, Vs, m", "Threshold location, softness, and growth."], ["Direction", "Photocurrent direction."]],
      formula: "I_{ph}(V_j)=\\pm I_{ph0}(1+a|V_j|)",
      advancedFormula: "I_{ph}(V_j)=\\pm[I_{ph0}(1+a|V_j|)+A_{ph}\\operatorname{softplus}(\\frac{|V_j|-V_{t,ph}}{V_{s,ph}})^{m_{ph}}]",
    },
    zh: {
      name: "电压依赖光电流",
      oneLine: "随结点电压变化的光生电流。",
      tags: ["光响应", "场辅助", "光增益"],
      purpose: "描述电场辅助收集、陷阱辅助增益、光电导增益或 sub-bandgap 光响应等偏压相关光电流。",
      suitable: "light-dark 差值随电压增强、饱和或阈值后快速增加。",
      notSuitable: "数据少、噪声大或差异弱时容易过拟合，应先用更简单的光响应项。",
      curveEffect: "让光生电流随偏压改变，而不只是整体平移。",
      fitAdvice: "先拟合暗态。光照数据中先释放基础大小和线性增益；阈值项只有残差需要时再释放。",
      parameters: [["Iph0", "基础光电流。"], ["gain", "线性偏压增强。"], ["Aph", "阈值项尺度。"], ["Vt, Vs, m", "阈值位置、软开启宽度和增长指数。"], ["方向", "光电流方向。"]],
      formula: "I_{ph}(V_j)=\\pm I_{ph0}(1+a|V_j|)",
      advancedFormula: "I_{ph}(V_j)=\\pm[I_{ph0}(1+a|V_j|)+A_{ph}\\operatorname{softplus}(\\frac{|V_j|-V_{t,ph}}{V_{s,ph}})^{m_{ph}}]",
    },
  },
  {
    lawId: "custom_expression",
    en: {
      name: "User-defined relation",
      oneLine: "Advanced custom expression for testing a new empirical model.",
      tags: ["advanced", "experimental", "custom"],
      purpose: "Lets advanced users test an empirical relation not yet built in.",
      suitable: "Exploring a new empirical relation or temporarily checking a hypothesis.",
      notSuitable: "Routine fitting, final reporting, or model stacks without a clear physical explanation.",
      curveEffect: "Depends entirely on the supplied expression and remains exploratory until documented and validated.",
      fitAdvice: "Record the full expression and parameter definitions in any report. Prefer built-in laws when possible.",
      parameters: [["Expression", "User-supplied relation."], ["User parameters", "Definitions required for reproducibility."]],
      formula: "\\text{User-defined expression}",
    },
    zh: {
      name: "自定义数学关系",
      oneLine: "用于测试新经验模型的高级自定义表达式。",
      tags: ["高级", "实验性", "自定义"],
      purpose: "给高级用户测试尚未内置的经验关系。",
      suitable: "探索新经验模型或临时验证假设。",
      notSuitable: "普通拟合流程、最终报告或无明确物理解释的模型堆叠。",
      curveEffect: "完全取决于用户表达式，记录和验证前都应视为探索性。",
      fitAdvice: "报告中必须记录完整表达式和参数定义。能用内置项时优先内置项。",
      parameters: [["Expression", "用户表达式。"], ["用户参数", "为可复现性必须定义。"]],
      formula: "\\text{User-defined expression}",
    },
  },
];

function AdvancedFunctionDetails({ lawId, registry, language }: { lawId: string; registry: FunctionDefinition[]; language: Language }) {
  const items = registry.filter((item) => item.law_id === lawId || (lawId === "shockley_diode_series" && item.function_type === "series_diode_barrier"));
  if (!items.length) return <p className="muted">{language === "zh" ? "当前函数库未加载此项。" : "This item is not currently loaded from the backend registry."}</p>;
  const forms = Array.from(new Set(items.flatMap((item) => item.available_forms))).join(" / ");
  const placements = Array.from(new Set(items.flatMap((item) => item.allowed_placements))).join(" / ");
  const keys = Array.from(new Set(items.flatMap((item) => item.parameters.map((p) => p.name)))).join(", ");
  return <div className="manual-advanced-grid">
    <div><strong>law_id</strong><code>{lawId}</code></div>
    <div><strong>supported forms</strong><code>{forms}</code></div>
    <div><strong>allowed placements</strong><code>{placements}</code></div>
    <div><strong>internal parameter keys</strong><code>{keys}</code></div>
    <div><strong>serialization / export</strong><code>{items.map((item) => item.function_type).join("; ")}</code></div>
  </div>;
}

function FunctionDocCard({ doc, registry, language }: { doc: FunctionDoc; registry: FunctionDefinition[]; language: Language }) {
  const t = language === "zh" ? doc.zh : doc.en;
  const usesSoftplus = `${t.formula} ${t.advancedFormula ?? ""}`.includes("\\operatorname{softplus}");
  return <article className="manual-law-card user-law-card">
    <header className="manual-law-header">
      <div><h3>{t.name}</h3><p>{t.oneLine}</p></div>
      <div className="manual-law-tags">{t.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
    </header>
    <div className="manual-law-user-grid">
      <section><h4>{language === "zh" ? "用途" : "Purpose"}</h4><p>{t.purpose}</p></section>
      <section><h4>{language === "zh" ? "适合" : "Use when"}</h4><p>{t.suitable}</p></section>
      <section><h4>{language === "zh" ? "不适合" : "Not suitable"}</h4><p>{t.notSuitable}</p></section>
      <section><h4>{language === "zh" ? "曲线影响" : "Curve effect"}</h4><p>{t.curveEffect}</p></section>
    </div>
    <section className="manual-parameter-table"><h4>{language === "zh" ? "参数" : "Parameters"}</h4><div>{t.parameters.map(([name, meaning]) => <div className="manual-parameter-row" key={name}><span>{name}</span><p>{meaning}</p></div>)}</div></section>
    <section className="manual-fit-advice"><h4>{language === "zh" ? "拟合建议" : "Fit advice"}</h4><p>{t.fitAdvice}</p></section>
    <section className="manual-formula-view"><h4>{language === "zh" ? "公式" : "Formula"}</h4><MathFormula latex={t.formula} className="manual-formula" />{usesSoftplus ? <div className="manual-softplus-note"><strong>{language === "zh" ? "Softplus 定义：" : "Softplus definition:"}</strong> <InlineFormula latex="\\operatorname{softplus}(x)=\\ln(1+\\exp(x))" />. {language === "zh" ? "它是平滑阈值函数：低于阈值时接近零，高于阈值后近似线性增长。" : "It is a smooth threshold function: close to zero below the threshold and almost linear above it."}</div> : null}{t.advancedFormula ? <details className="manual-advanced-formula"><summary>{language === "zh" ? "高级公式" : "Advanced formula"}</summary><MathFormula latex={t.advancedFormula} className="manual-formula" /></details> : null}</section>
    <details className="manual-advanced-details"><summary>{language === "zh" ? "高级细节" : "Advanced details"}</summary><AdvancedFunctionDetails lawId={doc.lawId} registry={registry} language={language} /></details>
  </article>;
}

function RegistryGuide({ registry, language }: { registry: FunctionDefinition[]; language: Language }) {
  const [selectedLawId, setSelectedLawId] = useState(FUNCTION_DOCS[0]?.lawId ?? "");
  const selected = FUNCTION_DOCS.find((doc) => doc.lawId === selectedLawId) ?? FUNCTION_DOCS[0];
  return <div className="manual-function-reader">
    <nav className="manual-function-list" aria-label={language === "zh" ? "函数列表" : "Function list"}>
      {FUNCTION_DOCS.map((doc) => {
        const t = language === "zh" ? doc.zh : doc.en;
        return <button
          key={doc.lawId}
          type="button"
          className={doc.lawId === selected.lawId ? "active" : ""}
          onClick={() => setSelectedLawId(doc.lawId)}
        >
          <strong>{t.name}</strong>
          <span>{t.oneLine}</span>
        </button>;
      })}
    </nav>
    <div className="manual-function-detail">
      <FunctionDocCard doc={selected} registry={registry} language={language} />
    </div>
  </div>;
}

type Step = { n: string; title: string; text: string };
type Row = [string, string, string];

function StepCards({ steps }: { steps: Step[] }) {
  return <div className="manual-step-cards">{steps.map((step) => <article key={step.n} className="manual-step-card"><span>{step.n}</span><h3>{step.title}</h3><p>{step.text}</p></article>)}</div>;
}

function ThreeColumnTable({ rows, headers }: { rows: Row[]; headers: [string, string, string] }) {
  return <div className="manual-table three-col"><div className="manual-table-head">{headers.map((h) => <strong key={h}>{h}</strong>)}</div>{rows.map((row) => <div className="manual-table-row" key={row.join("|")}>{row.map((cell) => <p key={cell}>{cell}</p>)}</div>)}</div>;
}

const englishSteps: Step[] = [
  { n: "1", title: "Import data", text: "Use CSV/TXT/DAT, pasted tables, HappyMeasure exports, or a generated synthetic trace. The app starts blank; Run fit stays disabled and Import data is the primary action until a trace is loaded." },
  { n: "2", title: "Select one trace", text: "Fitting, residuals, plots, and reports refer only to the selected trace. Multi-trace files are not silently merged." },
  { n: "3", title: "Inspect raw data", text: "Confirm columns, sign convention, point count, outliers, and trace identity before fitting." },
  { n: "4", title: "Start simple", text: "Use the smallest defensible model before adding empirical terms." },
  { n: "5", title: "Set initials and bounds", text: "Initial values define the starting point; bounds define the physically allowed region." },
  { n: "6", title: "Fit and diagnose", text: "Read status badges, diagnostics, residuals, plots, and parameter explanations together." },
  { n: "7", title: "Export after review", text: "Check selected trace, model, parameters, diagnostics, software version, and reportability." },
];

const chineseSteps: Step[] = [
  { n: "1", title: "导入数据", text: "使用 CSV/TXT/DAT、粘贴表格、HappyMeasure 导出或生成 synthetic trace。应用默认空白启动；没有 trace 时 Run fit 保持禁用，Import data 是主操作。" },
  { n: "2", title: "选择一条 trace", text: "拟合、残差、图表和报告都只对应选中 trace；多 trace 文件不会被偷偷合并。" },
  { n: "3", title: "检查原始数据", text: "确认列、符号、点数、异常点和 trace 身份。" },
  { n: "4", title: "从简单模型开始", text: "先用最小且物理上可辩护的模型，再根据残差加经验项。" },
  { n: "5", title: "设置初值和边界", text: "初值决定优化从哪里开始，边界决定物理允许范围。" },
  { n: "6", title: "拟合并诊断", text: "一起看状态徽标、diagnostics、残差、图和参数解释。" },
  { n: "7", title: "确认后导出", text: "检查选中 trace、模型、参数、diagnostics、软件版本和可报告性。" },
];


type ManualSectionKey =
  | "solving"
  | "workflow"
  | "data"
  | "model"
  | "law-form-placement"
  | "functions"
  | "formulas"
  | "fitting"
  | "recipes"
  | "residuals"
  | "reportability"
  | "light-response"
  | "troubleshooting"
  | "glossary";

const sectionLabels: Record<Language, Array<{ id: ManualSectionKey; label: string; short: string }>> = {
  en: [
    { id: "solving", label: "What IV-fitter solves", short: "Solve" },
    { id: "workflow", label: "Basic workflow", short: "Workflow" },
    { id: "data", label: "Data and trace selection", short: "Data" },
    { id: "model", label: "Model Builder concepts", short: "Model" },
    { id: "law-form-placement", label: "Law, form, and placement", short: "Law/Form" },
    { id: "functions", label: "Function guide", short: "Functions" },
    { id: "formulas", label: "Formula assembly", short: "Formulas" },
    { id: "fitting", label: "How fitting works", short: "Fitting" },
    { id: "recipes", label: "Recommended recipes", short: "Recipes" },
    { id: "residuals", label: "Plots and residuals", short: "Residuals" },
    { id: "reportability", label: "Diagnostics and reportability", short: "Report" },
    { id: "light-response", label: "Light-response modeling", short: "Light" },
    { id: "troubleshooting", label: "Troubleshooting", short: "Trouble" },
    { id: "glossary", label: "Glossary", short: "Glossary" },
  ],
  zh: [
    { id: "solving", label: "IV-fitter 在求什么", short: "求解" },
    { id: "workflow", label: "基本工作流程", short: "流程" },
    { id: "data", label: "数据与 trace 选择", short: "数据" },
    { id: "model", label: "Model Builder 概念", short: "模型" },
    { id: "law-form-placement", label: "Law、form 与 placement", short: "Law/Form" },
    { id: "functions", label: "函数说明", short: "函数" },
    { id: "formulas", label: "公式如何组装", short: "公式" },
    { id: "fitting", label: "拟合如何进行", short: "拟合" },
    { id: "recipes", label: "推荐拟合流程", short: "流程建议" },
    { id: "residuals", label: "图和残差", short: "残差" },
    { id: "reportability", label: "Diagnostics 与可报告性", short: "可报告" },
    { id: "light-response", label: "光响应建模", short: "光响应" },
    { id: "troubleshooting", label: "常见问题排查", short: "排查" },
    { id: "glossary", label: "术语表", short: "术语" },
  ],
};

function SectionNavigator({
  language,
  active,
  onSelect,
}: {
  language: Language;
  active: ManualSectionKey;
  onSelect: (id: ManualSectionKey) => void;
}) {
  const items = sectionLabels[language];
  return <aside className="manual-reader-nav" aria-label={language === "zh" ? "手册章节" : "Manual sections"}>
    <div className="manual-reader-nav-title">{language === "zh" ? "章节" : "Sections"}</div>
    {items.map((item) => <button
      key={item.id}
      type="button"
      className={active === item.id ? "active" : ""}
      onClick={() => onSelect(item.id)}
      title={item.label}
    >
      <span>{item.short}</span>
      <small>{item.label}</small>
    </button>)}
  </aside>;
}

function ManualReader({ registry, appVersion, language }: { registry: FunctionDefinition[]; appVersion: string; language: Language }) {
  const [active, setActive] = useState<ManualSectionKey>("solving");
  const labels = sectionLabels[language];
  const activeLabel = labels.find((item) => item.id === active)?.label ?? labels[0].label;
  return <div className="manual-reader">
    <div className="card doc-hero manual-hero">
      <div>
        <h2>{language === "zh" ? "IV-fitter Web 用户手册" : "IV-fitter Web User Manual"}</h2>
        <p className="muted">{language === "zh"
          ? `v${appVersion} 导航式教程：一次只显示当前章节，避免长卷轴。`
          : `Navigation-style tutorial for v${appVersion}: one section at a time, without a long scroll wall.`}</p>
      </div>
      <select className="manual-section-select" value={active} onChange={(e) => setActive(e.target.value as ManualSectionKey)} title={language === "zh" ? "选择手册章节" : "Select manual section"}>
        {labels.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
      </select>
    </div>
    <div className="manual-reader-shell">
      <SectionNavigator language={language} active={active} onSelect={setActive} />
      <main className="manual-reader-content">
        <div className="manual-reader-heading">
          <span>{language === "zh" ? "当前章节" : "Current section"}</span>
          <h2>{activeLabel}</h2>
        </div>
        {renderManualSection(active, registry, language)}
      </main>
    </div>
  </div>;
}

function renderManualSection(section: ManualSectionKey, registry: FunctionDefinition[], language: Language) {
  const zh = language === "zh";
  switch (section) {
    case "solving":
      return <ManualSection id="solving" title={zh ? "1. IV-fitter 在求什么" : "1. What IV-fitter is solving"} wide>
        {zh ? <>
          <p>IV-fitter 把 I-V 曲线看成自洽电路拟合问题，而不是把一个固定闭式公式硬套到数据上。实验给出外部电压；内部结点电压通常未知，因为主路元件会消耗一部分电压。支路电流在内部结点电压下计算并求和。</p>
          <FormulaStack formulas={["V_{ext}=V_j+\\Delta V_{series}(I,V_j;\\theta)", "I=\\sum_k I_k(V_j;\\theta)"]} />
          <div className="manual-keyidea"><strong>核心概念：</strong>主路决定支路看到的内部电压；支路在该电压下产生电流；拟合器反复改变参数、逐点求解自洽电路并最小化加权残差。</div>
        </> : <>
          <p>IV-fitter treats an I-V curve as a self-consistent circuit-fitting problem, not as one fixed closed-form equation. The measured external voltage is known. The internal junction voltage is generally unknown because main-path elements can consume part of the applied voltage. Branch currents are evaluated at that internal voltage and summed.</p>
          <FormulaStack formulas={["V_{ext}=V_j+\\Delta V_{series}(I,V_j;\\theta)", "I=\\sum_k I_k(V_j;\\theta)"]} />
          <div className="manual-keyidea"><strong>Key idea:</strong> main path controls the internal voltage seen by branches; branches generate current at that voltage; fitting repeatedly changes parameters, solves the self-consistent circuit at every voltage point, and minimizes the weighted residual.</div>
        </>}
      </ManualSection>;
    case "workflow":
      return <ManualSection id="workflow" title={zh ? "2. 基本工作流程" : "2. Basic workflow"} wide>
        <StepCards steps={zh ? chineseSteps : englishSteps} />
        <p className="warning info">{zh ? <><strong>收敛警告：</strong>优化器 success 只说明数值算法正常停止，不证明模型唯一、物理正确或可以报告。</> : <><strong>Convergence warning:</strong> optimizer success means the numerical algorithm stopped normally. It does not prove that the model is unique, physically meaningful, or reportable.</>}</p>
      </ManualSection>;
    case "data":
      return <ManualSection id="data" title={zh ? "3. 数据导入与 trace 选择" : "3. Data import and trace selection"}>
        {zh ? <>
          <p>Data 页负责导入和检查原始数据；Workspace 负责建模和拟合。数据导入正确不代表模型正确，拟合看起来不错也不能弥补选错 trace。</p>
          <ul className="doc-steps"><li>支持 CSV/TXT/DAT、粘贴表格、普通 voltage/current 列，以及 HappyMeasure 单 trace 或多 trace 导出。</li><li>列识别是启发式的，必须在预览表中确认单位和符号。</li><li>多 trace 文件保留每条 trace 身份；当前拟合只使用选中 trace。</li><li>检查缺失行、重复电压点、compliance 平台、仪器限制和接线/符号反转。</li></ul>
          <h3>Synthetic data generator</h3>
          <p>Synthetic IV Trace 使用当前 Model Builder 模型和当前参数值正向模拟 I(V) 数据。设置电压起点、终点和步长，可选加入高斯绝对电流噪声、高斯相对电流噪声、随机种子和电流 compliance clipping。生成的 trace 会进入普通 trace 列表，并在 metadata 中保存真值参数和生成设置。干净 synthetic trace 使用与拟合同一套 backend prediction path；如果 metadata 说明没有加入 compliance artifact，拟合时会跳过通用 compliance 排除。它用于测试 fitting/debug workflow 和参数恢复，不证明同一模型对真实器件物理正确。需要回到生成参数时，可在 Parameters 使用 Seed from synthetic ground truth。</p>
        </> : <>
          <p>The Data page is for importing and checking raw data. The Workspace page is for model construction and fitting. Keep these tasks separate: a clean import does not imply a clean physical model, and a good-looking fit does not fix a wrong trace selection.</p>
          <ul className="doc-steps"><li>Supported input: CSV/TXT/DAT, pasted tables, generic voltage/current columns, and HappyMeasure single- or multi-trace exports.</li><li>Column detection is heuristic. Always verify units and sign convention in the preview table.</li><li>Multi-trace files preserve trace identity. Fit only the selected trace unless a future joint-fit workflow is explicitly used.</li><li>Look for missing rows, duplicate voltage points, compliance plateaus, instrument limits, and obvious wiring/sign reversals.</li></ul>
          <h3>Synthetic data generator</h3>
          <p>Synthetic IV Trace uses the current Model Builder model and current parameter values to forward-simulate I(V) data. Set the voltage start, stop, and step, then optionally add Gaussian absolute current noise, Gaussian relative current noise, a reproducible random seed, and current-compliance clipping. The generated trace is imported into the normal trace list, with ground-truth parameters and generator settings stored in trace metadata for later comparison. Clean synthetic traces use the same backend prediction path as fitting; when metadata says no compliance artifact was applied, compliance-point exclusion is skipped to avoid false high-current clipping. It is a fitting/debug validation tool for stability and parameter recovery, not physical proof that the same model is correct for a real device. Use Seed from synthetic ground truth in Parameters to restore initials from the generated parameter snapshot.</p>
        </>}
      </ManualSection>;
    case "model":
      return <ManualSection id="model" title={zh ? "4. Model Builder 概念" : "4. Model Builder concepts"} wide>
        {zh ? <>
          <p>用户界面中最重要的是 <strong>主路 Main path</strong> 和 <strong>结点支路 Junction branches</strong>。按角色理解：主路把外部电压映射到内部结点电压；支路在内部电压下产生电流。</p>
          <ThreeColumnTable headers={["概念", "含义", "例子"]} rows={[["主路", "承载端口电流，并在支路看到电压前消耗电压。", "Rs、串联二极管势垒、电导调制"], ["结点支路", "在内部结点电压下产生电流并加入总电流。", "Shockley diode、Rsh 漏电、反向击穿、光电流"], ["昵称", "用户可读标签；Rs 和 Rsh 是角色标签，不是不同 law。", "Rs、Rsh、D1、I1"]]} />
          <p className="warning info"><strong>不要堆模型：</strong>增加组件会提高灵活性，也会增加不可辨识风险。只有残差形状需要且该项角色合理时才加入。</p>
        </> : <>
          <p>The user-facing model is organized into <strong>Main path</strong> and <strong>Junction branches</strong>. Think in terms of role: the main path maps external voltage to internal voltage; branches produce current at that internal voltage.</p>
          <ThreeColumnTable headers={["Concept", "Meaning", "Examples"]} rows={[["Main path", "Carries terminal current and consumes voltage before branches see the remaining voltage.", "Ohmic Rs, series diode barrier, conductance modifier"], ["Junction branches", "Generate current at the internal junction voltage and sum to terminal current.", "Shockley diode, Rsh leakage, reverse breakdown, photocurrent"], ["Nickname", "Human-readable label; Rs and Rsh are role labels, not separate laws.", "Rs, Rsh, D1, I1"]]} />
          <p className="warning info"><strong>Do not overbuild:</strong> adding a component increases flexibility but also non-identifiability. Add a term only when the residual pattern requires it and the term has a plausible role.</p>
        </>}
      </ManualSection>;
    case "law-form-placement":
      return <LawFormPlacementGuide language={language} />;
    case "functions":
      return <ManualSection id="functions" title={zh ? "5. 函数说明" : "5. Function guide"} wide>
        <p>{zh ? "本节改为选择式阅读器：先选模型项，再查看它的用途、适合/不适合、曲线影响、参数、拟合建议和公式。" : "This section is a selector-based reader: choose one model term, then read its purpose, use cases, unsuitable cases, curve effect, parameters, fit advice, and formulas."}</p>
        <RegistryGuide registry={registry} language={language} />
      </ManualSection>;
    case "formulas":
      return <ManualSection id="formulas" title={zh ? "6. 公式如何组装" : "6. How formulas are assembled"} wide>
        {zh ? <p>模型先假设内部电压；支路关系在该电压下产生电流；主路项再检查该电流和内部电压是否能解释外部电压。</p> : <p>The model proposes an internal voltage. Branch laws generate current at that voltage. Main-path terms then check whether the external voltage is consistent with that current and internal voltage.</p>}
        <FormulaStack formulas={["I_{branches}(V_j;\\theta)=\\sum_k I_k(V_j;\\theta)", "g(V_j;V_{ext},\\theta)=V_j+\\Delta V_{series}(I_{branches}(V_j;\\theta),V_j;\\theta)-V_{ext}=0", "\\hat{I}(V_{ext};\\theta)=I_{branches}(V_j^*;\\theta),\\quad g(V_j^*)=0"]} />
        <p>{zh ? "对于常见 D1 + Rs + Rsh：" : "For the common D1 + Rs + Rsh example:"}</p>
        <FormulaStack formulas={["V_j=V_{ext}-IR_s", "I_D=I_0[\\exp(\\frac{V_j}{nV_T})-1]", "I_{Rsh}=\\frac{V_j}{R_{sh}}", "I=I_D+I_{Rsh}", "I=I_0[\\exp(\\frac{V_{ext}-IR_s}{nV_T})-1]+\\frac{V_{ext}-IR_s}{R_{sh}}"]} />
        <p className="warning info">{zh ? <><strong>graph_dc 策略：</strong>graph_dc 只用于诊断，不可报告。最终参数应使用标准求解器，除非后端明确标记为可报告。</> : <><strong>graph_dc policy:</strong> graph_dc is diagnostic only and not reportable. Use the standard solver for final reported parameters unless the backend explicitly marks a result as reportable.</>}</p>
      </ManualSection>;
    case "fitting":
      return <ManualSection id="fitting" title={zh ? "7. 拟合如何进行" : "7. How fitting works"}>
        {zh ? <p>拟合器把电路求解器当作前向模型。给定参数向量和每个测量电压点，后端求解内部电路、预测电流、通过残差函数与实测电流比较，并最小化总损失。</p> : <p>The fitting engine treats the circuit solver as a forward model. For a parameter vector and each measured voltage point, the backend solves the internal circuit, predicts current, compares predicted and measured current through a residual function, and minimizes total loss.</p>}
        <FormulaStack formulas={["r_i(\\theta)=residual(\\hat{I}(V_i;\\theta),I_{meas,i})", "\\min_{\\theta}\\sum_i \\rho(r_i(\\theta))"]} />
        <ul className="doc-steps">{zh ? <><li>带符号/对数意识的权重避免大电流点完全压制低电流区。</li><li>Robust loss 可降低异常点影响，但不能代替人工检查数据。</li><li>Multistart 提高稳定性，但不证明全局唯一。</li><li>参数贴边界是诊断信号，不应盲信。</li></> : <><li>Signed/log-aware weighting prevents high-current points from completely dominating low-current regions.</li><li>Robust loss reduces the influence of outliers but does not replace data inspection.</li><li>Multistart improves robustness but does not prove global uniqueness.</li><li>A parameter stuck at a bound is a diagnostic signal, not a result to blindly trust.</li></>}</ul>
      </ManualSection>;
    case "recipes":
      return <ManualSection id="recipes" title={zh ? "8. 推荐拟合流程" : "8. Recommended fitting recipes"} wide>
        {zh ? <div className="manual-recipe-grid"><article><h3>普通二极管型曲线</h3><ol><li>先选正向低到中等电压范围。</li><li>先拟合 D1。</li><li>检查 log 斜率和残差结构。</li><li>只有高电流弯折需要时才加 Rs。</li><li>逐步扩大电压范围。</li></ol></article><article><h3>反向漏电或软击穿</h3><ol><li>先建立 D1 + Rs/Rsh 基线。</li><li>只有反向残差有可重复开启时才加 breakdown。</li><li>开启弱时固定或收紧参数。</li><li>不要用击穿支路拟合噪声。</li></ol></article><article><h3>高正向额外导通</h3><ol><li>先拟合普通 diode 区域。</li><li>高电流受限或下弯时先加 Rs。</li><li>只有残差显示额外电流时才加 forward power-law。</li><li>检查该支路是否可辨识。</li></ol></article><article><h3>光响应拟合</h3><ol><li>先拟合合理暗态基线。</li><li>拟合光照前继承或固定暗态参数。</li><li>先用常数光电流或 Ohmic/custom 支路表达最简单差异。</li><li>只有残差需要时才释放电压依赖参数。</li></ol></article></div> : <div className="manual-recipe-grid"><article><h3>Ordinary diode-like curve</h3><ol><li>Select a narrow forward-bias range.</li><li>Fit D1 first.</li><li>Check log slope and residual structure.</li><li>Add Rs only when high-current curvature requires it.</li><li>Expand the range gradually.</li></ol></article><article><h3>Reverse leakage or soft breakdown</h3><ol><li>Establish a D1 + Rs/Rsh baseline outside breakdown.</li><li>Add breakdown only when reverse residuals show repeatable onset.</li><li>Fix or bound weakly identified parameters.</li><li>Do not fit noise with a breakdown branch.</li></ol></article><article><h3>High-forward-bias extra conduction</h3><ol><li>Fit the ordinary diode region first.</li><li>Add Rs if high current is limited or bends downward.</li><li>Add forward power-law only when residuals show extra current.</li><li>Check identifiability over the selected range.</li></ol></article><article><h3>Light-response fitting</h3><ol><li>Fit a defensible dark baseline.</li><li>Seed or fix dark-like parameters before light fitting.</li><li>Start with constant photocurrent or an Ohmic/custom branch for the simplest difference.</li><li>Free voltage-dependent parameters only when residuals require them.</li></ol></article></div>}
      </ManualSection>;
    case "residuals":
      return <ManualSection id="residuals" title={zh ? "9. 如何读图和残差" : "9. Reading plots and residuals"} wide>
        <p>{zh ? "残差图不是装饰，而是判断模型是否缺少物理过程、是否过拟合、是否选错电压范围的主要证据。" : "Residual plots are not decoration. They are the main evidence for whether a model is missing a process, overfitting, or using the wrong voltage range."}</p>
        <ThreeColumnTable headers={zh ? ["现象", "可能原因", "建议动作"] : ["Observation", "Possible cause", "Suggested action"]} rows={zh ? [["正向高电流区预测过高", "缺少主路限制", "加入/检查 Rs，并检查 compliance。"], ["正向高电流区预测过低", "缺少额外导通支路", "先测试 Rs，再考虑 forward power-law。"], ["低偏压或反偏漏电失配", "缺少漏电支路", "加入 Rsh 或合适漏电项。"], ["反向电流在某电压后上升", "软击穿或陷阱辅助漏电", "确认可重复后再加 breakdown。"], ["残差随机无结构", "噪声或数据散布", "不要为了随机残差堆模型。"], ["参数贴边界", "不可辨识", "固定/移除参数或缩小电压范围。"]] : [["Forward high-current region predicted too high", "Missing series limitation", "Add/check main-path Rs and compliance."], ["Forward high-current region predicted too low", "Missing extra conduction branch", "Test Rs first, then consider forward power-law."], ["Low-bias or reverse leakage mismatch", "Missing leakage path", "Add Rsh or suitable leakage term."], ["Reverse current rises after onset", "Soft breakdown or trap-assisted leakage", "Add breakdown only if repeatable."], ["Residuals look random", "Noise or scatter", "Do not add components solely to chase noise."], ["Parameter hits bound", "Poor identifiability", "Fix/remove parameter or narrow range."]]} />
      </ManualSection>;
    case "reportability":
      return <ManualSection id="reportability" title={zh ? "10. 参数、diagnostics 和可报告性" : "10. Parameters, diagnostics, and reportability"}>
        {zh ? <><p>参数表是诊断的一部分，不只是数值输出。需要同时看数值、不确定度、边界、固定/拟合状态、diagnostics 和物理含义。复杂模型会先按主路/结点支路分组，再按组件分组；组件标题显示 law/form/placement/polarity 和参与拟合的参数数量。</p><ul className="doc-steps"><li><InlineFormula latex="n" /> 接近 1 常见于扩散型行为，接近 2 常见于复合型行为，大于 2 需要检查。</li><li><InlineFormula latex="I_0" /> 是指数项电流尺度；过大或不稳定可能说明初值、漏电或缺项问题。</li><li><InlineFormula latex="R_s" /> 控制主路压降和高电流 roll-off。</li><li><InlineFormula latex="R_{sh}" /> 控制低偏压/反偏漏电背景。</li><li>组件级按钮可以批量 Fit/Fix。完成拟合后，只有通过质量/可报告性门控的拟合值才会自动写回 Initial；较差、卡边界或不可报告的拟合会显示 fitted values，但不会偷偷覆盖下一次初值。Restore initial values 可恢复最近一次拟合前的初值快照。Synthetic trace 还可以从 metadata 中保存的真值参数恢复初值。Apply data bounds 会根据当前选中 trace 和拟合电压范围给出保守搜索边界：Rs 主要来自高电流区 dV/dI 或 max(|V|)/高分位 |I|，Rsh 来自低电压区 dV/dI，I0/电流幅度来自观测电流尺度，softplus 阈值/软化宽度来自电压或电流跨度；n/m 默认仍由 registry 控制。这些建议不是物理证明，只是优化器搜索窗口；用户手动改过的 bounds 不会被自动覆盖。这些操作不改变参数 key、导出 JSON 或报告结构。</li></ul><p className="warning info"><strong>Fit process：</strong>Fit setup 中的“拟合过程与质量指标”会显示本次点数、函数评估、Jacobian 评估、自由参数、自由度、线性 R²、log-magnitude R²、weighted reduced χ²、求解器状态和会话累计统计。线性 R² 可能被高电流区支配；log 指标更适合多数量级 IV 曲线。weighted reduced χ² 使用当前 residual weighting 计算，只有当权重代表真实测量不确定度时才有严格统计意义，否则主要用于残差尺度诊断。</p><p className="warning info"><strong>可报告性：</strong>只有当后端标记为 reportable，且用户已检查 diagnostics、残差、选中 trace、电压范围和模型结构后，结果才适合报告。</p></> : <><p>The parameter table is diagnostic output, not just numbers. Read value, uncertainty, bounds, fixed/fitted state, diagnostics, and physical meaning together. Complex models are grouped first by Main path versus Junction branches, then by component instance; each component header shows law/form/placement/polarity and fitted-count status.</p><ul className="doc-steps"><li><InlineFormula latex="n" /> near 1 often suggests diffusion-like behavior; near 2 often suggests recombination-like behavior; values above 2 need review.</li><li><InlineFormula latex="I_0" /> is the current scale for exponential terms; large or unstable values may indicate poor initials, leakage, or missing terms.</li><li><InlineFormula latex="R_s" /> controls main-path voltage drop and high-current roll-off.</li><li><InlineFormula latex="R_{sh}" /> controls low-bias or reverse leakage background.</li><li>Component controls can Fit all or Fix all. After a completed fit, fitted values are written back into Initial only when the fit passes quality/reportability gating; poor, bound-stuck, or non-reportable fits remain visible but are not silently promoted as next-run initials. Restore initial values recovers the latest pre-fit snapshot. Synthetic traces can also seed initials from the ground-truth parameters stored in metadata. Apply data bounds uses the selected trace and fit voltage range to create conservative search windows: Rs mainly comes from high-current dV/dI or max(|V|)/high-percentile |I|, Rsh from low-voltage dV/dI, I0/current amplitudes from observed current scale, and softplus thresholds/softness from voltage or current span; n/m remain registry-controlled by default. These suggestions are not physical proof, only optimizer search-window guidance, and user-edited bounds are not overwritten. These display actions keep parameter keys, exported JSON, and reports unchanged.</li></ul><p className="warning info"><strong>Fit process:</strong> the Fit setup “Fit process and quality metrics” disclosure shows points used, function/Jacobian evaluations, free parameters, degrees of freedom, linear R², log-magnitude R², weighted reduced χ², optimizer status, and session totals. Linear R² can be dominated by high-current regions; log metrics are more informative for multi-decade IV curves. Weighted reduced χ² is computed from the active residual weighting and is strictly statistical only when the weights represent measurement uncertainty; otherwise it is a residual-scale diagnostic.</p><p className="warning info"><strong>Reportability:</strong> report a result only if the backend marks it reportable and diagnostics, residuals, selected trace, voltage range, and model structure have been reviewed.</p></>}
      </ManualSection>;
    case "light-response":
      return <ManualSection id="light-response" title={zh ? "11. 光响应建模" : "11. Light-response modeling"} wide>
        {zh ? <>
          <p>光响应项通常应在暗态 trace 已有合理拟合后再加入。否则光响应项可能补偿错误暗态模型，导致误导性的物理解释。</p>
          <ThreeColumnTable headers={["光照现象", "优先模型", "何时升级"]} rows={[["光照曲线相对暗态整体平移", "常数光电流", "残差显示系统性偏压依赖。"], ["差值大致随电压线性增加", "欧姆支路或自定义电导", "出现阈值型增强或饱和。"], ["光响应在阈值或场辅助下增强", "电压依赖光电流", "暗态基线稳定且残差确实需要。"], ["光照改变高电流斜率或阈值", "欧姆主路或自定义传输项", "残差形状需要明确的数学项。"]]} />
        </> : <>
          <p>Light-response terms should normally be added only after the dark trace has a defensible fit. Otherwise, a light term may compensate for an incorrect dark model and produce misleading interpretation.</p>
          <ThreeColumnTable headers={["Light behavior", "First model to try", "Escalate only if"]} rows={[["Light curve mostly shifts relative to dark", "Constant photocurrent", "Residuals show systematic bias dependence."], ["Light-dark difference grows roughly linearly with voltage", "Ohmic branch or custom conductance", "There is threshold-like growth or saturation."], ["Light response strengthens near threshold or with field", "Voltage-dependent photocurrent", "Dark baseline is stable and residuals demand it."], ["Light changes high-current slope or threshold", "Ohmic main-path or custom transport term", "The residual shape requires an explicit mathematical term."]]} />
        </>}
      </ManualSection>;
    case "troubleshooting":
      return <ManualSection id="troubleshooting" title={zh ? "12. 常见问题排查" : "12. Troubleshooting"} wide>
        <ThreeColumnTable headers={zh ? ["问题", "建议处理", "检查位置"] : ["Problem", "Suggested response", "Where to check"]} rows={zh ? [["拟合爆炸", "缩小电压范围、重置初值、启用 multistart、检查异常电流范围。", "Fit setup / Diagnostics"], ["参数贴边界", "参数可能不可辨识、边界太紧或模型缺少通道。", "Parameter table"], ["残差有结构", "排除数据问题后，只加入残差模式支持的模型项。", "Plots / Residuals"], ["多 trace 混淆", "运行和报告前确认当前 trace selector。", "Data / Plot selector"], ["视觉拟合好但 warning 仍在", "diagnostics 仍是结果的一部分，必须检查可报告性。", "Diagnostics / reportability"]] : [["Fit explodes", "Narrow voltage range, reset initials, enable multistart, and inspect abnormal current range.", "Fit setup / Diagnostics"], ["Parameters stick to bounds", "Parameter may be poorly identified, bounds may be too tight, or a path may be missing.", "Parameter table"], ["Residuals have structure", "Add a motivated term only after ruling out data artifacts.", "Plots / Residuals"], ["Multi-trace confusion", "Confirm the selected trace before running or reporting.", "Data / Plot selector"], ["Good visual fit but warnings remain", "Diagnostics remain part of the result; review reportability.", "Diagnostics / reportability"]]} />
      </ManualSection>;
    case "glossary":
      return <ManualSection id="glossary" title={zh ? "13. 术语表" : "13. Glossary"} wide>
        <ThreeColumnTable headers={zh ? ["术语", "含义", "使用位置"] : ["Term", "Meaning", "Used in"]} rows={zh ? [["Vext", "仪器施加和记录的外部端口电压。", "数据、公式"], ["Vj", "扣除主路压降后支路实际看到的内部结点电压。", "模型、公式"], ["Main path", "承载端口电流并产生压降或电导调制的路径。", "Model Builder"], ["Branch", "在 Vj 下计算并加入总电流的电流贡献。", "Model Builder"], ["Law", "数学关系，如 Shockley、Ohmic、softplus 或光电流。", "Law/Form/Placement"], ["Residual", "预测电流与实测电流经过权重/变换后的差异。", "Plots"], ["Reportable", "通过后端可报告性门控并已审查 warnings。", "Fit status"]] : [["Vext", "Measured terminal voltage applied by the instrument.", "Data, formulas"], ["Vj", "Internal junction voltage after main-path voltage drops are accounted for.", "Model, formulas"], ["Main path", "Path carrying terminal current and producing voltage drops or conductance modulation.", "Model Builder"], ["Branch", "Current contribution evaluated at Vj and added to total terminal current.", "Model Builder"], ["Law", "Mathematical relation such as Shockley, Ohmic, softplus, or photocurrent.", "Law/Form/Placement"], ["Residual", "Difference between predicted and measured current after weighting/transform.", "Plots"], ["Reportable", "Backend quality/reportability gates pass and warnings have been reviewed.", "Fit status"]]} />
      </ManualSection>;
    default:
      return null;
  }
}

function LawFormPlacementGuide({ language }: { language: Language }) {
  const zh = language === "zh";
  return <ManualSection id="law-form-placement" title={zh ? "5. Law、form 与 placement" : "5. Law, form, and placement"} wide>
    {zh ? <>
      <p><strong>核心信息：</strong>在 IV-fitter 中，“function”不是完整物理元件，而是数学 law。一个模型项只有在 law 与 evaluation form 和 placement 配对后，才有明确物理角色。</p>
      <p>这个抽象可以避免把同一个数学关系误认为多个不同物理模型，也可以防止为了让曲线更好看而无约束堆项。</p>
      <ThreeColumnTable headers={["层级", "含义", "例子"]} rows={[["Law", "数学关系，定义曲线形状，但不决定放在电路哪里。", "Ohmic、Shockley、softplus、photocurrent"], ["Evaluation form", "该关系怎样被数值计算。", "压降、支路电流、电导调制"], ["Placement", "该 form 在组装方程中的位置。", "主路压降、主路电导调制、结点支路、并联支路"]]} />
      <h3>通用组装</h3>
      <FormulaStack formulas={["V_{ext}=V_j+\\Delta V_{series}(I,V_j;\\theta)", "I=\\sum_k I_k(V_j;\\theta)"]} />
      <p className="warning info"><strong>重要区别：</strong>外部电压轴不自动等于二极管电压。存在主路项时，IV-fitter 必须先求内部结点电压，再计算支路电流。</p>
      <h3>Ohmic law 的例子</h3>
      <ThreeColumnTable headers={["组合", "模型含义", "方程角色"]} rows={[["Ohmic + voltage-drop form + main path", "串联电阻 Rs", "Vext = Vj + I Rs"], ["Ohmic + current-branch form + parallel placement", "旁路漏电 Rsh", "Ish = Vj / Rsh"]]} />
      <h3>常见组合</h3>
      <ThreeColumnTable headers={["Law", "Form / placement", "用户看到的物理角色"]} rows={[["Ohmic linear law", "Voltage drop / main path", "Rs 或 access resistance"], ["Ohmic linear law", "Current branch / parallel", "Rsh 旁路漏电"], ["Shockley diode law", "Current branch / junction", "主二极管支路 D1"], ["Shockley diode law", "Voltage-drop barrier / main path", "接触或串联势垒"], ["Softplus power law", "Current branch / forward or reverse", "额外高偏压导通或软反向开启"], ["Photocurrent law", "Current branch", "有明确方向约定的光生电流"], ["Conductance modifier", "Modifier / main path", "偏压相关主路传输变化"]]} />
      <p className="manual-keyidea"><strong>一句话规则：</strong>模型项 = law + evaluation form + placement。Law 定义曲线形状；form 定义计算方式；placement 定义它在组装方程里的物理角色。</p>
    </> : <>
      <p><strong>Core message:</strong> in IV-fitter, a “function” is not a complete physical component by itself. It is a mathematical law. A model term becomes physically meaningful only when the law is paired with an evaluation form and a placement.</p>
      <p>This abstraction prevents the same mathematical relation from being mistaken for unrelated physical models, and it discourages adding every available term until the curve merely looks better.</p>
      <ThreeColumnTable headers={["Level", "Meaning", "Examples"]} rows={[["Law", "The mathematical relation. It defines curve shape, but not where the term belongs.", "Ohmic, Shockley, softplus, photocurrent"], ["Evaluation form", "How the relation is evaluated numerically.", "Voltage drop, current branch, conductance modifier"], ["Placement", "Where the evaluated term enters the assembled model.", "Main-path drop, main-path modifier, junction branch, parallel branch"]]} />
      <h3>General assembly</h3>
      <FormulaStack formulas={["V_{ext}=V_j+\\Delta V_{series}(I,V_j;\\theta)", "I=\\sum_k I_k(V_j;\\theta)"]} />
      <p className="warning info"><strong>Important distinction:</strong> the external voltage axis in the data is not automatically the diode voltage. When main-path terms exist, IV-fitter must solve for the internal junction voltage before evaluating branch currents.</p>
      <h3>Worked example: Ohmic law</h3>
      <ThreeColumnTable headers={["Combination", "Model meaning", "Equation role"]} rows={[["Ohmic + voltage-drop form + main-path placement", "Series resistance Rs", "Vext = Vj + I Rs"], ["Ohmic + current-branch form + parallel placement", "Shunt leakage Rsh", "Ish = Vj / Rsh"]]} />
      <h3>Common combinations</h3>
      <ThreeColumnTable headers={["Law", "Form / placement", "Physical role seen by the user"]} rows={[["Ohmic linear law", "Voltage drop / main path", "Series resistance Rs or access resistance"], ["Ohmic linear law", "Current branch / parallel", "Shunt leakage Rsh"], ["Shockley diode law", "Current branch / junction", "Main diode branch D1"], ["Shockley diode law", "Voltage-drop barrier / main path", "Contact-like or series barrier contribution"], ["Softplus power law", "Current branch / forward or reverse", "Extra high-bias conduction or soft reverse onset"], ["Photocurrent law", "Current branch", "Light-induced current with explicit sign convention"], ["Conductance modifier", "Modifier / main path", "Bias-dependent series-path modification"]]} />
      <p className="manual-keyidea"><strong>One-sentence rule:</strong> a model term is the combination of a law, an evaluation form, and a placement. The law defines the curve shape; the form defines how it is evaluated; the placement defines its physical role in the assembled circuit equation.</p>
    </>}
  </ManualSection>;
}

function EnglishManual({ registry, appVersion }: { registry: FunctionDefinition[]; appVersion: string }) {
  return <ManualReader registry={registry} appVersion={appVersion} language="en" />;
}

function ChineseManual({ registry, appVersion }: { registry: FunctionDefinition[]; appVersion: string }) {
  return <ManualReader registry={registry} appVersion={appVersion} language="zh" />;
}

export function UserDocumentationPage({ registry, appVersion, language = "en" }: { view?: AppView; registry: FunctionDefinition[]; appVersion: string; language?: Language }) {
  return <div className="doc-page">
    {language === "zh" ? <ChineseManual registry={registry} appVersion={appVersion} /> : <EnglishManual registry={registry} appVersion={appVersion} />}
  </div>;
}
