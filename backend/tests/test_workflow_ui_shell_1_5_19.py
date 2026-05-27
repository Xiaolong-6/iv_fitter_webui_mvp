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
    assert 'useState<AppView>("start")' in page
    for marker in [
        "function StartHerePage",
        "function ModelWorkflowPage",
        "function FittingWorkflowPage",
        "function ReportWorkflowPage",
        "WorkflowContextBar",
        "UserDocumentationPage",
    ]:
        assert marker in page


def test_existing_components_are_moved_to_task_specific_pages():
    page = read_repo_file("frontend/src/pages/FittingPage.tsx")
    assert "DataImportWorkspace" in page
    assert "ModelBuilder" in page
    assert "EquationPreview" in page
    assert "FitConfigPanel" in page
    assert "PlotWorkspace" in page
    assert "ParameterTable" in page
    assert "FitProcessDiagnostics" in page
    assert "UserDocumentationPage" in page


def test_global_context_and_report_page_exports_are_present():
    page = read_repo_file("frontend/src/pages/FittingPage.tsx")
    assert "workflow-context-bar" in page
    assert "Next:" in page
    assert "Download report CSV" in page
    assert "Download parameter CSV" in page
    assert "Download diagnostics JSON" in page
