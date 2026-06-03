import { useEffect, useRef, useState, type ReactNode } from "react";
import type { FunctionDefinition } from "../model/types";
import type { Language } from "../model/i18n";
import { MathFormula } from "./MathFormula";
import {
  USER_FUNCTION_DOCS,
  type UserFunctionDoc,
} from "../content/userDocumentationContent";

type ManualSectionKey =
  | "overview"
  | "workflow"
  | "data"
  | "builder"
  | "components"
  | "equations"
  | "fitting"
  | "diagnostics"
  | "report"
  | "troubleshooting";

type Step = { n: string; title: string; text: string };
type Row = [string, string, string];
type ManualCopy = {
  title: string;
  subtitle: string;
  nav: Array<{ id: ManualSectionKey; label: string; short: string }>;
};

const MANUAL_COPY: Record<Language, ManualCopy> = {
  en: {
    title: "User Manual",
    subtitle: "A practical guide to building, fitting, checking, and reporting I-V circuit models.",
    nav: [
      { id: "overview", label: "What this software does", short: "Overview" },
      { id: "workflow", label: "Basic workflow", short: "Workflow" },
      { id: "data", label: "Import and choose data", short: "Data" },
      { id: "builder", label: "Build the circuit graph", short: "Builder" },
      { id: "components", label: "Components and parameters", short: "Parts" },
      { id: "equations", label: "How the graph becomes equations", short: "Equations" },
      { id: "fitting", label: "Run fitting", short: "Fitting" },
      { id: "diagnostics", label: "Read diagnostics", short: "Check" },
      { id: "report", label: "Export a defensible report", short: "Report" },
      { id: "troubleshooting", label: "Troubleshooting", short: "Help" },
    ],
  },
  zh: {
    title: "用户手册",
    subtitle: "从数据导入、电路建模、拟合诊断到报告导出的实用说明。",
    nav: [
      { id: "overview", label: "这个软件做什么", short: "概览" },
      { id: "workflow", label: "基本流程", short: "流程" },
      { id: "data", label: "导入并选择数据", short: "数据" },
      { id: "builder", label: "搭建电路图", short: "建模" },
      { id: "components", label: "组件和参数", short: "组件" },
      { id: "equations", label: "图如何变成方程", short: "方程" },
      { id: "fitting", label: "运行拟合", short: "拟合" },
      { id: "diagnostics", label: "阅读诊断", short: "诊断" },
      { id: "report", label: "导出可信报告", short: "报告" },
      { id: "troubleshooting", label: "常见问题", short: "排查" },
    ],
  },
};

const WORKFLOW_STEPS: Record<Language, Step[]> = {
  en: [
    {
      n: "1",
      title: "Import one data source",
      text: "Load CSV/TXT/DAT data, paste a table, open a HappyMeasure export, or generate a synthetic trace for testing.",
    },
    {
      n: "2",
      title: "Select the trace",
      text: "All plots, fitting, residuals, and reports use the selected trace. Multi-trace files are preserved; they are not silently merged.",
    },
    {
      n: "3",
      title: "Build the model",
      text: "Use Model Builder to draw a two-terminal circuit from V to GND. Only the connected V-to-GND subgraph is used for fitting.",
    },
    {
      n: "4",
      title: "Set parameters",
      text: "Choose initial values, lower/upper bounds, units, and which parameters are fitted or fixed.",
    },
    {
      n: "5",
      title: "Run and diagnose",
      text: "Fit the selected trace, then inspect warnings, residuals, parameter bounds, uncertainty, and physical plausibility.",
    },
    {
      n: "6",
      title: "Report only after review",
      text: "Export the report when the result is numerically valid and scientifically defensible for your purpose.",
    },
  ],
  zh: [
    {
      n: "1",
      title: "导入一个数据源",
      text: "导入 CSV/TXT/DAT、粘贴表格、打开 HappyMeasure 导出，或生成 synthetic trace 用于测试。",
    },
    {
      n: "2",
      title: "选择要拟合的 trace",
      text: "图、拟合、残差和报告都只对应当前选中的 trace。多 trace 文件会保留身份，不会被偷偷合并。",
    },
    {
      n: "3",
      title: "搭建模型",
      text: "在 Model Builder 中画出从 V 到 GND 的两端电路。只有连通的 V-to-GND 子图会进入拟合。",
    },
    {
      n: "4",
      title: "设置参数",
      text: "设置初值、上下界、单位，以及每个参数是参与拟合还是固定。",
    },
    {
      n: "5",
      title: "运行并诊断",
      text: "对选中 trace 拟合，然后检查 warnings、残差、参数边界、不确定度和物理合理性。",
    },
    {
      n: "6",
      title: "确认后再报告",
      text: "只有结果在数值上有效、并且科学解释站得住时，才导出报告。",
    },
  ],
};

