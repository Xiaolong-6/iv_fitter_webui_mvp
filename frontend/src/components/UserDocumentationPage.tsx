import type { ReactNode } from "react";
import type { AppView } from "./WorkflowSidebar";
import type { FunctionDefinition } from "../model/types";
import type { Language } from "../model/i18n";
import { MathFormula } from "./MathFormula";



function BlockFormula({ latex }: { latex: string }) {
  return <div className="manual-equations"><MathFormula latex={latex} className="manual-formula" /></div>;
}

function InlineFormula({ latex }: { latex: string }) {
  return <MathFormula latex={latex} inline className="manual-inline-formula" />;
}
function ManualSection({ id, title, children, wide = false }: { id: string; title: string; children: ReactNode; wide?: boolean }) {
  return <section id={id} className={wide ? "card doc-card wide-card manual-section" : "card doc-card manual-section"}>
    <h2>{title}</h2>
    {children}
  </section>;
}

function InlineNav({ language }: { language: Language }) {
  const items = language === "zh"
    ? [
      ["workflow", "工作流程"],
      ["data", "数据导入"],
      ["model", "模型构建"],
      ["functions", "函数库"],
      ["logic", "拟合逻辑"],
      ["convergence", "收敛与诊断"],
      ["plots", "图表"],
      ["parameters", "参数与报告"],
      ["troubleshooting", "排查"],
    ]
    : [
      ["workflow", "Workflow"],
      ["data", "Data"],
      ["model", "Model"],
      ["functions", "Functions"],
      ["logic", "Fitting logic"],
      ["convergence", "Convergence"],
      ["plots", "Plots"],
      ["parameters", "Parameters and reports"],
      ["troubleshooting", "Troubleshooting"],
    ];
  return <div className="manual-toc">{items.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}</div>;
}


