#!/usr/bin/env python3
"""Create/update a GitHub release and upload a release artifact.

Usage:
  python tools/update_github_release.py --repo OWNER/REPO --tag vX.Y.Z \
    --artifact path/to/package.zip --notes CHANGELOG.md --dry-run

Requires GITHUB_TOKEN for write mode. The token is never printed or written.
"""
from __future__ import annotations

import argparse
import json
import mimetypes
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from audit_release_page import audit_release, print_report


def request_json(url: str, method: str, token: str, payload: dict | None = None) -> dict:
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = urllib.request.Request(url, data=data, method=method, headers={
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token,
        "User-Agent": "IVfitter-release-updater",
    })
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"GitHub API error HTTP {exc.code}: {body[:300]}") from exc


def extract_changelog_section(notes_path: Path, tag: str) -> str:
    text = notes_path.read_text(encoding="utf-8")
    version = tag.lstrip("vV")
    pattern = re.compile(rf"(^##+\s+.*(?:{re.escape(tag)}|{re.escape(version)}).*$)(.*?)(?=^##+\s+|\Z)", re.MULTILINE | re.DOTALL)
    match = pattern.search(text)
    return (match.group(1) + match.group(2)).strip() if match else text[:2500].strip()


def build_body(tag: str, notes_path: Path) -> str:
    changelog = extract_changelog_section(notes_path, tag)
    return f"""# IVfitter Web UI {tag}

## Release notes

{changelog}

## Test summary

Before publishing, run:

- `PYTHONPATH=backend python -m pytest backend/tests -q`
- `python -m compileall -q backend/ivfitter backend/tests`
- `cd frontend && npm run test -- --run --reporter=dot`
- `cd frontend && npm run build`

## Known limitations

None known beyond the limitations documented in `docs/TESTED_CURRENT.md` and the release-candidate audit notes.

## Privacy and security

Release notes and artifacts should not contain local human paths, secrets, tokens, debug-only markers, or temporary files.
""".strip()


def get_release(repo: str, tag: str, token: str) -> dict | None:
    url = f"https://api.github.com/repos/{repo}/releases/tags/{tag}"
    try:
        return request_json(url, "GET", token)
    except RuntimeError as exc:
        if "HTTP 404" in str(exc):
            return None
        raise


def upload_asset(upload_url_template: str, artifact: Path, token: str) -> None:
    upload_url = upload_url_template.split("{")[0]
    params = urllib.parse.urlencode({"name": artifact.name})
    url = f"{upload_url}?{params}"
    content_type = mimetypes.guess_type(artifact.name)[0] or "application/octet-stream"
    request = urllib.request.Request(url, data=artifact.read_bytes(), method="POST", headers={
        "Accept": "application/vnd.github+json",
        "Content-Type": content_type,
        "Authorization": "Bearer " + token,
        "User-Agent": "IVfitter-release-updater",
    })
    with urllib.request.urlopen(request, timeout=120) as response:
        response.read()


def delete_asset(repo: str, asset_id: int, token: str) -> None:
    request_json(f"https://api.github.com/repos/{repo}/releases/assets/{asset_id}", "DELETE", token)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Create/update a GitHub release for IVfitter.")
    parser.add_argument("--repo", required=True, help="OWNER/REPO")
    parser.add_argument("--tag", required=True, help="Release tag, e.g. v1.5.37")
    parser.add_argument("--artifact", required=True, help="Path to release zip/tar.gz")
    parser.add_argument("--notes", required=True, help="CHANGELOG.md or release notes source")
    parser.add_argument("--dry-run", action="store_true", help="Print planned changes without writing")
    args = parser.parse_args(argv)

    artifact = Path(args.artifact)
    notes = Path(args.notes)
    if not artifact.exists():
      raise SystemExit(f"Artifact not found: {artifact}")
    if not notes.exists():
      raise SystemExit(f"Notes file not found: {notes}")

    body = build_body(args.tag, notes)
    print(f"Release updater target: {args.repo}@{args.tag}")
    print(f"Artifact: {artifact.name} ({artifact.stat().st_size} bytes)")
    print(f"Release body length: {len(body)} characters")

    if args.dry_run:
        print("DRY RUN: would create or update release, replace same-named artifact, then audit release page.")
        return 0

    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        raise SystemExit("GITHUB_TOKEN is required for write mode. Use --dry-run for no-write preview.")

    release = get_release(args.repo, args.tag, token)
    if release is None:
        release = request_json(f"https://api.github.com/repos/{args.repo}/releases", "POST", token, {
            "tag_name": args.tag,
            "name": f"IVfitter Web UI {args.tag}",
            "body": body,
            "draft": False,
            "prerelease": "-" in args.tag,
        })
    else:
        release = request_json(f"https://api.github.com/repos/{args.repo}/releases/{release['id']}", "PATCH", token, {
            "name": release.get("name") or f"IVfitter Web UI {args.tag}",
            "body": body,
        })

    for asset in release.get("assets") or []:
        if asset.get("name") == artifact.name:
            delete_asset(args.repo, int(asset["id"]), token)
    upload_asset(release["upload_url"], artifact, token)

    print(f"Release URL: {release.get('html_url')}")
    checks, _ = audit_release(args.repo, args.tag, token)
    print_report(checks)
    return 1 if any(check.level == "FAIL" for check in checks) else 0


if __name__ == "__main__":
    raise SystemExit(main())
