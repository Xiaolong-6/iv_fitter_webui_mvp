"""Resolve the preferred Import CSV/TXT starting directory."""

from __future__ import annotations

import os
import sys
from pathlib import Path


DEFAULT_IMPORT_RELATIVE = Path("examples") / "demo_data" / "iv_traces"


def _candidate_roots() -> list[Path]:
    roots: list[Path] = []
    env_root = os.getenv("IVFITTER_APP_ROOT")
    if env_root:
        roots.append(Path(env_root))
    if getattr(sys, "frozen", False):
        roots.append(Path(sys.executable).resolve().parent)
        roots.append(Path(getattr(sys, "_MEIPASS", Path(sys.executable).resolve().parent)))
    roots.append(Path.cwd())
    here = Path(__file__).resolve()
    roots.extend(here.parents)

    unique: list[Path] = []
    seen: set[str] = set()
    for root in roots:
        try:
            resolved = str(root.resolve())
        except OSError:
            resolved = str(root)
        if resolved not in seen:
            seen.add(resolved)
            unique.append(root)
    return unique


def resolve_default_import_dir(app_root: Path | str | None = None) -> Path | None:
    """Return examples/demo_data/iv_traces when available, otherwise None."""
    roots = [Path(app_root)] if app_root is not None else _candidate_roots()
    for root in roots:
        candidate = root / DEFAULT_IMPORT_RELATIVE
        if candidate.is_dir():
            return candidate.resolve()
    return None


def resolveDefaultImportDir(app_root: Path | str | None = None) -> Path | None:
    """CamelCase alias for frontend/desktop design docs and tests."""
    return resolve_default_import_dir(app_root)
