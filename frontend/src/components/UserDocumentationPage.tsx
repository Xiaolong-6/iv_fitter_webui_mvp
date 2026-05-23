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

function RegistryGuide({ registry, language }: { registry: FunctionDefinition[]; language: Language }) {
  const lawGroups = registry.reduce<Record<string, FunctionDefinition[]>>((acc, item) => {
    (acc[item.law_id] ||= []).push(item);
    return acc;
  }, {});
  if (!registry.length) return <p className="muted">{language === "zh" ? "函数库还没有加载。打开 Workspace 后会从后端读取可用数学关系。" : "The function registry has not loaded yet. Open Workspace to fetch the available laws from the backend."}</p>;

  return <div className="manual-law-list">
    {Object.entries(lawGroups).map(([law, items]) => {
      const first = items[0];
      const params = Array.from(new Set(items.flatMap((item) => item.parameters.map((p) => `${p.name}${p.unit ? ` (${p.unit})` : ""}`))));
      const forms = Array.from(new Set(items.flatMap((item) => item.available_forms)));
      const placements = Array.from(new Set(items.flatMap((item) => item.allowed_placements)));
      return <article className="manual-law-card" key={law}>
        <h3>{first.law_name}</h3>
        <p>{first.help_text}</p>
        <p><strong>{language === "zh" ? "典型公式" : "Canonical equation"}:</strong> <MathFormula latex={first.canonical_equation} inline className="manual-inline-formula" /></p>
        <p><strong>{language === "zh" ? "参数" : "Parameters"}:</strong> {params.join(", ")}</p>
        <details>
          <summary>{language === "zh" ? "高级细节" : "Advanced details"}</summary>
          <p><strong>law_id:</strong> <code>{law}</code></p>
          <p><strong>{language === "zh" ? "计算形式" : "Forms"}:</strong> {forms.join(" / ")}</p>
          <p><strong>{language === "zh" ? "放置位置" : "Placements"}:</strong> {placements.join(" / ")}</p>
          <p><strong>{language === "zh" ? "后端适配器" : "Backend adapters"}:</strong> {items.map((item) => `${item.function_type} (${item.display_name})`).join("; ")}</p>
        </details>
      </article>;
    })}
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

      <ManualSection id="functions" title="4. Function guide: laws, forms, placements" wide>
        <p>A function is a mathematical law first. It is not intrinsically series or parallel. A component instance chooses a law, an evaluation form, and a placement.</p>
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

      <ManualSection id="functions" title="4. 函数说明：数学关系、计算形式、放置位置" wide>
        <p>函数首先是数学关系，本身不天然属于串联或并联。组件实例再选择计算形式和电路位置。</p>
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
