from pathlib import Path


def test_function_guide_default_docs_do_not_expose_internal_schema_terms():
    root = Path(__file__).resolve().parents[2]
    source = (root / "frontend" / "src" / "components" / "UserDocumentationPage.tsx").read_text(encoding="utf-8")
    forbidden = [
        "direction_sign",
        "safe vectorized expression",
        "adapter",
        "canonical equation",
        "allowed placements",
        "supported forms",
        "internal parameter keys",
    ]
    lowered = source.lower()
    for term in forbidden:
        assert term not in lowered


def test_function_guide_is_user_facing_instead_of_internal_schema_panel():
    root = Path(__file__).resolve().parents[2]
    page_source = (root / "frontend" / "src" / "components" / "UserDocumentationPage.tsx").read_text(encoding="utf-8")
    guide_source = (root / "frontend" / "src" / "content" / "userDocumentationContent.ts").read_text(encoding="utf-8")
    combined = f"{page_source}\n{guide_source}".lower()
    assert "advancedfunctiondetails" not in combined
    assert "law_id" not in combined
    assert "allowed placements" not in combined
    assert "internal parameter keys" not in combined