function ManualSection({
  id,
  title,
  children,
  wide = false,
}: {
  id: ManualSectionKey;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <section
      id={id}
      className={
        wide
          ? "card doc-card wide-card manual-section"
          : "card doc-card manual-section"
      }
    >
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function FormulaStack({ formulas }: { formulas: string[] }) {
  return (
    <div className="manual-equations">
      {formulas.map((latex) => (
        <MathFormula key={latex} latex={latex} className="manual-formula" />
      ))}
    </div>
  );
}

function StepCards({ steps }: { steps: Step[] }) {
  return (
    <div className="manual-step-cards">
      {steps.map((step) => (
        <article key={step.n} className="manual-step-card">
          <span>{step.n}</span>
          <h3>{step.title}</h3>
          <p>{step.text}</p>
        </article>
      ))}
    </div>
  );
}

function ThreeColumnTable({
  rows,
  headers,
}: {
  rows: Row[];
  headers: [string, string, string];
}) {
  return (
    <div className="manual-table three-col">
      <div className="manual-table-head">
        {headers.map((h) => (
          <strong key={h}>{h}</strong>
        ))}
      </div>
      {rows.map((row) => (
        <div className="manual-table-row" key={row.join("|")}>
          {row.map((cell) => (
            <p key={cell}>{cell}</p>
          ))}
        </div>
      ))}
    </div>
  );
}

function SectionNavigator({
  language,
  active,
  onSelect,
}: {
  language: Language;
  active: ManualSectionKey;
  onSelect: (id: ManualSectionKey) => void;
}) {
  const items = MANUAL_COPY[language].nav;
  return (
    <nav
      className="manual-section-rail"
      aria-label={language === "zh" ? "手册章节快速定位" : "Manual section quick locator"}
    >
      <div className="manual-section-rail-spine" aria-hidden="true" />
      {items.map((item, index) => (
        <button
          key={item.id}
          type="button"
          className={`manual-rail-node manual-rail-node-${index % 4}${active === item.id ? " active" : ""}`}
          onClick={() => onSelect(item.id)}
          aria-label={item.label}
          aria-current={active === item.id ? "true" : undefined}
        >
          <span className="manual-rail-shape" aria-hidden="true" />
          <span className="manual-rail-tooltip">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

function FunctionGuide({
  registry,
  language,
}: {
  registry: FunctionDefinition[];
  language: Language;
}) {
  const visibleDocs = USER_FUNCTION_DOCS.slice(0, 8);
  const registryCount = registry.length;
  const t = (doc: UserFunctionDoc) => (language === "zh" ? doc.zh : doc.en);
  return (
    <>
      <p>
        {language === "zh"
          ? "组件列表中的 Resistance、Shockley diode、Constant current 和 Custom 是入口。它们不是最终答案；真正的模型由你放到画布上的实例、连线、参数和表达式共同决定。"
          : "The Components list is the entry point: Resistance, Shockley diode, Constant current, and Custom. They are not the final answer by themselves; the actual model is defined by the instances you place, wire, parameterize, and name."}
      </p>
      <ThreeColumnTable
        headers={
          language === "zh"
            ? ["组件", "适合什么", "注意什么"]
            : ["Component", "Use when", "Watch out for"]
        }
        rows={
          language === "zh"
            ? [
                ["Resistance", "线性电阻、电流泄漏、串联/并联欧姆项。", "同一个数学关系放在不同位置会有不同物理意义。"],
                ["Shockley diode", "指数型二极管电流或类似激活过程。", "I0、n、T 强相关；温度默认固定，除非数据确实支持。"],
                ["Constant current", "光电流、背景电流、偏置无关电流项。", "方向和符号要和实验接线一致。"],
                ["Custom", "已有组件不能表达的关系。", "表达式越自由，越需要收紧参数和解释物理来源。"],
              ]
            : [
                ["Resistance", "Linear resistance, leakage, series access resistance, or shunt conductance.", "The same law has different meaning depending on where it is connected."],
                ["Shockley diode", "Exponential diode-like current or activated transport.", "I0, n, and T can be highly correlated; keep T fixed unless the data support fitting it."],
                ["Constant current", "Photocurrent, background current, or a bias-independent branch.", "Check sign convention against the measurement wiring."],
                ["Custom", "A relation not covered by the built-in components.", "More freedom needs tighter bounds and a clearer physical reason."],
              ]
        }
      />
      <p className="manual-keyidea">
        {language === "zh"
          ? `当前后端 registry 已加载 ${registryCount} 个函数定义。下面是常用函数的用途摘要；高级内部 ID 不需要普通用户记住。`
          : `The backend registry currently exposes ${registryCount} function definitions. Below is a practical summary of common functions; ordinary users do not need to memorize internal IDs.`}
      </p>
      <div className="manual-recipe-grid" aria-label={language === "zh" ? "常用函数摘要" : "Common function summary"}>
          {visibleDocs.map((doc) => {
            const copy = t(doc);
            return (
              <article className="manual-law-card user-law-card" key={doc.lawId}>
                <header className="manual-law-header">
                  <div>
                    <h3>{copy.name}</h3>
                    <p>{copy.oneLine}</p>
                  </div>
                </header>
                <p>{copy.purpose}</p>
                <p>
                  <strong>{language === "zh" ? "拟合建议：" : "Fit advice:"}</strong>{" "}
                  {copy.fitAdvice}
                </p>
              </article>
            );
          })}
      </div>
    </>
  );
}

function renderManualSection(
  section: ManualSectionKey,
  registry: FunctionDefinition[],
  language: Language,
) {
  const zh = language === "zh";
  switch (section) {
    case "overview":
      return (
        <ManualSection
          id="overview"
          title={zh ? "1. 这个软件做什么" : "1. What this software does"}
          wide
        >
          {zh ? (
            <>
              <p>
                IV-fitter 用来把 I-V 数据和可解释的两端等效电路联系起来。它不是只给你一条漂亮曲线；
                它会让你明确看到数据、模型图、组件方程、参数、拟合质量、警告和报告之间的关系。
              </p>
              <p>
                你在 Model Builder 里画的是一个从 <strong>V</strong> 到 <strong>GND</strong> 的电路图。
                软件会自动检测哪些组件真的连在 V-to-GND 通路上，只有这些组件进入拟合。
                半连接或断开的支路会保留在画布上，但会被标记并从拟合中忽略。
              </p>
              <p className="manual-keyidea">
                目标不是“让优化器成功停止”，而是得到一个能解释数据、参数可信、诊断清楚、报告可复现的模型。
              </p>
            </>
          ) : (
            <>
              <p>
                IV-fitter connects measured I-V data to an interpretable
                two-terminal equivalent circuit. It is not just a curve-drawing
                tool: it shows how data, circuit graph, component equations,
                parameters, diagnostics, and reports fit together.
              </p>
              <p>
                In Model Builder you draw a graph from <strong>V</strong> to{" "}
                <strong>GND</strong>. The software detects which components are
                actually on a connected V-to-GND path. Only those active
                components enter fitting. Half-connected or disconnected
                branches remain visible on the canvas, but are ignored by the
                fitter and surfaced as warnings.
              </p>
              <p className="manual-keyidea">
                The goal is not merely optimizer success. The goal is a model
                that explains the data, has credible parameters, carries clear
                diagnostics, and can be reproduced in a report.
              </p>
            </>
          )}
        </ManualSection>
      );
    case "workflow":
      return (
        <ManualSection
          id="workflow"
          title={zh ? "2. 基本流程" : "2. Basic workflow"}
          wide
        >
          <StepCards steps={WORKFLOW_STEPS[language]} />
          <p className="warning info">
            {zh
              ? "建议每次只改变一件事：换 trace、改模型、改初值/边界、改拟合设置。这样 residual 和 warning 才容易解释。"
              : "Change one thing at a time: trace, model structure, initials/bounds, or fitting settings. This keeps residuals and warnings interpretable."}
          </p>
        </ManualSection>
      );
    case "data":
      return (
        <ManualSection
          id="data"
          title={zh ? "3. 导入并选择数据" : "3. Import and choose data"}
        >
          <ul className="doc-steps">
            {zh ? (
              <>
                <li>支持 CSV/TXT/DAT、粘贴表格、HappyMeasure 导出和 synthetic trace。</li>
                <li>导入后先确认电压列、电流列、单位、符号和点数。</li>
                <li>多 trace 文件会保留 trace 身份；拟合只使用当前选中的 trace。</li>
                <li>先检查 compliance 平台、异常点、重复电压、符号反转和明显接线问题。</li>
              </>
            ) : (
              <>
                <li>Use CSV/TXT/DAT files, pasted tables, HappyMeasure exports, or synthetic traces.</li>
                <li>After import, confirm voltage/current columns, units, sign convention, and point count.</li>
                <li>Multi-trace files preserve trace identity; fitting uses only the selected trace.</li>
                <li>Inspect compliance plateaus, outliers, duplicate voltages, sign reversal, and obvious wiring issues before fitting.</li>
              </>
            )}
          </ul>
        </ManualSection>
      );
    case "builder":
      return (
        <ManualSection
          id="builder"
          title={zh ? "4. 搭建电路图" : "4. Build the circuit graph"}
          wide
        >
          <ThreeColumnTable
            headers={
              zh
                ? ["画布元素", "含义", "进入拟合的条件"]
                : ["Canvas item", "Meaning", "When it enters fitting"]
            }
            rows={
              zh
                ? [
                    ["V", "外部施加电压端。", "必须和 GND 之间存在完整通路。"],
                    ["GND", "参考端，电势为 0。", "必须和 V 连通。"],
                    ["组件方框", "一个可拟合数学关系的实例。", "两个端口都接入 V-to-GND 活跃子图。"],
                    ["黑点 / junction", "公共电气节点，连接到同一点的线共享同一电压。", "节点本身不拟合，但决定每个组件看到的电压差。"],
                    ["虚线", "画布上可见但未进入拟合的开放支路。", "补齐连接后才可能进入拟合。"],
                  ]
                : [
                    ["V", "The externally applied voltage terminal.", "A complete path from V to GND must exist."],
                    ["GND", "The reference terminal, fixed at 0 V.", "It must be connected back to V."],
                    ["Component box", "One instance of a mathematical relation.", "Both ports must be part of the active V-to-GND subgraph."],
                    ["Black dot / junction", "A common electrical node; connected wires share one voltage.", "The node itself is not fitted, but it defines component voltage differences."],
                    ["Dashed wire", "A visible branch that is currently open or ignored.", "It can enter fitting only after the connection is completed."],
                  ]
            }
          />
          <p className="manual-keyidea">
            {zh
              ? "如果画布显示的连接和你心里想的电路不一致，先修画布。拟合器只相信图，不会猜你的意图。"
              : "If the visible graph does not match the circuit in your head, fix the graph first. The fitter uses the graph, not your intention."}
          </p>
        </ManualSection>
      );
    case "components":
      return (
        <ManualSection
          id="components"
          title={zh ? "5. 组件和参数" : "5. Components and parameters"}
          wide
        >
          <FunctionGuide registry={registry} language={language} />
          <p className="warning info">
            {zh
              ? "每个参数都要有初值、单位、上下界和 fit/fixed 状态。不要用无限自由度去追噪声。"
              : "Every parameter should have an initial value, unit, lower/upper bounds, and fit/fixed state. Do not use unlimited freedom to chase noise."}
          </p>
        </ManualSection>
      );
    case "equations":
      return (
        <ManualSection
          id="equations"
          title={zh ? "6. 图如何变成拟合方程" : "6. How the graph becomes fitting equations"}
          wide
        >
          {zh ? (
            <>
              <p>
                软件先把线连接起来的端口合并成电气节点，然后给节点命名，例如 V、GND、V1、V2。
                每个组件使用它两端节点的电压差。
              </p>
              <p>
                对一个电阻 R1，如果它的正端在 V2、负端在 V1，那么它的局部电压差就是：
              </p>
            </>
          ) : (
            <>
              <p>
                The software first merges wire-connected ports into electrical
                nodes, then labels them, for example V, GND, V1, and V2. Each
                component is evaluated from the voltage difference between its
                two connected nodes.
              </p>
              <p>
                For a resistor R1 whose positive port is at V2 and negative port
                is at V1, the local voltage difference is:
              </p>
            </>
          )}
          <FormulaStack
            formulas={[
              "\\Delta V_{R1}=V_2-V_1",
              "I_{R1}=\\frac{\\Delta V_{R1}}{R1}=\\frac{V_2-V_1}{R1}",
            ]}
          />
          <p>
            {zh
              ? "完整模型会把所有活跃组件的电流/电压关系和节点守恒一起求解。开放支路不会悄悄参与拟合。"
              : "The full model solves the active component laws together with graph-node conservation. Open branches do not silently participate in fitting."}
          </p>
          <div className="manual-equation-explainer">
            <div>
              <strong>{zh ? "组件定律" : "Component law"}</strong>
              <FormulaStack formulas={["I_m=f_m(\\Delta V_m,\\theta_m)"]} />
            </div>
            <div>
              <strong>{zh ? "拟合残差" : "Fitting residual"}</strong>
              <FormulaStack formulas={["r_i=I_{measured,i}-I_{model}(V_i,\\theta)"]} />
            </div>
          </div>
        </ManualSection>
      );
    case "fitting":
      return (
        <ManualSection
          id="fitting"
          title={zh ? "7. 运行拟合" : "7. Run fitting"}
        >
          <ul className="doc-steps">
            {zh ? (
              <>
                <li>选择电压范围，避免一开始把明显不属于模型的区域全塞进去。</li>
                <li>先固定不确定或强相关参数，得到稳定基线后再逐步释放。</li>
                <li>使用合理权重，避免高电流区完全压倒低电流区。</li>
                <li>不要只看曲线重合；必须看 residual、warnings 和参数是否贴边。</li>
              </>
            ) : (
              <>
                <li>Choose a voltage range; do not start by fitting regions the model clearly cannot describe.</li>
                <li>Fix uncertain or strongly correlated parameters first, then release them gradually after a stable baseline exists.</li>
                <li>Use weighting deliberately so high-current regions do not completely dominate low-current behavior.</li>
                <li>Do not judge by visual overlap alone; inspect residuals, warnings, and bound-hugging parameters.</li>
              </>
            )}
          </ul>
          <FormulaStack formulas={["\\min_{\\theta}\\sum_i \\rho(r_i(\\theta))"]} />
        </ManualSection>
      );
    case "diagnostics":
      return (
        <ManualSection
          id="diagnostics"
          title={zh ? "8. 阅读诊断" : "8. Read diagnostics"}
          wide
        >
          <ThreeColumnTable
            headers={zh ? ["信号", "含义", "下一步"] : ["Signal", "Meaning", "Next step"]}
            rows={
              zh
                ? [
                    ["Green / valid", "数值质量门通过。", "仍然检查残差和物理合理性。"],
                    ["Review / warning", "拟合完成但有需要人工判断的问题。", "读 warning，检查参数边界和残差形状。"],
                    ["Diagnostic only", "结果不能作为可信报告。", "修数据、模型、边界或拟合范围后重跑。"],
                    ["Open branch warning", "画布上有半连接组件。", "补齐连接，或删除不需要的支路。"],
                    ["Parameter near bound", "优化器把参数推到允许范围边缘。", "重新考虑边界、模型结构和初值。"],
                  ]
                : [
                    ["Green / valid", "Numerical quality gates passed.", "Still inspect residuals and physical plausibility."],
                    ["Review / warning", "The fit completed but needs human judgment.", "Read warnings; check bounds and residual shape."],
                    ["Diagnostic only", "The result is not a validated report.", "Fix data, model, bounds, or voltage range and rerun."],
                    ["Open branch warning", "A half-connected component exists on the canvas.", "Complete the connection or delete the unused branch."],
                    ["Parameter near bound", "The optimizer pushed a parameter to the allowed edge.", "Reconsider bounds, model structure, and initial values."],
                  ]
            }
          />
        </ManualSection>
      );
    case "report":
      return (
        <ManualSection
          id="report"
          title={zh ? "9. 导出可信报告" : "9. Export a defensible report"}
        >
          <p>
            {zh
              ? "报告应该让别人不用打开源码也能复核：用了哪条 trace、模型图是什么、哪些组件进入拟合、参数和单位是什么、诊断是否通过、软件版本是什么。"
              : "A report should be reviewable without reading source code: selected trace, equivalent circuit, active fitted components, parameter values and units, diagnostics, and software version should all be visible."}
          </p>
          <ul className="doc-steps">
            {zh ? (
              <>
                <li>先确认报告顶部的 trace 和 model summary。</li>
                <li>检查 Equivalent circuit 是否和画布意图一致。</li>
                <li>阅读 Model evaluation summary，确认方程组装逻辑不是旧模型假设。</li>
                <li>如果报告模式是 Diagnostic only，不要当作 validated result 使用。</li>
              </>
            ) : (
              <>
                <li>Confirm the trace and model summary at the top of the report.</li>
                <li>Check that the Equivalent circuit matches the intended graph.</li>
                <li>Read Model evaluation summary to confirm how the graph was assembled.</li>
                <li>If the report mode is Diagnostic only, do not use it as a validated result.</li>
              </>
            )}
          </ul>
        </ManualSection>
      );
    case "troubleshooting":
      return (
        <ManualSection
          id="troubleshooting"
          title={zh ? "10. 常见问题" : "10. Troubleshooting"}
          wide
        >
          <ThreeColumnTable
            headers={zh ? ["现象", "常见原因", "处理方式"] : ["Symptom", "Common cause", "What to do"]}
            rows={
              zh
                ? [
                    ["Run fit 不可用", "没有 trace、没有有效 V-to-GND 通路，或模型有错误。", "先导入 trace，再检查 Go to fitting 按钮状态和画布连通性。"],
                    ["画布上有虚线", "组件半连接或不在活跃子图中。", "补齐线，或删除不需要的组件。"],
                    ["拟合结果爆炸", "模型过度自由、初值差、边界太宽或数据区间不合适。", "缩小范围、固定参数、收紧边界，从简单 preset 开始。"],
                    ["参数贴边", "数据不能识别该参数，或边界/模型不合理。", "固定该参数或重新设计模型。"],
                    ["报告不可用", "后端质量门没有通过。", "看 Critical issue 和 warnings，不要只看曲线。"],
                  ]
                : [
                    ["Run fit is disabled", "No trace, no valid V-to-GND path, or invalid model state.", "Import a trace, then check canvas connectivity and the Go to fitting button state."],
                    ["Dashed wires appear", "A component is half-connected or outside the active subgraph.", "Complete the connection or delete the unused component."],
                    ["Fit explodes", "Too much freedom, poor initials, loose bounds, or unsuitable voltage range.", "Narrow the range, fix parameters, tighten bounds, and start from a simple preset."],
                    ["Parameter sticks to a bound", "The data cannot identify that parameter, or the model/bounds are not appropriate.", "Fix the parameter or redesign the model."],
                    ["Report is unavailable", "Backend quality gates did not pass.", "Read Critical issue and warnings; do not trust visual overlap alone."],
                  ]
            }
          />
        </ManualSection>
      );
  }
}

function ManualReader({
  registry,
  appVersion,
  language,
}: {
  registry: FunctionDefinition[];
  appVersion: string;
  language: Language;
}) {
  const [active, setActive] = useState<ManualSectionKey>("overview");
  const copy = MANUAL_COPY[language];
  const readerRef = useRef<HTMLDivElement | null>(null);

  const getScrollRoot = () =>
    readerRef.current?.closest(".manual-doc-page") as HTMLElement | null;

  useEffect(() => {
    setActive("overview");
    getScrollRoot()?.scrollTo({ top: 0 });
  }, [language]);

  useEffect(() => {
    const scrollRoot = getScrollRoot();
    if (!scrollRoot) return;
    let frame = 0;
    const updateActiveFromScroll = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const sections = copy.nav
          .map((item) => document.getElementById(item.id))
          .filter((item): item is HTMLElement => Boolean(item));
        if (!sections.length) return;
        const rootTop = scrollRoot.getBoundingClientRect().top;
        const scored = sections.map((section) => ({
          id: section.id as ManualSectionKey,
          distance: Math.abs(section.getBoundingClientRect().top - rootTop - 80),
        }));
        scored.sort((a, b) => a.distance - b.distance);
        setActive(scored[0].id);
      });
    };
    scrollRoot.addEventListener("scroll", updateActiveFromScroll, { passive: true });
    window.addEventListener("resize", updateActiveFromScroll, { passive: true });
    updateActiveFromScroll();
    return () => {
      window.cancelAnimationFrame(frame);
      scrollRoot.removeEventListener("scroll", updateActiveFromScroll);
      window.removeEventListener("resize", updateActiveFromScroll);
    };
  }, [copy.nav]);

  const jumpToSection = (id: ManualSectionKey) => {
    setActive(id);
    const section = document.getElementById(id);
    const scrollRoot = getScrollRoot();
    if (section && scrollRoot instanceof HTMLElement) {
      const rootRect = scrollRoot.getBoundingClientRect();
      const sectionRect = section.getBoundingClientRect();
      scrollRoot.scrollTo({
        top: scrollRoot.scrollTop + sectionRect.top - rootRect.top - 12,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="manual-reader manual-reader-one-column manual-reader-webpage" ref={readerRef}>
      <div className="manual-title-block manual-title-top">
        <h2>{copy.title}</h2>
        <p className="muted">
          {copy.subtitle} v{appVersion}
        </p>
      </div>
      <SectionNavigator language={language} active={active} onSelect={jumpToSection} />
      <main className="manual-reader-content" aria-label={copy.title}>
        <div className="manual-reader-content-scroll continuous">
          {copy.nav.map((item) => (
            <div className="manual-continuous-section" key={item.id}>
              {renderManualSection(item.id, registry, language)}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export function UserDocumentationPage({
  registry,
  appVersion,
  language = "en",
}: {
  view?: unknown;
  registry: FunctionDefinition[];
  appVersion: string;
  language?: Language;
}) {
  return (
    <div className="doc-page manual-doc-page">
      <ManualReader registry={registry} appVersion={appVersion} language={language} />
    </div>
  );
}
