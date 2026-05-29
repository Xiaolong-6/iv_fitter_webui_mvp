import type { AppView } from "./WorkflowSidebar";
import type { FitResult } from "../model/types";
import type { Language } from "../model/i18n";

type TesterRole = "ui" | "research" | "synthetic";

const ROLE_TEXT: Record<TesterRole, { en: string; zh: string; goalEn: string; goalZh: string }> = {
  ui: {
    en: "UI tester",
    zh: "UI 测试人员",
    goalEn: "Check navigation, responsive layout, zoom, import feedback, and error recovery without judging device physics.",
    goalZh: "只检查导航、响应式布局、缩放、导入反馈和错误恢复，不评价器件物理。",
  },
  research: {
    en: "Research user",
    zh: "科研用户",
    goalEn: "Import real I-V data, select a physically plausible model, seed parameters, fit, and judge diagnostics.",
    goalZh: "导入真实 I-V 数据，选择物理合理模型，设置初值，拟合，并判断诊断信息。",
  },
  synthetic: {
    en: "Synthetic-data tester",
    zh: "模拟数据测试人员",
    goalEn: "Generate known synthetic traces and verify whether fitted parameters recover the intended ground truth.",
    goalZh: "生成已知模拟曲线，并验证拟合参数能否反演预期真值。",
  },
};

function stepStatus(done: boolean, active: boolean, language: Language) {
  if (done) return language === "zh" ? "完成" : "done";
  if (active) return language === "zh" ? "正在进行" : "active";
  return language === "zh" ? "待做" : "todo";
}

export function ExternalTesterChecklist({
  setActiveView,
  hasSelectedTrace,
  result,
  isFitting,
  reportAvailable,
  language,
}: {
  setActiveView: (view: AppView) => void;
  hasSelectedTrace: boolean;
  result: FitResult | null;
  isFitting: boolean;
  reportAvailable: boolean;
  language: Language;
}) {
  const zh = language === "zh";
  const roles = Object.entries(ROLE_TEXT) as Array<[TesterRole, typeof ROLE_TEXT[TesterRole]]>;
  const steps = [
    { title: zh ? "导入或生成数据" : "Import or generate data", view: "data" as AppView, done: hasSelectedTrace, active: !hasSelectedTrace },
    { title: zh ? "确认模型结构" : "Confirm model structure", view: "model" as AppView, done: true, active: hasSelectedTrace && !result && !isFitting },
    { title: zh ? "运行拟合并看诊断" : "Run fit and inspect diagnostics", view: "fitting" as AppView, done: Boolean(result), active: hasSelectedTrace && !result },
    { title: zh ? "导出或记录报告" : "Export or record report", view: "report" as AppView, done: reportAvailable, active: Boolean(result) && !reportAvailable },
  ];
  return (
    <section className="external-tester-card" aria-label={zh ? "外部测试流程" : "External tester workflow"}>
      <div className="external-tester-head">
        <div>
          <h3>{zh ? "外部测试模式" : "External tester mode"}</h3>
          <p>{zh ? "按角色执行可复现检查，避免只看界面截图就判断 release。" : "Use a role-specific reproducible checklist instead of judging release readiness from screenshots only."}</p>
        </div>
        <button type="button" onClick={() => setActiveView("data")}>{zh ? "开始测试" : "Start test"}</button>
      </div>
      <div className="tester-role-grid">
        {roles.map(([role, item]) => (
          <article key={role} className="tester-role-card">
            <strong>{zh ? item.zh : item.en}</strong>
            <p>{zh ? item.goalZh : item.goalEn}</p>
          </article>
        ))}
      </div>
      <div className="tester-step-list">
        {steps.map((step, index) => (
          <button key={step.title} type="button" className={step.done ? "tester-step done" : step.active ? "tester-step active" : "tester-step"} onClick={() => setActiveView(step.view)}>
            <span>{index + 1}</span>
            <strong>{step.title}</strong>
            <em>{stepStatus(step.done, step.active, language)}</em>
          </button>
        ))}
      </div>
    </section>
  );
}
