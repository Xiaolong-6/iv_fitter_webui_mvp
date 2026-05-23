from pathlib import Path


def test_function_guide_default_docs_do_not_expose_internal_schema_terms():
    root = Path(__file__).resolve().parents[2]
    source = (root / "frontend" / "src" / "components" / "UserDocumentationPage.tsx").read_text(encoding="utf-8")
    default_docs = source.split("function AdvancedFunctionDetails", 1)[0]
    forbidden = [
        "direction_sign",
        "safe vectorized expression",
        "adapter",
        "canonical equation",
        "allowed placements",
        "supported forms",
        "internal parameter keys",
    ]
    lowered = default_docs.lower()
    for term in forbidden:
        assert term not in lowered


def test_function_guide_keeps_internal_terms_inside_advanced_details():
    root = Path(__file__).resolve().parents[2]
    source = (root / "frontend" / "src" / "components" / "UserDocumentationPage.tsx").read_text(encoding="utf-8")
    advanced = source.split("function AdvancedFunctionDetails", 1)[1]
    assert "law_id" in advanced
    assert "supported forms" in advanced
    assert "allowed placements" in advanced
    assert "internal parameter keys" in advanced
