#!/usr/bin/env python3
"""Audit a public GitHub release page before final publication.

Usage:
  python tools/audit_release_page.py --repo OWNER/REPO --tag vX.Y.Z

The script uses public GitHub REST endpoints by default. Set GITHUB_TOKEN only
for higher rate limits. It never prints the token.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any

LOCAL_PATH_PATTERNS = [r"C:\\Users\\", r"/Users/", r"/home/"]
SECRET_PATTERNS = [r"token\s*=", r"secret\s*=", r"password\s*=", r"api_key\s*="]
UNFINISHED_PATTERNS = [r"TODO", r"FIXME", r"debug only", r"temporary"]
ARCHIVE_PATTERN = re.compile(r"\.(zip|tar\.gz|tgz)$", re.IGNORECASE)

@dataclass
class Check:
    level: str
    message: str


def github_get(url: str, token: str | None = None) -> dict[str, Any]:
    request = urllib.request.Request(url, headers={"Accept": "application/vnd.github+json", "User-Agent": "IVfitter-release-auditor"})
    if token:
        request.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"GitHub API error HTTP {exc.code}: {body[:300]}") from exc


def contains_any(text: str, patterns: list[str]) -> list[str]:
    return [pattern for pattern in patterns if re.search(pattern, text, re.IGNORECASE)]


def audit_release(repo: str, tag: str, token: str | None = None) -> tuple[list[Check], dict[str, Any] | None]:
    checks: list[Check] = []
    url = f"https://api.github.com/repos/{repo}/releases/tags/{tag}"
    try:
        release = github_get(url, token)
        checks.append(Check("PASS", f"release exists for {repo}@{tag}"))
    except Exception as exc:
        checks.append(Check("FAIL", f"release not found or inaccessible: {exc}"))
        return checks, None

    body = str(release.get("body") or "")
    title = str(release.get("name") or "")
    actual_tag = str(release.get("tag_name") or "")
    assets = release.get("assets") or []
    asset_names = [str(asset.get("name") or "") for asset in assets]

    checks.append(Check("PASS" if actual_tag == tag else "FAIL", f"tag matches requested version ({actual_tag})"))
    checks.append(Check("PASS" if title.strip() else "FAIL", "release title is not empty"))
    checks.append(Check("PASS" if len(body.strip()) >= 80 else "FAIL", "release body contains changelog/release notes"))
    checks.append(Check("PASS" if re.search(r"test|pytest|vitest|build|validation", body, re.IGNORECASE) else "FAIL", "release body contains test summary"))
    checks.append(Check("PASS" if re.search(r"known limitation|limitation|none known", body, re.IGNORECASE) else "WARN", "release body contains known limitations or explicitly says none known"))

    archives = [name for name in asset_names if ARCHIVE_PATTERN.search(name)]
    checks.append(Check("PASS" if archives else "FAIL", "at least one zip/tar.gz artifact is attached"))
    version_no_v = tag.lstrip("vV")
    version_assets = [name for name in archives if tag in name or version_no_v in name]
    checks.append(Check("PASS" if version_assets else "FAIL", "artifact filename contains the release version"))

    local_hits = contains_any(body, LOCAL_PATH_PATTERNS)
    secret_hits = contains_any(body, SECRET_PATTERNS)
    unfinished_hits = contains_any(body, UNFINISHED_PATTERNS)
    checks.append(Check("FAIL" if local_hits else "PASS", "release body has no obvious local user paths" + (f" ({', '.join(local_hits)})" if local_hits else "")))
    checks.append(Check("FAIL" if secret_hits else "PASS", "release body has no obvious secrets" + (f" ({', '.join(secret_hits)})" if secret_hits else "")))
    checks.append(Check("WARN" if unfinished_hits else "PASS", "release body has no unfinished markers" + (f" ({', '.join(unfinished_hits)})" if unfinished_hits else "")))
    return checks, release


def print_report(checks: list[Check]) -> None:
    for check in checks:
        print(f"{check.level:4}  {check.message}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Audit a GitHub release page.")
    parser.add_argument("--repo", required=True, help="OWNER/REPO")
    parser.add_argument("--tag", required=True, help="Release tag, e.g. v1.5.37")
    args = parser.parse_args(argv)
    checks, _release = audit_release(args.repo, args.tag, os.environ.get("GITHUB_TOKEN"))
    print_report(checks)
    return 1 if any(check.level == "FAIL" for check in checks) else 0


if __name__ == "__main__":
    raise SystemExit(main())
