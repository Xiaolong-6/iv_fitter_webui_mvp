from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def read_repo_file(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_workflow_navigation_pages_replace_workspace_tab():
    sidebar = read_repo_file("frontend/src/components/WorkflowSidebar.tsx")
    assert 'export type AppView = "start" | "data" | "model" | "fitting" | "report" | "help"' in sidebar
    assert '["start", "data", "model", "fitting", "report", "help"]' in sidebar
    assert '"workspace"' not in sidebar
    assert '"usage"' not in sidebar


def test_default_page_is_start_here_and_task_pages_exist():
    page = read_repo_file("frontend/src/pages/FittingPage.tsx")
    layout_hook = read_repo_file("frontend/src/pages/hooks/useWorkflowLayoutState.ts")
    start_page = read_repo_file("frontend/src/pages/components/StartHerePage.tsx")
    workflow_sections = read_repo_file("frontend/src/pages/components/WorkflowSections.tsx")
    report_page = read_repo_file("frontend/src/pages/components/ReportWorkflowPage.tsx")
    status = read_repo_file("frontend/src/pages/components/WorkflowStatus.tsx")
    assert 'useState<AppView>("start")' in layout_hook
    for marker, text in [
        ("function StartHerePage", start_page),
        ("function ModelWorkflowPage", workflow_sections),
        ("function FittingWorkflowPage", workflow_sections),
        ("function ReportWorkflowPage", report_page),
        ("WorkflowContextBar", status),
        ("UserDocumentationPage", page),
    ]:
        assert marker in text


def test_existing_components_are_moved_to_task_specific_pages():
    page = read_repo_file("frontend/src/pages/FittingPage.tsx")
    workflow_sections = read_repo_file("frontend/src/pages/components/WorkflowSections.tsx")
    report_page = read_repo_file("frontend/src/pages/components/ReportWorkflowPage.tsx")
    assert "DataImportWorkspace" in page
    assert "ModelBuilder" in workflow_sections
    assert "EquationPreview" in workflow_sections
    assert "FitConfigPanel" in workflow_sections
    assert "PlotWorkspace" in workflow_sections
    assert "ParameterTable" in workflow_sections
    assert "FitProcessDiagnostics" in report_page
    assert "UserDocumentationPage" in page


def test_global_context_and_report_page_exports_are_present():
    status = read_repo_file("frontend/src/pages/components/WorkflowStatus.tsx")
    report_page = read_repo_file("frontend/src/pages/components/ReportWorkflowPage.tsx")
    client = read_repo_file("frontend/src/api/client.ts")
    assert "workflow-context-bar" in status
    assert "Next:" in status
    assert "Download report CSV" in report_page
    assert "Download HTML report" in report_page
    assert "Download parameter CSV" not in report_page
    assert "Download diagnostics JSON" not in report_page
    assert "export-parameters-csv" not in client
    assert "export-diagnostics-json" not in client
