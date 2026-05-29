import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AppView } from "./WorkflowSidebar";
import type { FunctionDefinition } from "../model/types";
import type { Language } from "../model/i18n";
import { MathFormula } from "./MathFormula";
import { ReleaseStatusPanel } from "./ReleaseStatusPanel";
import { USER_FUNCTION_DOCS, type UserFunctionDoc } from "../content/userDocumentationContent";

function readableManualTitle(title: string) {
  return title.replace(/^\d+\.\s*/, "");
}

function ManualSection({ id, title, children, wide = false }: { id: string; title: string; children: ReactNode; wide?: boolean }) {
  return <section id={id} className={wide ? "card doc-card wide-card manual-section" : "card doc-card manual-section"}>
    <h2>{readableManualTitle(title)}</h2>
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

function UserFunctionDocCard({ doc, registry, language }: { doc: UserFunctionDoc; registry: FunctionDefinition[]; language: Language }) {
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
  const [selectedLawId, setSelectedLawId] = useState(USER_FUNCTION_DOCS[0]?.lawId ?? "");
  const selected = USER_FUNCTION_DOCS.find((doc) => doc.lawId === selectedLawId) ?? USER_FUNCTION_DOCS[0];
  return <div className="manual-function-reader">
    <nav className="manual-function-list" aria-label={language === "zh" ? "函数列表" : "Function list"}>
      {USER_FUNCTION_DOCS.map((doc) => {
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
      <UserFunctionDocCard doc={selected} registry={registry} language={language} />
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
  const contentRef = useRef<HTMLDivElement | null>(null);
  const activeLabel = labels.find((item) => item.id === active)?.label ?? labels[0].label;

  useEffect(() => {
    setActive("solving");
    const scrollRoot = contentRef.current?.closest(".doc-page");
    if (scrollRoot instanceof HTMLElement) scrollRoot.scrollTo({ top: 0 });
    else window.scrollTo({ top: 0 });
  }, [language]);

  useEffect(() => {
    let frame = 0;
    const scrollRoot = contentRef.current?.closest(".doc-page");
    const scrollTarget: HTMLElement | Window = scrollRoot instanceof HTMLElement ? scrollRoot : window;
    const updateActiveFromScroll = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const sections = labels
          .map((item) => document.getElementById(item.id))
          .filter((el): el is HTMLElement => Boolean(el));
        if (!sections.length) return;
        const rootTop = scrollRoot instanceof HTMLElement ? scrollRoot.getBoundingClientRect().top : 0;
        const threshold = rootTop + 120;
        let current = sections[0];
        for (const section of sections) {
          if (section.getBoundingClientRect().top <= threshold) current = section;
          else break;
        }
        setActive(current.id as ManualSectionKey);
      });
    };
    scrollTarget.addEventListener("scroll", updateActiveFromScroll, { passive: true });
    window.addEventListener("resize", updateActiveFromScroll, { passive: true });
    updateActiveFromScroll();
    return () => {
      window.cancelAnimationFrame(frame);
      scrollTarget.removeEventListener("scroll", updateActiveFromScroll);
      window.removeEventListener("resize", updateActiveFromScroll);
    };
  }, [labels]);

  const jumpToSection = (id: ManualSectionKey) => {
    setActive(id);
    const section = document.getElementById(id);
    const scrollRoot = contentRef.current?.closest(".doc-page");
    if (section && scrollRoot instanceof HTMLElement) {
      const rootRect = scrollRoot.getBoundingClientRect();
      const sectionRect = section.getBoundingClientRect();
      scrollRoot.scrollTo({
        top: scrollRoot.scrollTop + sectionRect.top - rootRect.top - 12,
        behavior: "smooth",
      });
      return;
    }
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return <div className="manual-reader manual-reader-one-column">
    <ReleaseStatusPanel language={language} compact />
    <div className="manual-title-block manual-title-top">
      <h2>{language === "zh" ? "用户手册" : "User Manual"}</h2>
      <p className="muted">v{appVersion}</p>
    </div>
    <SectionNavigator language={language} active={active} onSelect={jumpToSection} />
    <main className="manual-reader-content">
      <div className="manual-reader-content-scroll continuous" ref={contentRef} aria-label={activeLabel}>
        {labels.map((item) => <div className="manual-continuous-section" key={item.id}>{renderManualSection(item.id, registry, language)}</div>)}
      </div>
    </main>
  </div>;
}

function renderManualSection(section: ManualSectionKey, registry: FunctionDefinition[], language: Language) {
  const zh = language === "zh";
  switch (section) {
    case "solving":
      return <ManualSection id="solving" title={zh ? "1. IV-fitter 在求什么" : "1. What IV-fitter is solving"} wide>
        {zh ? <>
          <p>IV-fitter 把 I-V 曲线看成自洽电路拟合问题，而不是把一个固定闭式公式硬套到数据上。实验给出外部电压；内部结点电压通常未知，因为串联电阻、势垒或其它主路项会消耗一部分电压。支路电流在内部结点电压下计算并求和。</p>
          <p>这意味着同一条 I-V 曲线通常需要同时判断三件事：数据是否可靠、模型结构是否足够但不过度、参数是否仍在可解释范围内。报告页的 diagnostics 就是用来阻止“优化器停了但结果不能用”的情况。</p>
          <div className="manual-equation-explainer">
            <div><strong>{zh ? "外部电压平衡" : "External voltage balance"}</strong><FormulaStack formulas={["V_{\\mathrm{ext}} = V_j + \\sum_k V_{\\mathrm{drop},k}(I, V_j; \\theta)"]} /></div>
            <div><strong>{zh ? "总电流" : "Total current"}</strong><FormulaStack formulas={["I = \\sum_m I_{\\mathrm{branch},m}(V_j; \\theta)"]} /></div>
          </div>
          <div className="manual-keyidea"><strong>核心概念：</strong>主路决定支路看到的内部电压；支路在该电压下产生电流；拟合器反复改变参数、逐点求解自洽电路并最小化加权残差。</div>
        </> : <>
          <p>IV-fitter treats an I-V curve as a self-consistent circuit-fitting problem, not as one fixed closed-form equation. The measured external voltage is known. The internal junction voltage is generally unknown because series resistance, barriers, or other main-path terms can consume part of the applied voltage. Branch currents are evaluated at that internal voltage and summed.</p>
          <p>This means a fit has to answer three questions at the same time: whether the data are usable, whether the model structure is sufficient but not overbuilt, and whether the fitted parameters remain interpretable. The Report diagnostics are there to catch cases where the optimizer stopped but the result should not be used.</p>
          <div className="manual-equation-explainer">
            <div><strong>{zh ? "外部电压平衡" : "External voltage balance"}</strong><FormulaStack formulas={["V_{\\mathrm{ext}} = V_j + \\sum_k V_{\\mathrm{drop},k}(I, V_j; \\theta)"]} /></div>
            <div><strong>{zh ? "总电流" : "Total current"}</strong><FormulaStack formulas={["I = \\sum_m I_{\\mathrm{branch},m}(V_j; \\theta)"]} /></div>
          </div>
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
          <ul className="doc-steps"><li>Supported input: CSV/TXT/DAT, pasted tables, generic voltage/current columns, publication/demo files, and HappyMeasure single- or multi-trace exports.</li><li>Import CSV/TXT opens the demo IV traces folder by default when the local runtime supports it; you can still browse anywhere and import your own files.</li><li>Plain CSV/TXT can be single-trace, wide format with one voltage column plus multiple current/current-density columns, or long format grouped by a Trace column.</li><li>Publication/demo current-density columns such as J_mAcm2 are imported as separate traces and keep current-density metadata for later review.</li><li>Column detection is heuristic. Always verify units and sign convention in the preview table.</li><li>Multi-trace files preserve trace identity. Fit only the selected trace unless a future joint-fit workflow is explicitly used.</li><li>Look for missing rows, duplicate voltage points, compliance plateaus, instrument limits, and obvious wiring/sign reversals.</li></ul>
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
          <ThreeColumnTable headers={["Concept", "Meaning", "Examples"]} rows={[["Main path", "Carries terminal current and consumes voltage before branches see the remaining voltage.", "Ohmic Rs, diode-like series barrier drop, conductance modifier"], ["Junction branches", "Generate current at the internal junction voltage and sum to terminal current.", "Shockley diode, Rsh leakage, reverse leakage, photocurrent"], ["Nickname", "Human-readable label; Rs and Rsh are role labels, not separate laws.", "Rs, Rsh, D1, I1"]]} />
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
        {zh ? <div className="manual-recipe-grid"><article><h3>普通二极管型曲线</h3><ol><li>先选正向低到中等电压范围。</li><li>先拟合 D1。</li><li>检查 log 斜率和残差结构。</li><li>只有高电流弯折需要时才加 Rs。</li><li>逐步扩大电压范围。</li></ol></article><article><h3>反向漏电或软击穿</h3><ol><li>先建立 D1 + Rs/Rsh 基线。</li><li>只有反向残差有可重复开启时才加 breakdown。</li><li>开启弱时固定或收紧参数。</li><li>不要用击穿支路拟合噪声。</li></ol></article><article><h3>高正向额外导通</h3><ol><li>先拟合普通 diode 区域。</li><li>高电流受限或下弯时先加 Rs。</li><li>只有残差显示额外电流时才加 forward power-law。</li><li>检查该支路是否可辨识。</li></ol></article><article><h3>光响应拟合</h3><ol><li>先拟合合理暗态基线。</li><li>拟合光照前继承或固定暗态参数。</li><li>先用常数光电流或 Ohmic/custom 支路表达最简单差异。</li><li>只有残差需要时才释放偏压相关支路参数。</li></ol></article></div> : <div className="manual-recipe-grid"><article><h3>Ordinary diode-like curve</h3><ol><li>Select a narrow forward-bias range.</li><li>Fit D1 first.</li><li>Check log slope and residual structure.</li><li>Add Rs only when high-current curvature requires it.</li><li>Expand the range gradually.</li></ol></article><article><h3>Reverse leakage or soft breakdown</h3><ol><li>Establish a D1 + Rs/Rsh baseline outside breakdown.</li><li>Add breakdown only when reverse residuals show repeatable onset.</li><li>Fix or bound weakly identified parameters.</li><li>Do not fit noise with a breakdown branch.</li></ol></article><article><h3>High-forward-bias extra conduction</h3><ol><li>Fit the ordinary diode region first.</li><li>Add Rs if high current is limited or bends downward.</li><li>Add forward power-law only when residuals show extra current.</li><li>Check identifiability over the selected range.</li></ol></article><article><h3>Light-response fitting</h3><ol><li>Fit a defensible dark baseline.</li><li>Seed or fix dark-like parameters before light fitting.</li><li>Start with constant photocurrent or an Ohmic/custom branch for the simplest difference.</li><li>Free bias-dependent branch parameters only when residuals require them.</li></ol></article></div>}
      </ManualSection>;
    case "residuals":
      return <ManualSection id="residuals" title={zh ? "9. 如何读图和残差" : "9. Reading plots and residuals"} wide>
        <p>{zh ? "残差图不是装饰，而是判断模型是否缺少物理过程、是否过拟合、是否选错电压范围的主要证据。" : "Residual plots are not decoration. They are the main evidence for whether a model is missing a process, overfitting, or using the wrong voltage range."}</p>
        <ThreeColumnTable headers={zh ? ["现象", "可能原因", "建议动作"] : ["Observation", "Possible cause", "Suggested action"]} rows={zh ? [["正向高电流区预测过高", "缺少主路限制", "加入/检查 Rs，并检查 compliance。"], ["正向高电流区预测过低", "缺少额外导通支路", "先测试 Rs，再考虑 forward power-law。"], ["低偏压或反偏漏电失配", "缺少漏电支路", "加入 Rsh 或合适漏电项。"], ["反向电流在某电压后上升", "软击穿或陷阱辅助漏电", "确认可重复后再加 breakdown。"], ["残差随机无结构", "噪声或数据散布", "不要为了随机残差堆模型。"], ["参数贴边界", "不可辨识", "固定/移除参数或缩小电压范围。"]] : [["Forward high-current region predicted too high", "Missing series limitation", "Add/check main-path Rs and compliance."], ["Forward high-current region predicted too low", "Missing extra conduction branch", "Test Rs first, then consider forward power-law."], ["Low-bias or reverse leakage mismatch", "Missing leakage path", "Add Rsh or suitable leakage term."], ["Reverse current rises after onset", "Soft breakdown or trap-assisted leakage", "Add breakdown only if repeatable."], ["Residuals look random", "Noise or scatter", "Do not add components solely to chase noise."], ["Parameter hits bound", "Poor identifiability", "Fix/remove parameter or narrow range."]]} />
      </ManualSection>;
    case "reportability":
      return <ManualSection id="reportability" title={zh ? "10. 参数、diagnostics 和可报告性" : "10. Parameters, diagnostics, and reportability"}>
        {zh ? <><p>参数表是诊断的一部分，不只是数值输出。需要同时看数值、不确定度、边界、固定/拟合状态、diagnostics 和物理含义。复杂模型会先按主路/结点支路分组，再按组件分组；组件标题显示 law/form/placement/polarity 和参与拟合的参数数量。</p><ul className="doc-steps"><li><InlineFormula latex="n" /> 接近 1 常见于扩散型行为，接近 2 常见于复合型行为，大于 2 需要检查。</li><li><InlineFormula latex="I_0" /> 是指数项电流尺度；过大或不稳定可能说明初值、漏电或缺项问题。</li><li><InlineFormula latex="R_s" /> 控制主路压降和高电流 roll-off。</li><li><InlineFormula latex="R_{sh}" /> 控制低偏压/反偏漏电背景。</li><li>组件级按钮可以批量 Fit/Fix。完成拟合后，只有通过质量/可报告性门控的拟合值才会自动写回 Initial；较差、卡边界或不可报告的拟合会显示 fitted values，但不会偷偷覆盖下一次初值。初值和边界直接在参数表中人工编辑，避免把内部调试工具暴露给普通用户。</li></ul><p className="warning info"><strong>Fit process：</strong>Fit setup 中的“拟合过程与质量指标”会显示本次点数、函数评估、Jacobian 评估、自由参数、自由度、线性 R²、log-magnitude R²、relative weighted reduced χ²、求解器状态和会话累计统计。线性 R² 可能被高电流区支配；log 指标更适合多数量级 IV 曲线。relative weighted reduced χ² 使用当前 residual weighting 计算，只有当权重代表真实测量不确定度时才有严格统计意义，否则主要用于残差尺度诊断。</p><p className="warning info"><strong>可报告性：</strong>只有当后端标记为 reportable，且用户已检查 diagnostics、残差、选中 trace、电压范围和模型结构后，结果才适合报告。</p></> : <><p>The parameter table is diagnostic output, not just numbers. Read value, uncertainty, bounds, fixed/fitted state, diagnostics, and physical meaning together. Complex models are grouped first by Main path versus Junction branches, then by component instance; each component header shows law/form/placement/polarity and fitted-count status.</p><ul className="doc-steps"><li><InlineFormula latex="n" /> near 1 often suggests diffusion-like behavior; near 2 often suggests recombination-like behavior; values above 2 need review.</li><li><InlineFormula latex="I_0" /> is the current scale for exponential terms; large or unstable values may indicate poor initials, leakage, or missing terms.</li><li><InlineFormula latex="R_s" /> controls main-path voltage drop and high-current roll-off.</li><li><InlineFormula latex="R_{sh}" /> controls low-bias or reverse leakage background.</li><li>Component controls can Fit all or Fix all. After a completed fit, fitted values are written back into Initial only when the fit passes quality/reportability gating; poor, bound-stuck, or non-reportable fits remain visible but are not silently promoted as next-run initials. Initial values and bounds are edited directly in the parameter table so internal debugging helpers stay out of the normal user workflow.</li></ul><p className="warning info"><strong>Fit process:</strong> the Fit setup “Fit process and quality metrics” disclosure shows points used, function/Jacobian evaluations, free parameters, degrees of freedom, linear R², log-magnitude R², relative weighted reduced χ², optimizer status, and session totals. Linear R² can be dominated by high-current regions; log metrics are more informative for multi-decade IV curves. Relative weighted reduced χ² is computed from the active residual weighting and is strictly statistical only when the weights represent measurement uncertainty; otherwise it is a residual-scale diagnostic.</p><p className="warning info"><strong>Reportability:</strong> report a result only if the backend marks it reportable and diagnostics, residuals, selected trace, voltage range, and model structure have been reviewed.</p></>}
      </ManualSection>;
    case "light-response":
      return <ManualSection id="light-response" title={zh ? "11. 光响应建模" : "11. Light-response modeling"} wide>
        {zh ? <>
          <p>光响应项通常应在暗态 trace 已有合理拟合后再加入。否则光响应项可能补偿错误暗态模型，导致误导性的物理解释。</p>
          <ThreeColumnTable headers={["光照现象", "优先模型", "何时升级"]} rows={[["光照曲线相对暗态整体平移", "常数光电流", "残差显示系统性偏压依赖。"], ["差值大致随电压线性增加", "欧姆支路或自定义电导", "出现阈值型增强或饱和。"], ["光响应在阈值或场辅助下增强", "电压依赖光电流", "暗态基线稳定且残差确实需要。"], ["光照改变高电流斜率或阈值", "欧姆主路或自定义传输项", "残差形状需要明确的数学项。"]]} />
        </> : <>
          <p>Light-response terms should normally be added only after the dark trace has a defensible fit. Otherwise, a light term may compensate for an incorrect dark model and produce misleading interpretation.</p>
          <ThreeColumnTable headers={["Light behavior", "First model to try", "Escalate only if"]} rows={[["Light curve mostly shifts relative to dark", "Constant photocurrent", "Residuals show systematic bias dependence."], ["Light-dark difference grows roughly linearly with voltage", "Ohmic branch or custom conductance", "There is threshold-like growth or saturation."], ["Light response strengthens near threshold or with field", "Bias-dependent current branch", "Dark baseline is stable and residuals demand it."], ["Light changes high-current slope or threshold", "Ohmic main-path or custom transport term", "The residual shape requires an explicit mathematical term."]]} />
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
      <div className="manual-equation-explainer">
            <div><strong>{zh ? "外部电压平衡" : "External voltage balance"}</strong><FormulaStack formulas={["V_{\\mathrm{ext}} = V_j + \\sum_k V_{\\mathrm{drop},k}(I, V_j; \\theta)"]} /></div>
            <div><strong>{zh ? "总电流" : "Total current"}</strong><FormulaStack formulas={["I = \\sum_m I_{\\mathrm{branch},m}(V_j; \\theta)"]} /></div>
          </div>
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
      <div className="manual-equation-explainer">
            <div><strong>{zh ? "外部电压平衡" : "External voltage balance"}</strong><FormulaStack formulas={["V_{\\mathrm{ext}} = V_j + \\sum_k V_{\\mathrm{drop},k}(I, V_j; \\theta)"]} /></div>
            <div><strong>{zh ? "总电流" : "Total current"}</strong><FormulaStack formulas={["I = \\sum_m I_{\\mathrm{branch},m}(V_j; \\theta)"]} /></div>
          </div>
      <p className="warning info"><strong>Important distinction:</strong> the external voltage axis in the data is not automatically the diode voltage. When main-path terms exist, IV-fitter must solve for the internal junction voltage before evaluating branch currents.</p>
      <h3>Worked example: Ohmic law</h3>
      <ThreeColumnTable headers={["Combination", "Model meaning", "Equation role"]} rows={[["Ohmic + voltage-drop form + main-path placement", "Series resistance Rs", "Vext = Vj + I Rs"], ["Ohmic + current-branch form + parallel placement", "Shunt leakage Rsh", "Ish = Vj / Rsh"]]} />
      <h3>Common combinations</h3>
      <ThreeColumnTable headers={["Law", "Form / placement", "Physical role seen by the user"]} rows={[["Ohmic linear law", "Voltage drop / main path", "Series resistance Rs or access resistance"], ["Ohmic linear law", "Current branch / parallel", "Shunt leakage Rsh"], ["Shockley diode law", "Current branch / junction", "Main diode branch D1"], ["Shockley diode law", "Voltage-drop barrier / main path", "Contact-like series barrier drop"], ["Soft-threshold power law", "Current branch / forward or reverse", "Extra forward conduction, reverse leakage onset, or high-field conduction"], ["Photocurrent law", "Current branch", "Light-induced current with explicit sign convention"], ["Conductance modifier", "Modifier / main path", "Bias-dependent series conductance modification"]]} />
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
