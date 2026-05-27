#!/usr/bin/env python3
"""
prepare_publication_demo_data.py

Create one minimal publication-derived demo-data CSV + metadata pair for IVfitter.

Default output:
  examples/demo_data/publication_data/
    A_Diercks_et_al_2026.csv
    A_Diercks_et_al_2026.meta.json

The CSV contains header only. Paste numerical data manually later.
JV/IV templates default to a wide multi-trace format supported by IV-fitter:
one Voltage_V column followed by several current/current-density trace columns.

This script does NOT:
- download numerical data,
- scrape figures,
- digitize plots,
- modify IVfitter code.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import textwrap
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


DATA_TYPE_TEMPLATES: dict[str, dict[str, str]] = {
    "JV": {
        "trace_prefix": "Trace",
        "trace_suffix": "J_mAcm2",
        "description": "Solar-cell/device J-V data in current density units.",
    },
    "IV": {
        "trace_prefix": "Trace",
        "trace_suffix": "Current_A",
        "description": "Device I-V data in absolute current units.",
    },
    "EQE": {
        "header": "Wavelength_nm,EQE_percent\n",
        "description": "External quantum efficiency spectrum.",
    },
    "Suns-VOC": {
        "header": "Sun_intensity_percent,Open_circuit_voltage_V\n",
        "description": "Suns-VOC or light-intensity-dependent VOC data.",
    },
    "MPPT": {
        "header": "Time_s,PCE_percent\n",
        "description": "Maximum power point tracking time series.",
    },
    "stability": {
        "header": "Time_h,Normalized_PCE_percent\n",
        "description": "Stability time series.",
    },
    "other": {
        "header": "X,Y\n",
        "description": "Generic two-column data.",
    },
}


def build_csv_header(data_type: str, trace_count: int = 4) -> str:
    """Return an IV-fitter import-compatible empty CSV header."""
    if data_type in {"JV", "IV"}:
        n = max(1, int(trace_count))
        template = DATA_TYPE_TEMPLATES[data_type]
        prefix = template["trace_prefix"]
        suffix = template["trace_suffix"]
        columns = ["Voltage_V"] + [f"{prefix}_{idx}_{suffix}" for idx in range(1, n + 1)]
        return ",".join(columns) + "\n"
    return DATA_TYPE_TEMPLATES[data_type]["header"]


@dataclass
class PublicationMetadata:
    title: str = ""
    authors: list[str] | None = None
    journal: str = ""
    year: str = ""
    doi: str = ""
    source_url: str = ""
    repository: str = ""
    license: str = ""
    license_url: str = ""
    publisher: str = ""
    intended_data_type: str = "JV"
    template_format: str = "wide_multi_trace"
    trace_count: int = 4
    csv_file: str = ""
    notes: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "title": self.title,
            "authors": self.authors or [],
            "journal": self.journal,
            "year": self.year,
            "doi": self.doi,
            "source_url": self.source_url,
            "repository": self.repository,
            "license": self.license,
            "license_url": self.license_url,
            "publisher": self.publisher,
            "intended_data_type": self.intended_data_type,
            "template_format": self.template_format,
            "trace_count": self.trace_count,
            "csv_file": self.csv_file,
            "notes": self.notes,
            "citation_required": True,
            "created_by": "prepare_publication_demo_data.py",
            "created_at_utc": datetime.now(timezone.utc).isoformat(),
        }


def extract_doi(text: str) -> str:
    text = (text or "").strip()
    if not text:
        return ""
    text = urllib.parse.unquote(text)
    text = re.sub(r"^https?://(?:dx\.)?doi\.org/", "", text, flags=re.I)
    text = re.sub(r"^doi:\s*", "", text, flags=re.I)
    match = re.search(r'(10\.\d{4,9}/[^\s"<>]+)', text, flags=re.I)
    if match:
        return match.group(1).rstrip(".,;)")
    return text


def safe_filename_part(value: str) -> str:
    value = re.sub(r"[^A-Za-z0-9]+", "_", value.strip())
    value = re.sub(r"_+", "_", value).strip("_")
    return value or "Unknown"


def default_publication_stem(meta: PublicationMetadata) -> str:
    """Return a readable file stem like A_Diercks_et_al_2026."""
    authors = meta.authors or []
    year = str(meta.year or "").strip()

    if authors:
        first = authors[0].strip().replace(",", " ")
        parts = first.split()
        if len(parts) >= 2:
            initial = parts[0][0].upper()
            family = parts[-1]
        else:
            initial = parts[0][0].upper()
            family = parts[0]
        author_label = f"{initial}_{safe_filename_part(family)}"
        if len(authors) > 1:
            author_label += "_et_al"
    else:
        author_label = "Unknown_author"

    return f"{author_label}_{safe_filename_part(year)}" if year else author_label


def safe_prompt(label: str, default: str = "") -> str:
    suffix = f" [{default}]" if default else ""
    value = input(f"{label}{suffix}: ").strip()
    return value if value else default


def infer_license_label(license_url: str) -> str:
    lower = (license_url or "").lower()
    if "creativecommons.org/licenses/by/4.0" in lower:
        return "CC-BY 4.0"
    if "creativecommons.org/licenses/by/" in lower:
        return "CC-BY"
    if "creativecommons.org" in lower:
        return "Creative Commons"
    return ""


def fetch_doi_metadata(doi: str, timeout_s: int = 15) -> PublicationMetadata:
    doi = extract_doi(doi)
    if not doi:
        raise ValueError("No DOI provided.")

    url = f"https://doi.org/{doi}"
    req = urllib.request.Request(
        url,
        headers={
            "Accept": "application/vnd.citationstyles.csl+json",
            "User-Agent": "IVfitter-demo-data-template-script/1.3",
        },
    )

    with urllib.request.urlopen(req, timeout=timeout_s) as response:
        payload = response.read().decode("utf-8", errors="replace")

    data = json.loads(payload)

    authors: list[str] = []
    for person in data.get("author", []) or []:
        given = person.get("given", "")
        family = person.get("family", "")
        name = " ".join(part for part in [given, family] if part).strip()
        if name:
            authors.append(name)

    year = ""
    issued = data.get("issued", {}).get("date-parts", [])
    if issued and issued[0]:
        year = str(issued[0][0])

    license_url = ""
    license_items = data.get("license", []) or []
    if license_items and isinstance(license_items, list):
        license_url = license_items[0].get("URL", "") or license_items[0].get("url", "")

    return PublicationMetadata(
        title=data.get("title", "") or "",
        authors=authors,
        journal=data.get("container-title", "") or data.get("publisher", "") or "",
        year=year,
        doi=doi,
        source_url=data.get("URL", "") or url,
        repository="",
        license=infer_license_label(license_url),
        license_url=license_url,
        publisher=data.get("publisher", "") or "",
    )


def choose_data_type(default: str = "JV") -> str:
    valid = list(DATA_TYPE_TEMPLATES.keys())
    print("\nCSV header/data type:")
    for idx, name in enumerate(valid, start=1):
        print(f"  {idx}. {name} — {DATA_TYPE_TEMPLATES[name]['description']}")
    value = safe_prompt("Choose data type by name or number", default)
    if value.isdigit():
        index = int(value) - 1
        if 0 <= index < len(valid):
            return valid[index]
    if value in DATA_TYPE_TEMPLATES:
        return value
    print(f"Unknown data type {value!r}; using 'other'.")
    return "other"


def enrich_metadata_interactively(meta: PublicationMetadata, default_data_type: str) -> PublicationMetadata:
    print("\nPublication metadata. Press Enter to accept defaults.\n")
    meta.title = safe_prompt("Title", meta.title)
    authors_default = "; ".join(meta.authors or [])
    authors_text = safe_prompt("Authors, separated by semicolon", authors_default)
    meta.authors = [a.strip() for a in authors_text.split(";") if a.strip()]
    meta.journal = safe_prompt("Journal / container", meta.journal)
    meta.year = safe_prompt("Year", meta.year)
    meta.doi = safe_prompt("DOI", meta.doi)
    meta.source_url = safe_prompt("Source/article URL", meta.source_url or (f"https://doi.org/{meta.doi}" if meta.doi else ""))
    meta.repository = safe_prompt("Data repository URL/DOI, if any", meta.repository)
    meta.license = safe_prompt("License label", meta.license)
    meta.license_url = safe_prompt("License URL", meta.license_url)
    meta.publisher = safe_prompt("Publisher", meta.publisher)
    meta.intended_data_type = choose_data_type(default_data_type)
    if meta.intended_data_type in {"JV", "IV"}:
        count_text = safe_prompt("Number of empty traces in CSV template", str(meta.trace_count))
        try:
            meta.trace_count = max(1, int(count_text))
        except ValueError:
            print(f"Invalid trace count {count_text!r}; using {meta.trace_count}.")
        meta.template_format = "wide_multi_trace"
    else:
        meta.trace_count = 1
        meta.template_format = "single_table"
    meta.notes = safe_prompt("Notes", "Header-only CSV template; paste numerical data manually.")
    return meta


def write_json(path: Path, data: dict[str, Any]) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def open_folder(path: Path) -> None:
    path = path.resolve()
    try:
        if sys.platform.startswith("win"):
            os.startfile(str(path))  # type: ignore[attr-defined]
        elif sys.platform == "darwin":
            subprocess.Popen(["open", str(path)])
        else:
            subprocess.Popen(["xdg-open", str(path)])
    except Exception as exc:
        print(f"Could not open folder automatically: {exc}")
        print(f"Folder: {path}")


def prepare_template(args: argparse.Namespace) -> Path:
    doi_or_url = args.doi_or_url or safe_prompt("Article DOI or URL")
    doi = extract_doi(doi_or_url)
    meta = PublicationMetadata(doi=doi, source_url=doi_or_url)

    if not args.no_fetch and doi:
        try:
            print(f"Fetching publication metadata for DOI: {doi}")
            meta = fetch_doi_metadata(doi)
            print("Metadata lookup succeeded.")
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError, ValueError) as exc:
            print(f"Metadata lookup failed; continuing with manual entry. Reason: {exc}")

    default_data_type = args.data_type or "JV"
    if args.non_interactive:
        if not meta.title:
            meta.title = doi or "publication demo data"
        if not meta.doi:
            meta.doi = doi
        meta.intended_data_type = default_data_type
        if meta.intended_data_type in {"JV", "IV"}:
            meta.trace_count = max(1, int(args.trace_count))
            meta.template_format = "wide_multi_trace"
        else:
            meta.trace_count = 1
            meta.template_format = "single_table"
        if not meta.notes:
            meta.notes = "Header-only CSV template; paste numerical data manually."
    else:
        meta = enrich_metadata_interactively(meta, default_data_type)

    default_stem = default_publication_stem(meta)
    stem = args.stem or (default_stem if args.non_interactive else safe_prompt("Output file stem", default_stem))
    stem = safe_filename_part(stem)

    out_root = Path(args.out_root)
    out_root.mkdir(parents=True, exist_ok=True)

    csv_path = out_root / f"{stem}.csv"
    meta_path = out_root / f"{stem}.meta.json"

    if (csv_path.exists() or meta_path.exists()) and not args.allow_existing:
        existing = csv_path if csv_path.exists() else meta_path
        raise FileExistsError(
            f"Target file already exists:\n"
            f"  {existing}\n"
            "Use --allow-existing to overwrite/reuse, or choose another --stem."
        )

    csv_path.write_text(build_csv_header(meta.intended_data_type, meta.trace_count), encoding="utf-8")

    meta.csv_file = csv_path.name
    write_json(meta_path, meta.to_dict())

    print("\nCreated publication demo-data files:")
    print(f"  {csv_path.resolve()}")
    print(f"  {meta_path.resolve()}")

    if args.open_folder:
        open_folder(out_root)

    return out_root


def run_self_test() -> None:
    import argparse as _argparse
    import tempfile

    assert extract_doi("https://doi.org/10.1038/s41560-026-02068-9") == "10.1038/s41560-026-02068-9"
    assert default_publication_stem(PublicationMetadata(authors=["Alexander Diercks", "Sofía Chozas-Barrientos"], year="2026")) == "A_Diercks_et_al_2026"
    assert default_publication_stem(PublicationMetadata(authors=["Alexander Diercks"], year="2026")) == "A_Diercks_2026"
    assert build_csv_header("JV", 3) == "Voltage_V,Trace_1_J_mAcm2,Trace_2_J_mAcm2,Trace_3_J_mAcm2\n"
    assert build_csv_header("IV", 2) == "Voltage_V,Trace_1_Current_A,Trace_2_Current_A\n"

    with tempfile.TemporaryDirectory() as tmp:
        out_root = Path(tmp) / "examples" / "demo_data" / "publication_data"
        args = _argparse.Namespace(
            doi_or_url="10.1038/s41560-026-02068-9",
            out_root=str(out_root),
            stem="A_Diercks_et_al_2026",
            data_type="JV",
            trace_count=4,
            no_fetch=True,
            non_interactive=True,
            allow_existing=False,
            open_folder=False,
            self_test=False,
        )
        target = prepare_template(args)

        csv_path = target / "A_Diercks_et_al_2026.csv"
        meta_path = target / "A_Diercks_et_al_2026.meta.json"

        assert csv_path.exists()
        assert meta_path.exists()
        assert not (target / "README.md").exists()
        assert not any(p.is_dir() for p in target.iterdir())
        assert csv_path.read_text(encoding="utf-8") == (
            "Voltage_V,Trace_1_J_mAcm2,Trace_2_J_mAcm2,Trace_3_J_mAcm2,Trace_4_J_mAcm2\n"
        )

        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        assert meta["doi"] == "10.1038/s41560-026-02068-9"
        assert meta["csv_file"] == "A_Diercks_et_al_2026.csv"
        assert meta["intended_data_type"] == "JV"
        assert meta["template_format"] == "wide_multi_trace"
        assert meta["trace_count"] == 4

    print("Self-test passed.")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Prepare a minimal publication-derived demo-data CSV + meta.json pair for IVfitter.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent(
            """
            Examples:
              python tools/prepare_publication_demo_data.py https://doi.org/10.1038/s41560-026-02068-9
              python tools/prepare_publication_demo_data.py 10.1038/s41560-026-02068-9 --data-type JV
              python tools/prepare_publication_demo_data.py --data-type JV --trace-count 6 --no-fetch
              python tools/prepare_publication_demo_data.py --self-test
            """
        ),
    )
    parser.add_argument("doi_or_url", nargs="?", help="Publication DOI or article URL.")
    parser.add_argument("--out-root", default=str(Path("examples") / "demo_data" / "publication_data"))
    parser.add_argument("--stem", default="", help="Output file stem. Default: A_Surname_et_al_Year.")
    parser.add_argument("--data-type", choices=list(DATA_TYPE_TEMPLATES.keys()), default="JV")
    parser.add_argument("--trace-count", type=int, default=4, help="Number of empty JV/IV trace columns to create.")
    parser.add_argument("--no-fetch", action="store_true", help="Do not attempt network metadata lookup.")
    parser.add_argument("--non-interactive", action="store_true", help="Use defaults; do not prompt.")
    parser.add_argument("--allow-existing", action="store_true", help="Allow overwriting existing CSV/meta pair.")
    parser.add_argument("--no-open", dest="open_folder", action="store_false", help="Do not open output folder.")
    parser.set_defaults(open_folder=True)
    parser.add_argument("--self-test", action="store_true", help="Run built-in script tests and exit.")
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    try:
        if args.self_test:
            run_self_test()
        else:
            prepare_template(args)
        return 0
    except KeyboardInterrupt:
        print("\nCancelled.")
        return 130
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
