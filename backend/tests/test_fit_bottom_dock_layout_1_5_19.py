from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def read_repo_file(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_fit_setup_is_app_level_bottom_dock_not_left_pane():
    page = read_repo_file("frontend/src/pages/FittingPage.tsx")
    assert "workspace-fit-shell" in page
    assert "fit-bottom-dock" in read_repo_file("frontend/src/components/FitConfigPanel.tsx")
    assert "id=\"section-fitSetup\"" not in page
    assert "workspace-section-fitSetup" not in page
    assert "advancedFitOptionsOpen" not in page


def test_advanced_and_details_share_mutually_exclusive_drawer_state():
    page = read_repo_file("frontend/src/pages/FittingPage.tsx")
    panel = read_repo_file("frontend/src/components/FitConfigPanel.tsx")
    assert 'useState<FitDrawerMode>("none")' in page
    assert 'export type FitDrawerMode = "none" | "advanced" | "details"' in panel
    assert 'onDrawerModeChange(advancedOpen ? "none" : "advanced")' in panel
    assert 'onDrawerModeChange(detailsOpen ? "none" : "details")' in panel
    assert 'data-drawer-mode={drawerMode}' in panel


def test_bottom_dock_layout_reserves_upward_drawer_space():
    css = read_repo_file("frontend/src/style.css")
    assert ".workspace-fit-shell" in css
    assert ".fit-bottom-dock" in css
    assert ".fit-bottom-dock-drawer" in css
    assert "max-height: 34vh" in css
    assert "overflow-y: auto" in css
    assert ".fit-bottom-dock-row" in css