type FunctionDoc = {
  lawId: string;
  en: {
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
  zh: {
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
};

const FUNCTION_DOCS: FunctionDoc[] = [
  {
    lawId: "shockley_diode",
    en: {
      name: "Shockley diode",
      oneLine: "Exponential current from a p-n, barrier, or equivalent junction.",
      tags: ["junction", "forward turn-on", "start simple"],
      purpose: "Describes ordinary exponential conduction through a p-n junction, barrier junction, or equivalent junction.",
      suitable: "Low-to-medium forward bias before the curve is dominated by series resistance, high injection, breakdown, extra channels, or measurement compliance.",
      notSuitable: "High forward voltage with strong extra conduction, abrupt jumps, strong series-resistance limitation, or reverse breakdown.",
      curveEffect: "Sets the exponential slope and turn-on behavior in the low-to-medium forward-bias region.",
      fitAdvice: "Fit D1 first over a narrow forward low-voltage range. If the high-voltage residual is systematic, add main-path Ohmic resistance, a forward power-law branch, or another physically justified term.",
      parameters: [["I₀", "Saturation current; controls the current scale."], ["n", "Ideality factor; larger n gives a slower current rise with voltage."]],
      formula: "I_D = I_0[\exp(V_j/(nV_T))-1]",
    },
    zh: {
      name: "二极管指数电流",
      oneLine: "描述 p-n 结、势垒结或等效结的指数型导通。",
      tags: ["结电流", "正向开启", "优先起点"],
      purpose: "描述普通 p-n 结、势垒结或等效结的指数型导通电流。",
      suitable: "低到中等正向偏压区，尚未被串联电阻、高注入、击穿、额外导通通道或测量合规限制主导的数据。",
      notSuitable: "高正向电压下出现明显额外导通、跳变、强串联电阻限制，或者反向击穿区。",
      curveEffect: "主要决定低到中等正向电压下的指数斜率和 turn-on 行为。",
      fitAdvice: "先在较窄的正向低电压范围拟合 D1。如果高电压区系统性偏离，再加入主路 Ohmic、forward power-law 或其他导通支路。",
      parameters: [["I₀", "饱和电流，控制指数电流水平。"], ["n", "理想因子，控制指数斜率；n 越大，电流随电压上升越慢。"]],
      formula: "I_D = I_0[\exp(V_j/(nV_T))-1]",
    },
  },
  {
    lawId: "ohmic",
    en: {
      name: "Ohmic resistance",
      oneLine: "Linear resistance that can act as a main-path drop or a leakage branch.",
      tags: ["series resistance", "leakage", "linear"],
      purpose: "Describes linear resistance. The same Ohmic law can be used in the main path or as a junction branch; Rs and Rsh are default nicknames, not different laws.",
      suitable: "Use it in the main path for contact, wire, conductive-layer, or transport-channel resistance. Use it as a branch for leakage, bypass, or a linear conduction path.",
      notSuitable: "Do not use a main-path resistance to represent an added parallel current branch; do not use a branch resistance to explain a high-current voltage drop.",
      curveEffect: "Main-path Ohmic resistance bends or limits the high-current region. Branch Ohmic resistance changes low-bias, reverse-bias, or leakage background current.",
      fitAdvice: "If the high-current region bends over, try main-path Ohmic resistance. If low-current or reverse-bias regions have a nearly linear leakage background, try branch Ohmic resistance.",
      parameters: [["R", "Resistance value."], ["Nickname", "User-facing label. Main-path Ohmic is often called Rs; branch Ohmic is often called Rsh."]],
      formula: "V_{drop}=IR_s",
      advancedFormula: "I_{leak}=V_j/R_{sh}",
    },
    zh: {
      name: "欧姆电阻",
      oneLine: "可作为主路压降或漏电支路的线性电阻。",
      tags: ["串联电阻", "漏电", "线性"],
      purpose: "描述线性电阻效应。同一个 Ohmic law 可以放在主路或支路；Rs 和 Rsh 只是默认 nickname，不是两种不同的数学函数。",
      suitable: "放在主路时表示接触电阻、导线电阻、导电层电阻或主传输通道电阻。放在支路时表示漏电、旁路或线性导电通道。",
      notSuitable: "如果只是多了一条并联电流，不要用主路电阻解释；如果高电流区是主路压降，不要用支路电阻代替。",
      curveEffect: "主路 Ohmic 主要影响高电流区斜率和弯曲；支路 Ohmic 主要影响低电压区、反向区或漏电背景。",
      fitAdvice: "高电流区被压弯或斜率受限时，考虑主路 Ohmic。低电流区或反向区有近似线性漏电时，考虑支路 Ohmic。",
      parameters: [["R", "电阻值。"], ["Nickname", "用户自定义名称；默认主路 Ohmic 常叫 Rs，默认支路 Ohmic 常叫 Rsh。"]],
      formula: "V_{drop}=IR_s",
      advancedFormula: "I_{leak}=V_j/R_{sh}",
    },
  },
  {
    lawId: "softplus_conductance_modifier",
    en: {
      name: "Bias-dependent conductance modifier",
      oneLine: "Softly changes main-path conductance with bias.",
      tags: ["main path", "high bias", "soft threshold"],
      purpose: "Describes a main transport path whose conductance changes with bias, such as a channel, contact, or transport path that softly turns on at high bias.",
      suitable: "High forward bias where a simple Rs cannot describe a slope change or soft threshold in the main path.",
      notSuitable: "If the data need an additional parallel current, use a branch current law instead.",
      curveEffect: "Changes the slope and curvature of the high-current region by modifying the main-path voltage drop.",
      fitAdvice: "Keep extra shape parameters fixed until residuals clearly require them. Use only after a simpler Rs model is inadequate.",
      parameters: [["A", "Modulation strength."], ["Vt", "Voltage where modulation becomes visible."], ["Vs", "Soft turn-on width."], ["shape", "Optional exponent or shape terms; keep fixed unless needed."]],
      formula: "R_{eff}=R_{base}/[1+A\,\operatorname{softplus}((V_j-V_t)/V_s)]",
    },
    zh: {
      name: "偏压相关主路电导调制",
      oneLine: "随偏压软开启地改变主路电导。",
      tags: ["主路", "高偏压", "软阈值"],
      purpose: "描述主路传输随偏压改变的情况，例如高偏压下通道导电性增强、接触或传输路径发生软开启。",
      suitable: "高正向偏压区出现普通 Rs 无法描述的 slope change 或软阈值导通。",
      notSuitable: "如果只是多了一条并联电流，不要用主路 modifier，应该用 branch current law。",
      curveEffect: "通过改变主路压降，主要改变高电流区的斜率和曲率。",
      fitAdvice: "除非残差明确需要，其他指数/形状参数应默认固定。先确认简单 Rs 已经不足。",
      parameters: [["A", "调制强度。"], ["Vt", "开始明显调制的电压。"], ["Vs", "软开启宽度。"], ["形状参数", "如有应默认固定，除非用户明确需要。"]],
      formula: "R_{eff}=R_{base}/[1+A\,\operatorname{softplus}((V_j-V_t)/V_s)]",
    },
  },
  {
    lawId: "softplus_power_law_current",
    en: {
      name: "Softplus power-law current",
      oneLine: "Empirical extra current branch that softly turns on at high bias.",
      tags: ["extra branch", "threshold-like", "high bias"],
      purpose: "Describes an additional empirical current path at high bias, such as non-ideal conduction, trap-assisted conduction, or threshold-like conduction.",
      suitable: "I-V curves that show clear extra current after a certain bias and where the missing behavior looks like a branch current rather than a main-path resistance change.",
      notSuitable: "If the high-current region is simply limited by series resistance, use main-path Ohmic resistance first. If light changes channel conductance, consider photo-modulated main path.",
      curveEffect: "Adds current near and above a threshold, making the high-bias curve turn upward or softly open.",
      fitAdvice: "Use after simpler diode/Rs/Rsh terms fail. Keep bounds physically meaningful and check residuals for overfitting.",
      parameters: [["A", "Extra current scale."], ["Vt", "Turn-on voltage."], ["Vs", "Softness of the turn-on."], ["m", "Power exponent after turn-on."], ["Polarity", "Whether the branch acts mainly in forward, reverse, or both bias directions."]],
      formula: "I_{extra}=\pm A\,\operatorname{softplus}((\pm V_j-V_t)/V_s)^m",
    },
    zh: {
      name: "高偏压额外导通支路",
      oneLine: "在高偏压下软开启的经验电流支路。",
      tags: ["额外支路", "阈值型", "高偏压"],
      purpose: "描述高偏压下额外出现的经验电流通道，例如非理想导通、trap-assisted conduction、threshold-like conduction。",
      suitable: "I-V 在某个偏压后出现明显额外电流，且这个电流像一条支路贡献，而不是主路电阻变化。",
      notSuitable: "如果高电流区只是被串联电阻限制，先用主路 Ohmic。如果光照改变主通道电导，考虑 photo-modulated main path。",
      curveEffect: "在阈值附近开始增加一条额外电流，使曲线在高偏压区上翘或出现软开启。",
      fitAdvice: "在 diode/Rs/Rsh 等简单项不足后再使用；保持边界物理合理，并检查残差是否过拟合。",
      parameters: [["A", "额外电流尺度。"], ["Vt", "开启电压。"], ["Vs", "开启平滑宽度。"], ["m", "开启后的增长指数。"], ["Polarity", "决定该支路主要作用在正向、反向或双向。"]],
      formula: "I_{extra}=\pm A\,\operatorname{softplus}((\pm V_j-V_t)/V_s)^m",
    },
  },
  {
    lawId: "soft_reverse_breakdown_current",
    en: {
      name: "Smooth reverse breakdown",
      oneLine: "Reverse-bias leakage or soft breakdown onset.",
      tags: ["reverse bias", "leakage", "breakdown"],
      purpose: "Describes reverse-bias leakage or soft breakdown current that gradually turns on.",
      suitable: "Reverse-bias data with a clear current increase near an onset voltage, but not a hard step.",
      notSuitable: "If reverse current is only linear leakage, use branch Ohmic resistance. If reverse data are noisy without a clear onset, do not add breakdown too early.",
      curveEffect: "Mainly changes the high-magnitude reverse-bias region by rapidly increasing reverse current after the onset.",
      fitAdvice: "Fit reverse range deliberately and check whether the onset is repeatable. Keep breakdown parameters fixed or bounded if data do not strongly identify them.",
      parameters: [["I₀", "Breakdown current scale."], ["Vbr", "Breakdown or turn-on voltage."], ["Vslope", "Exponential slope after onset."], ["w", "Smooth turn-on width."]],
      formula: "I_{BR}=-I_0[\exp((|V_j|-V_{BR})/V_{slope})-1]S((|V_j|-V_{BR})/w)",
    },
    zh: {
      name: "平滑反向击穿或漏电开启",
      oneLine: "反向偏压下逐渐开启的漏电或软击穿电流。",
      tags: ["反向偏压", "漏电", "击穿"],
      purpose: "描述反向偏压下逐渐开启的漏电或软击穿电流。",
      suitable: "反向区在某个电压附近出现明显电流增加，但不是硬阶跃。",
      notSuitable: "如果反向区只是线性漏电，用支路 Ohmic。如果反向数据噪声大且没有明显开启，不要过早加入 breakdown 项。",
      curveEffect: "主要影响反向高电压区，使反向电流在某个电压后快速增加。",
      fitAdvice: "有意识地选择反向范围，并确认开启行为可重复。数据不能强约束时，保持击穿参数固定或边界较严。",
      parameters: [["I₀", "击穿电流尺度。"], ["Vbr", "击穿/开启电压。"], ["Vslope", "开启后的指数斜率。"], ["w", "开启平滑宽度。"]],
      formula: "I_{BR}=-I_0[\exp((|V_j|-V_{BR})/V_{slope})-1]S((|V_j|-V_{BR})/w)",
    },
  },
  {
    lawId: "photocurrent_constant",
    en: {
      name: "Constant photocurrent",
      oneLine: "Bias-independent light-generated current source.",
      tags: ["light response", "photodiode", "first approximation"],
      purpose: "Describes photocurrent that is approximately independent of bias; a first approximation for traditional photodiode light current.",
      suitable: "Light-dark difference is nearly constant over the selected voltage range.",
      notSuitable: "If photoresponse strongly depends on bias, turns on near a threshold, or changes high-current slope, do not rely only on constant photocurrent.",
      curveEffect: "Mostly shifts the light I-V curve upward or downward relative to the dark curve.",
      fitAdvice: "Fit the dark trace first; then fix or seed dark parameters and add constant photocurrent to the light trace.",
      parameters: [["Iph0", "Photocurrent magnitude."], ["Direction", "Current direction; depends on software sign convention and wiring."]],
      formula: "I_{ph}=\pm I_{ph0}",
    },
    zh: {
      name: "常数光电流",
      oneLine: "近似不随偏压变化的光生电流。",
      tags: ["光响应", "光电二极管", "第一近似"],
      purpose: "描述近似不随偏压变化的光生电流，适合作为传统 photodiode light-current 的第一近似。",
      suitable: "light-dark 差值在选定电压范围内近似为常数。",
      notSuitable: "如果光响应随偏压强烈变化、在阈值附近开启，或明显改变高电流区斜率，不要只用 constant photocurrent。",
      curveEffect: "主要使 light I-V 相对 dark I-V 上下平移。",
      fitAdvice: "先拟合 dark trace；再固定或继承 dark 参数，在 light trace 中加入 constant photocurrent。",
      parameters: [["Iph0", "光生电流大小。"], ["Direction", "光生电流方向，取决于软件电流符号定义和器件接线。"]],
      formula: "I_{ph}=\pm I_{ph0}",
    },
  },
  {
    lawId: "photocurrent_voltage_dependent",
    en: {
      name: "Voltage-dependent photocurrent",
      oneLine: "Photocurrent that grows or changes with junction voltage.",
      tags: ["light response", "field-assisted", "photogain"],
      purpose: "Describes photocurrent that depends on bias, such as field-assisted collection, trap-assisted gain, photoconductive gain, or sub-bandgap photoresponse.",
      suitable: "Light-dark difference is not constant; it strengthens, saturates, or rises rapidly after a threshold.",
      notSuitable: "If data are sparse, noisy, or the light-dark difference is weak, this model can overfit. Try constant photocurrent or photoconductive branch first.",
      curveEffect: "Makes light-generated current depend on junction voltage instead of simply shifting the whole curve.",
      fitAdvice: "Fit the dark trace first. In the light trace, first free only Iph0 and linear voltage gain. Keep threshold terms fixed unless residuals clearly show threshold behavior.",
      parameters: [["Iph0", "Base photocurrent."], ["gain_per_V", "Linear bias-enhancement strength."], ["Aph", "Optional threshold photocurrent scale."], ["Vt_ph", "Threshold voltage for enhanced photoresponse."], ["Vs_ph", "Threshold turn-on width."], ["m_ph", "Growth exponent after threshold."], ["Direction", "Photocurrent direction."]],
      formula: "I_{ph}(V_j)=\pm I_{ph0}(1+a|V_j|)",
      advancedFormula: "I_{ph}(V_j)=\pm[I_{ph0}(1+a|V_j|)+A_{ph}\operatorname{softplus}((|V_j|-V_{t,ph})/V_{s,ph})^{m_{ph}}]",
    },
    zh: {
      name: "电压依赖光电流",
      oneLine: "随结点电压增强或变化的光生电流。",
      tags: ["光响应", "场辅助", "光增益"],
      purpose: "描述光电流随偏压变化的情况，例如电场辅助收集、陷阱辅助增益、光电导增益或 sub-bandgap 光响应。",
      suitable: "light-dark 差值不是常数，而是随电压增强、饱和或在某个阈值后快速增加。",
      notSuitable: "如果数据点少、噪声大或 light/dark 差异很弱，这个模型容易过拟合。应先尝试 constant photocurrent 或 photoconductive branch。",
      curveEffect: "让光生电流随结点电压改变，不再只是整体平移。",
      fitAdvice: "先拟合 dark trace；light trace 中先只放 Iph0 和 gain_per_V。Aph、Vt_ph、Vs_ph、m_ph 默认固定，只有数据确实显示阈值行为时再释放。",
      parameters: [["Iph0", "基础光电流。"], ["gain_per_V", "线性偏压增强强度。"], ["Aph", "阈值型额外光电流尺度。"], ["Vt_ph", "光响应增强的阈值电压。"], ["Vs_ph", "阈值开启宽度。"], ["m_ph", "开启后的增长指数。"], ["Direction", "光电流方向。"]],
      formula: "I_{ph}(V_j)=\pm I_{ph0}(1+a|V_j|)",
      advancedFormula: "I_{ph}(V_j)=\pm[I_{ph0}(1+a|V_j|)+A_{ph}\operatorname{softplus}((|V_j|-V_{t,ph})/V_{s,ph})^{m_{ph}}]",
    },
  },
  {
    lawId: "photoconductive_branch",
    en: {
      name: "Photoconductive branch",
      oneLine: "Light-induced conductance added as a branch current.",
      tags: ["light response", "conductance", "linear background"],
      purpose: "Describes illumination adding a conductive path. It is not a fixed photocurrent source; it is an extra conductance under light.",
      suitable: "The light curve has a larger slope and the light-dark difference grows roughly with voltage.",
      notSuitable: "If the light curve is mainly shifted relative to the dark curve, try constant photocurrent first.",
      curveEffect: "Changes the linear or quasi-linear conductive background under illumination.",
      fitAdvice: "Use after comparing dark and light traces. It is usually easier to interpret than a high-parameter voltage-dependent photocurrent law.",
      parameters: [["Gph", "Photoconductance. Larger values give more current increase per volt under light."]],
      formula: "I_{pc}=G_{ph}V_j",
    },
    zh: {
      name: "光致电导支路",
      oneLine: "光照增加的一条导电支路。",
      tags: ["光响应", "电导", "线性背景"],
      purpose: "描述光照增加一条导电通道。它不是固定光电流源，而是光照产生的额外电导。",
      suitable: "光照后 I-V 斜率明显变大，light-dark 差值大致随电压增加。",
      notSuitable: "如果 light curve 只是相对 dark curve 整体平移，先用 constant photocurrent。",
      curveEffect: "改变光照下的线性或准线性导电背景。",
      fitAdvice: "在比较 dark/light 后使用。相比高参数电压依赖光电流，它通常更容易解释。",
      parameters: [["Gph", "光致电导。值越大，光照下电流随电压增加越明显。"]],
      formula: "I_{pc}=G_{ph}V_j",
    },
  },
  {
    lawId: "photo_modulated_main_path",
    en: {
      name: "Photo-modulated main path",
      oneLine: "Light changes the effective main-path resistance or transport.",
      tags: ["light response", "main path", "transport"],
      purpose: "Describes light changing the main current path, such as a contact, conductive channel, surface layer, or near-threshold transport.",
      suitable: "Illumination mainly changes high-current slope, turn-on threshold, or near-threshold conduction state.",
      notSuitable: "If the light curve is only shifted, use constant photocurrent. If light adds a parallel conductive path, use photoconductive branch.",
      curveEffect: "Changes the internal junction voltage, thereby indirectly changing all branch currents.",
      fitAdvice: "Use only when a branch-current description is misleading. Keep photo_gain bounded and compare against the simpler photoconductive branch.",
      parameters: [["R0", "Dark or baseline main-path resistance."], ["photo_gain", "Conductance enhancement under light."]],
      formula: "V_{drop}=IR_{eff}",
      advancedFormula: "R_{eff}=R_0/(1+g_{ph})",
    },
    zh: {
      name: "光调制主路传输",
      oneLine: "光照改变主路等效电阻或传输。",
      tags: ["光响应", "主路", "传输"],
      purpose: "描述光照改变主电流路径，例如接触、导电通道、表面层或 threshold 附近的 transport。",
      suitable: "光照主要改变高电流区斜率、turn-on threshold、或接近 threshold 时的导通状态。",
      notSuitable: "如果 light curve 只是整体上下平移，用 constant photocurrent。如果光照增加一条并联导电通道，用 photoconductive branch。",
      curveEffect: "改变内部结点电压，从而间接改变所有支路电流。",
      fitAdvice: "只有当支路电流模型会误导时才使用。保持 photo_gain 边界合理，并与更简单的 photoconductive branch 对比。",
      parameters: [["R0", "暗态或基准主路电阻。"], ["photo_gain", "光照引起的主路导电增强强度。"]],
      formula: "V_{drop}=IR_{eff}",
      advancedFormula: "R_{eff}=R_0/(1+g_{ph})",
    },
  },
  {
    lawId: "custom_expression",
    en: {
      name: "User-defined relation",
      oneLine: "Advanced custom expression for testing a new empirical model.",
      tags: ["advanced", "experimental", "custom"],
      purpose: "Lets advanced users test an empirical model that is not built in.",
      suitable: "Exploring a new empirical relation or temporarily checking a hypothesis.",
      notSuitable: "Routine fitting, final reporting, or model stacks without a clear physical explanation.",
      curveEffect: "Depends entirely on the supplied expression; treat the result as exploratory until documented and validated.",
      fitAdvice: "Record the full expression and parameter definitions in any report. Prefer built-in laws whenever they can describe the data.",
      parameters: [["Expression", "User-supplied mathematical relation."], ["User parameters", "Must be documented for reproducibility."]],
      formula: "\text{User-defined expression}",
    },
    zh: {
      name: "自定义数学关系",
      oneLine: "用于测试新经验模型的高级自定义表达式。",
      tags: ["高级", "实验性", "自定义"],
      purpose: "给高级用户测试尚未内置的经验模型。",
      suitable: "探索新经验模型、临时验证假设。",
      notSuitable: "普通拟合流程、最终报告、没有明确物理解释的模型堆叠。",
      curveEffect: "完全取决于用户表达式；在记录和验证前应视为探索性结果。",
      fitAdvice: "用于报告或论文时，必须记录完整表达式和参数定义。能用内置关系描述时优先用内置关系。",
      parameters: [["Expression", "用户提供的数学关系。"], ["用户参数", "必须记录定义以保证可复现。"]],
      formula: "\text{User-defined expression}",
    },
  },
];

function AdvancedFunctionDetails({ lawId, registry, language }: { lawId: string; registry: FunctionDefinition[]; language: Language }) {
  const items = registry.filter((item) => item.law_id === lawId);
  if (!items.length) {
    return <p className="muted">{language === "zh" ? "此项当前未在后端函数库中加载。" : "This item is not currently loaded from the backend registry."}</p>;
  }
  const forms = Array.from(new Set(items.flatMap((item) => item.available_forms)));
  const placements = Array.from(new Set(items.flatMap((item) => item.allowed_placements)));
  const parameterKeys = Array.from(new Set(items.flatMap((item) => item.parameters.map((p) => p.name))));
  return <div className="manual-advanced-grid">
    <div><strong>law_id</strong><code>{lawId}</code></div>
    <div><strong>{language === "zh" ? "supported forms" : "supported forms"}</strong><code>{forms.join(" / ")}</code></div>
    <div><strong>{language === "zh" ? "allowed placements" : "allowed placements"}</strong><code>{placements.join(" / ")}</code></div>
    <div><strong>{language === "zh" ? "internal parameter keys" : "internal parameter keys"}</strong><code>{parameterKeys.join(", ")}</code></div>
    <div><strong>{language === "zh" ? "serialization / export" : "serialization / export"}</strong><code>{items.map((item) => item.function_type).join("; ")}</code></div>
  </div>;
}

function FunctionDocCard({ doc, registry, language }: { doc: FunctionDoc; registry: FunctionDefinition[]; language: Language }) {
  const t = language === "zh" ? doc.zh : doc.en;
  return <article className="manual-law-card user-law-card">
    <header className="manual-law-header">
      <div>
        <h3>{t.name}</h3>
        <p>{t.oneLine}</p>
      </div>
      <div className="manual-law-tags">{t.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
    </header>
    <div className="manual-law-user-grid">
      <section><h4>{language === "zh" ? "用途" : "Purpose"}</h4><p>{t.purpose}</p></section>
      <section><h4>{language === "zh" ? "适合的数据形状" : "Use when"}</h4><p>{t.suitable}</p></section>
      <section><h4>{language === "zh" ? "不适合的情况" : "Avoid when"}</h4><p>{t.notSuitable}</p></section>
      <section><h4>{language === "zh" ? "对 I-V 曲线的影响" : "Effect on I-V curve"}</h4><p>{t.curveEffect}</p></section>
    </div>
    <div className="manual-parameter-table">
      <h4>{language === "zh" ? "主要参数" : "Main parameters"}</h4>
      <div>{t.parameters.map(([name, meaning]) => <div className="manual-parameter-row" key={name}><span>{name}</span><p>{meaning}</p></div>)}</div>
    </div>
    <section className="manual-fit-advice"><h4>{language === "zh" ? "拟合建议" : "Fitting advice"}</h4><p>{t.fitAdvice}</p></section>
    <section className="manual-formula-view">
      <h4>{language === "zh" ? "公式" : "Formula"}</h4>
      <MathFormula latex={t.formula} className="manual-formula" />
      {t.advancedFormula ? <details className="manual-advanced-formula"><summary>{language === "zh" ? "高级公式" : "Advanced formula"}</summary><MathFormula latex={t.advancedFormula} className="manual-formula" /></details> : null}
    </section>
    <details className="manual-advanced-details">
      <summary>{language === "zh" ? "Advanced details" : "Advanced details"}</summary>
      <AdvancedFunctionDetails lawId={doc.lawId} registry={registry} language={language} />
    </details>
  </article>;
}

function RegistryGuide({ registry, language }: { registry: FunctionDefinition[]; language: Language }) {
  if (!registry.length) return <p className="muted">{language === "zh" ? "函数库还没有加载。打开 Workspace 后会从后端读取可用数学关系。" : "The function registry has not loaded yet. Open Workspace to fetch the available model functions from the backend."}</p>;
  return <div className="manual-law-list user-law-list">
    {FUNCTION_DOCS.map((doc) => <FunctionDocCard key={doc.lawId} doc={doc} registry={registry} language={language} />)}
  </div>;
}

function EnglishManual({ registry, appVersion }: { registry: FunctionDefinition[]; appVersion: string }) {
  return <>
    <div className="card doc-hero manual-hero">
      <div>
        <h2>User manual</h2>
        <p className="muted">Complete operating guide for IV-fitter Web v{appVersion}. This page replaces the previous User guide, Function guide, Fitting logic, and Fit & convergence pages.</p>
      </div>
    </div>
    <InlineNav language="en" />
    <div className="doc-grid manual-grid">
      <ManualSection id="workflow" title="1. Basic workflow" wide>
        <ol className="doc-steps">
          <li><strong>Import data in the Data tab.</strong> Use a plain V/I CSV, pasted two-column data, or a HappyMeasure export. The app starts empty on purpose so you do not accidentally fit demo data.</li>
          <li><strong>Select exactly one trace.</strong> Multi-trace files stay separated. The selected trace is the only trace used for fitting, residuals, plots, and reports.</li>
          <li><strong>Inspect the raw table first.</strong> Confirm voltage/current columns, sign convention, point count, and obvious outliers before touching the model.</li>
          <li><strong>Start with the smallest defensible model.</strong> A common first model is D1 + Rs + Rsh. Add empirical branches only when residuals show a real missing behavior.</li>
          <li><strong>Set initial values and bounds.</strong> Open Initials for each component. Initial values guide the optimizer; bounds define what values are physically allowed.</li>
          <li><strong>Run fit, then read the status, warning panel, residual plots, and parameter explanations together.</strong> A numerical convergence flag is not a scientific verdict by itself.</li>
          <li><strong>Export only after review.</strong> Check that the selected trace, model, parameters, warnings, software version, and report text match what you intend to share.</li>
        </ol>
      </ManualSection>

      <ManualSection id="data" title="2. Data import and trace selection">
        <p>The Data tab is the only place for loading and inspecting raw trace data. The Workspace should stay focused on modeling and fitting.</p>
        <ul className="doc-steps">
          <li><strong>Supported input:</strong> CSV/TXT/DAT files, pasted tables, ordinary voltage/current columns, and HappyMeasure single- or multi-trace exports.</li>
          <li><strong>Column detection:</strong> the importer tries to identify voltage and current names. If names are ambiguous, it may fall back to numeric columns and surface a warning.</li>
          <li><strong>Multi-trace behavior:</strong> each imported trace gets its own selector entry. Other traces remain available, but they are not silently included in the active fit.</li>
          <li><strong>Preview table:</strong> use it to check sign, units, missing rows, repeated points, and whether the trace identity is what you expect.</li>
        </ul>
      </ManualSection>

      <ManualSection id="model" title="3. Model Builder concepts">
        <p>The app presents the model as <strong>Main path</strong> plus <strong>Junction branches</strong>. Internally, legacy keys such as core, series, and parallel still exist for compatibility, but the normal user mental model is path plus branches.</p>
        <ul className="doc-steps">
          <li><strong>Main path:</strong> elements that carry terminal current and create voltage drop before the junction. Rs belongs here.</li>
          <li><strong>Junction branches:</strong> elements evaluated at the junction voltage that add to terminal current. A diode branch and Rsh belong here.</li>
          <li><strong>Nickname:</strong> user-facing component name. Rs and Rsh are nicknames for Ohmic-law instances, not separate mathematical laws.</li>
          <li><strong>Polarity:</strong> controls whether an empirical term is active in forward, reverse, or both bias directions.</li>
          <li><strong>Initials and bounds:</strong> edit starting values, lower/upper bounds, and whether each parameter is fitted or fixed.</li>
        </ul>
      </ManualSection>

      <ManualSection id="functions" title="4. Function guide: how each model term behaves" wide>
        <p>Each model term below is explained by the physical behavior it represents, when it helps, how it changes the I-V curve, and how to fit it safely. Advanced implementation details are hidden by default.</p>
        <p><strong>Example:</strong> Ohmic law can be written as <InlineFormula latex="V = IR" /> or <InlineFormula latex="I = \\frac{V}{R}" />. Rs uses it as a main-path voltage drop; Rsh uses it as a branch current.</p>
        <RegistryGuide registry={registry} language="en" />
      </ManualSection>

      <ManualSection id="logic" title="5. Fitting logic and equations" wide>
        <p>For the common D1 + Rs + Rsh model, the solver uses an implicit junction-voltage relation. The main-path drop changes the voltage seen by the branch currents.</p>
        <div className="manual-equations">
          <MathFormula latex="V_j = V_{ext} - IR_s" className="manual-formula" />
          <MathFormula latex="I_D = I_0\\left[\\exp\\!\\left(\\frac{V_j}{nV_T}\\right)-1\\right]" className="manual-formula" />
          <MathFormula latex="I_{Rsh} = \\frac{V_j}{R_{sh}}" className="manual-formula" />
          <MathFormula latex="I = I_D + I_{Rsh}" className="manual-formula" />
          <MathFormula latex="I = I_0\\left[\\exp\\!\\left(\\frac{V_{ext}-IR_s}{nV_T}\\right)-1\\right] + \\frac{V_{ext}-IR_s}{R_{sh}}" className="manual-formula manual-formula-emphasis" />
        </div>
        <p>Because <InlineFormula latex="I" /> appears on both sides when Rs is present, the backend solves for the current that makes the residual equal to zero at each voltage point.</p>
        <p>The experimental <code>graph_dc</code> solver assembles equations from a topology graph. Treat it as experimental and cross-check before reporting.</p>
      </ManualSection>

      <ManualSection id="convergence" title="6. Fit setup, convergence, and quality gates">
        <p>Convergence means the optimizer found a local numerical minimum. It does not prove the model is unique, physically correct, or sufficient.</p>
        <ol className="doc-steps">
          <li>Apply optional voltage range limits.</li>
          <li>Optionally exclude likely plateau or outlier points.</li>
          <li>Pack only parameters whose Fit checkbox is enabled.</li>
          <li>Predict current using the selected solver mode.</li>
          <li>Compute residuals using the selected weighting and residual floor.</li>
          <li>Optimize with bounded least-squares, optionally with multistart.</li>
          <li>Reject non-finite, exploded, or poor-quality results before showing them as reportable.</li>
        </ol>
        <p><strong>Initial value rule of thumb:</strong> <InlineFormula latex="I_0" /> often spans many decades. Silicon-like junctions may start near <code>1e-12 A</code>; wide-bandgap or very low-leakage devices may need <code>1e-20 A</code> or smaller. Use residuals and multistart when uncertain.</p>
      </ManualSection>

      <ManualSection id="plots" title="7. Reading plots and residuals">
        <ul className="doc-steps">
          <li><strong>Linear I-V:</strong> useful for large-current behavior but can hide low-current regions.</li>
          <li><strong>Log |I|:</strong> better for semiconductor traces spanning many orders of magnitude.</li>
          <li><strong>Signed residual:</strong> shows where the model over- or under-predicts current.</li>
          <li><strong>Log |residual|:</strong> reveals mismatch across voltage regions even when absolute currents vary widely.</li>
          <li><strong>Abnormal range warning:</strong> if plotted current reaches unrealistic magnitudes, treat the result as numerical divergence until proven otherwise.</li>
        </ul>
      </ManualSection>

      <ManualSection id="parameters" title="8. Parameters, warnings, and reports">
        <p>The parameter table is part of the diagnosis, not just a numeric output. Read value, standard error, bounds, fit/fixed state, and the inline physical explanation together.</p>
        <ul className="doc-steps">
          <li><strong><InlineFormula latex="n" />:</strong> diode ideality factor. Values near 1 often suggest diffusion current; near 2 often suggest recombination; values above 2 deserve model/data review.</li>
          <li><strong><InlineFormula latex="I_0" />:</strong> saturation or current scale. Large or unstable values often point to initial-value, leakage, or model-structure problems.</li>
          <li><strong><InlineFormula latex="R_s" />:</strong> controls high-current voltage drop and forward-bias roll-off.</li>
          <li><strong><InlineFormula latex="R_{sh}" />:</strong> controls low-bias leakage. Smaller <InlineFormula latex="R_{sh}" /> means stronger leakage.</li>
          <li><strong>Warnings:</strong> must be reviewed before export. A green status does not erase warning context.</li>
          <li><strong>Reports:</strong> include reproducibility metadata and should match the selected trace and current model.</li>
        </ul>
      </ManualSection>

      <ManualSection id="troubleshooting" title="9. Troubleshooting">
        <ul className="doc-steps">
          <li><strong>Fit explodes:</strong> narrow the voltage range, reset initial values, enable multistart, and check whether the model has enough branches.</li>
          <li><strong>Parameters stick to bounds:</strong> the parameter may be poorly identified, the bounds may be too tight, or the model may be missing a current path.</li>
          <li><strong>Residuals have structure:</strong> add a physically motivated branch only after the pattern is repeatable and trace-specific artifacts are ruled out.</li>
          <li><strong>Reverse-bias region is invisible:</strong> use log |I| and log residual plots instead of relying on linear I-V.</li>
          <li><strong>Multi-trace confusion:</strong> confirm the selected trace dropdown before running or reporting a fit.</li>
        </ul>
      </ManualSection>

      <ManualSection id="light-response" title="10. Light-response modeling">
        <p>Use light-response terms only after the dark trace has a defensible fit. Start with one photocurrent component, then add voltage dependence only if residuals require it.</p>
        <ul className="doc-steps">
          <li><strong>Constant photocurrent:</strong> <InlineFormula latex="I_{ph}=s_{dir}I_{ph0}" /> for approximately bias-independent photodiode current.</li>
          <li><strong>Voltage-dependent photocurrent:</strong> <InlineFormula latex="I_{ph}(V_j)" /> for field-assisted collection or trap-assisted gain. Advanced threshold terms are fixed by default to reduce overfitting.</li>
          <li><strong>Photoconductive branch:</strong> <InlineFormula latex="I_{pc}=G_{ph}V_j" /> for light-induced conductance.</li>
          <li><strong>Photo-modulated main path:</strong> <InlineFormula latex="V_{drop}=I\frac{R_0}{1+g_{ph}}" /> for light-modulated transport or contact resistance.</li>
        </ul>
        <p>Recommended sequence: fit dark trace → seed or fix dark-like parameters → add a light-response term → fit selected light trace → inspect residuals and warnings.</p>
        <p>Future features: one-click photodiode presets and direct two-trace <InlineFormula latex="\Delta I(V)=I_{light}(V)-I_{dark}(V)" /> preview.</p>
      </ManualSection>
    </div>
  </>;
}

function ChineseManual({ registry, appVersion }: { registry: FunctionDefinition[]; appVersion: string }) {
  return <>
    <div className="card doc-hero manual-hero">
      <div>
        <h2>用户手册</h2>
        <p className="muted">IV-fitter Web v{appVersion} 的完整使用说明。这里合并了原来的 User guide、Function guide、Fitting logic、Fit & convergence。</p>
      </div>
    </div>
    <InlineNav language="zh" />
    <div className="doc-grid manual-grid">
      <ManualSection id="workflow" title="1. 基本工作流程" wide>
        <ol className="doc-steps">
          <li><strong>先到 Data 导入数据。</strong> 支持普通 V/I CSV、粘贴表格、TXT/DAT、HappyMeasure 单 trace 或多 trace 导出。应用默认空白启动，避免误拟合示例数据。</li>
          <li><strong>只选择一条 trace。</strong> 多 trace 文件会保留为多个下拉选项；当前拟合、残差、图表和报告只使用选中的那一条。</li>
          <li><strong>先检查原始表格。</strong> 确认电压/电流列、符号、点数、异常点和 trace 身份。</li>
          <li><strong>从最小合理模型开始。</strong> 常见起点是 D1 + Rs + Rsh。只有当残差说明确实缺少行为时，再加入经验支路。</li>
          <li><strong>设置初值和边界。</strong> 每个组件的 Initials 里可以设置初值、上下界，以及是否参与拟合。</li>
          <li><strong>运行后一起看状态、warnings、残差图和参数解释。</strong> 数值收敛不等于物理正确。</li>
          <li><strong>确认后再导出。</strong> 报告前检查选中 trace、模型、参数、warnings、软件版本和报告文字。</li>
        </ol>
      </ManualSection>

      <ManualSection id="data" title="2. 数据导入和 trace 选择">
        <p>Data 页负责导入和检查原始数据；Workspace 负责建模和拟合。</p>
        <ul className="doc-steps">
          <li><strong>支持格式：</strong>CSV/TXT/DAT、粘贴表格、普通 voltage/current 列，以及 HappyMeasure 单/多 trace 导出。</li>
          <li><strong>列识别：</strong>导入器会尝试识别电压和电流列；列名不清楚时可能回退到数值列，并给出 warning。</li>
          <li><strong>多 trace：</strong>每条 trace 保留独立身份，不会被偷偷合并到一次拟合里。</li>
          <li><strong>预览表：</strong>用来检查符号、单位、缺失行、重复点和 trace 身份。</li>
        </ul>
      </ManualSection>

      <ManualSection id="model" title="3. Model Builder 概念">
        <p>用户看到的是 <strong>主路 Main path</strong> 和 <strong>结点支路 Junction branches</strong>。内部仍有 core/series/parallel 兼容字段，但普通用户不需要用这些内部分类思考。</p>
        <ul className="doc-steps">
          <li><strong>主路：</strong>承载端口电流并产生压降，例如 Rs。</li>
          <li><strong>结点支路：</strong>在结点电压下产生电流并加入总电流，例如 diode 和 Rsh。</li>
          <li><strong>Nickname：</strong>用户可读名称。Rs 和 Rsh 是 Ohmic law 的昵称，不是两个不同数学定律。</li>
          <li><strong>Polarity：</strong>决定经验项在正向、反向或双向偏压下生效。</li>
          <li><strong>Initials and bounds：</strong>控制优化起点、允许范围，以及参数是否固定。</li>
        </ul>
      </ManualSection>

      <ManualSection id="functions" title="4. 函数说明：每个模型项怎样影响曲线" wide>
        <p>下面每个模型项都按实际物理行为说明：它描述什么、什么时候有用、怎样改变 I-V 曲线、以及怎样更稳地拟合。高级实现细节默认折叠。</p>
        <p><strong>例子：</strong>Ohmic law 可写成 <InlineFormula latex="V = IR" /> 或 <InlineFormula latex="I = \\frac{V}{R}" />。Rs 把它作为主路压降；Rsh 把它作为支路电流。</p>
        <RegistryGuide registry={registry} language="zh" />
      </ManualSection>

      <ManualSection id="logic" title="5. 拟合逻辑和方程" wide>
        <p>对于常见 D1 + Rs + Rsh 模型，求解器使用隐式结点电压关系。主路压降会改变支路实际看到的电压。</p>
        <div className="manual-equations">
          <MathFormula latex="V_j = V_{ext} - IR_s" className="manual-formula" />
          <MathFormula latex="I_D = I_0\\left[\\exp\\!\\left(\\frac{V_j}{nV_T}\\right)-1\\right]" className="manual-formula" />
          <MathFormula latex="I_{Rsh} = \\frac{V_j}{R_{sh}}" className="manual-formula" />
          <MathFormula latex="I = I_D + I_{Rsh}" className="manual-formula" />
          <MathFormula latex="I = I_0\\left[\\exp\\!\\left(\\frac{V_{ext}-IR_s}{nV_T}\\right)-1\\right] + \\frac{V_{ext}-IR_s}{R_{sh}}" className="manual-formula manual-formula-emphasis" />
        </div>
        <p>有 Rs 时，<InlineFormula latex="I" /> 同时出现在等式两边，所以后端会对每个外部电压点求一个让 residual 为零的电流。</p>
        <p><code>graph_dc</code> 会从拓扑图装配 DC 方程，目前仍是实验功能，报告前需要交叉检查。</p>
      </ManualSection>

      <ManualSection id="convergence" title="6. 拟合设置、收敛和质量门控">
        <p>收敛只表示优化器找到当前目标函数的局部数值最小值，不证明模型唯一、必要或物理真实。</p>
        <ol className="doc-steps">
          <li>应用可选电压范围。</li>
          <li>可选排除疑似平台或异常点。</li>
          <li>只打包勾选 Fit 的自由参数。</li>
          <li>用选定 solver 预测电流。</li>
          <li>按 weighting 和 residual floor 计算残差。</li>
          <li>在边界内做 least-squares 优化，可选 multistart。</li>
          <li>最终结果还要经过有限性、爆炸值和质量门控检查，才应显示为可报告。</li>
        </ol>
        <p><strong>初值经验：</strong><InlineFormula latex="I_0" /> 可能跨很多数量级。普通硅结可从 <code>1e-12 A</code> 附近开始；宽禁带或极低漏电器件可能需要 <code>1e-20 A</code> 或更小。不确定时看残差并启用 multistart。</p>
      </ManualSection>

      <ManualSection id="plots" title="7. 如何读图和残差">
        <ul className="doc-steps">
          <li><strong>线性 I-V：</strong>适合看大电流区，但会隐藏低电流区。</li>
          <li><strong>Log |I|：</strong>更适合跨多个数量级的半导体曲线。</li>
          <li><strong>带符号 residual：</strong>显示模型在哪些电压区高估或低估。</li>
          <li><strong>Log |residual|：</strong>在电流跨度很大时更容易看出失配区域。</li>
          <li><strong>显示范围异常：</strong>如果曲线到达不现实的大电流，先按数值发散处理。</li>
        </ul>
      </ManualSection>

      <ManualSection id="parameters" title="8. 参数、warnings 和报告">
        <p>参数表不是单纯数值输出，而是诊断的一部分。需要同时看数值、不确定度、边界、固定/拟合状态和物理解释。</p>
        <ul className="doc-steps">
          <li><strong><InlineFormula latex="n" />：</strong>理想因子。接近 1 常见于扩散主导，接近 2 常见于复合主导，大于 2 通常需要检查模型或数据。</li>
          <li><strong><InlineFormula latex="I_0" />：</strong>饱和电流/电流尺度。过大或不稳定常指向初值、漏电或模型结构问题。</li>
          <li><strong><InlineFormula latex="R_s" />：</strong>控制高电流区压降和正向高偏压弯折。</li>
          <li><strong><InlineFormula latex="R_{sh}" />：</strong>控制低偏压漏电，越小表示漏电越强。</li>
          <li><strong>Warnings：</strong>报告前必须逐条看。绿色状态不代表 warnings 可以忽略。</li>
          <li><strong>报告：</strong>应包含复现实验所需的 trace、模型、参数和版本信息。</li>
        </ul>
      </ManualSection>

      <ManualSection id="troubleshooting" title="9. 常见问题排查">
        <ul className="doc-steps">
          <li><strong>拟合爆炸：</strong>缩小电压范围，重置初值，启用 multistart，检查模型是否缺少支路。</li>
          <li><strong>参数贴边界：</strong>可能是参数不可辨识、边界太紧，或模型缺少电流通道。</li>
          <li><strong>残差有结构：</strong>只有在模式可重复且排除 trace 问题后，才加入有物理意义的支路。</li>
          <li><strong>反偏段看不见：</strong>不要只看线性 I-V，用 Log |I| 和 Log residual。</li>
          <li><strong>多 trace 混淆：</strong>运行和报告前确认下拉框选中的 trace。</li>
        </ul>
      </ManualSection>

      <ManualSection id="light-response" title="10. 光响应建模">
        <p>先把 dark trace 拟合到合理，再加光响应项。先从一个光电流组件开始；只有残差确实需要时，才打开电压相关参数。</p>
        <ul className="doc-steps">
          <li><strong>Constant photocurrent：</strong><InlineFormula latex="I_{ph}=s_{dir}I_{ph0}" />，适合近似与偏压无关的光电流。</li>
          <li><strong>Voltage-dependent photocurrent：</strong><InlineFormula latex="I_{ph}(V_j)" />，适合场辅助收集或 trap-assisted gain。高级 threshold 参数默认 fixed，避免过拟合。</li>
          <li><strong>Photoconductive branch：</strong><InlineFormula latex="I_{pc}=G_{ph}V_j" />，表示光照增加并联导电通道。</li>
          <li><strong>Photo-modulated main path：</strong><InlineFormula latex="V_{drop}=I\frac{R_0}{1+g_{ph}}" />，表示光照改变主路 transport/contact/channel。</li>
        </ul>
        <p>推荐流程：先拟合 dark trace → seed 或固定 dark-like 参数 → 加一个光响应项 → 拟合选中的 light trace → 检查残差和 warnings。</p>
        <p>未来功能：一键 photodiode presets，以及双 trace <InlineFormula latex="\Delta I(V)=I_{light}(V)-I_{dark}(V)" /> 预览。</p>
      </ManualSection>
    </div>
  </>;
}

export function UserDocumentationPage({ registry, appVersion, language = "en" }: { view?: AppView; registry: FunctionDefinition[]; appVersion: string; language?: Language }) {
  return <div className="doc-page">
    {language === "zh"
      ? <ChineseManual registry={registry} appVersion={appVersion} />
      : <EnglishManual registry={registry} appVersion={appVersion} />}
  </div>;
}
