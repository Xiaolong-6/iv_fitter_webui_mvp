# Release Manager workflow

IVfitter separates ordinary user/runtime update checking from maintainer-only release publishing.

## In-app release checker

The Web UI includes a read-only release checker in the User Manual / Updates panel.

- It reads the local version from `frontend/package.json` through `frontend/src/utils/version.ts`.
- It queries GitHub's public latest-release endpoint for `Xiaolong-6/iv_fitter_webui_mvp`.
- It compares semantic versions such as `v1.5.36`, `1.5.36`, `v1.5.36-alpha.1`, and `v1.6.0`.
- It shows current version, latest version, checked time, status, body excerpt, attached asset names, and a link to the release page.
- It never auto-downloads, auto-installs, or replaces the app.
- Network errors are shown in the panel and never block startup, fitting, reporting, or local use.
- No GitHub write token is present in frontend code or normal runtime code.

Manual browser check:

1. Open Help / User Manual.
2. In the Updates panel, click **Check for updates**.
3. Confirm the panel shows Up to date, Update available, or Check failed.
4. If a release URL exists, click **Open release page**.

## Audit a release page

Use the public audit script before finalizing a release page:

```bash
python tools/audit_release_page.py --repo Xiaolong-6/iv_fitter_webui_mvp --tag v1.5.37
```

The script checks that the release exists, the tag matches, release notes and test summary exist, limitations are documented, an archive artifact is attached, the artifact filename contains the version, and the release body does not include obvious local paths, secrets, or unfinished markers.

`GITHUB_TOKEN` is optional for higher public API rate limits. The audit script does not need write permission.

## Update a GitHub release as maintainer

Use the updater only from a maintainer environment. It requires `GITHUB_TOKEN` in write mode and never prints or writes the token.

Dry-run first:

```bash
python tools/update_github_release.py \
  --repo Xiaolong-6/iv_fitter_webui_mvp \
  --tag v1.5.37 \
  --artifact dist/iv_fitter_webui_mvp_1_5_37.zip \
  --notes CHANGELOG.md \
  --dry-run
```

Write mode:

```bash
set GITHUB_TOKEN=...
python tools/update_github_release.py \
  --repo Xiaolong-6/iv_fitter_webui_mvp \
  --tag v1.5.37 \
  --artifact dist/iv_fitter_webui_mvp_1_5_37.zip \
  --notes CHANGELOG.md
```

The updater creates or updates the release, replaces a same-named artifact, uploads the selected zip/tar.gz, then calls the audit logic and prints the final release URL.

## Security and privacy rules

- Do not put GitHub write tokens in frontend code.
- Do not store tokens in repository files.
- Do not log tokens.
- Do not publish release notes containing `C:\Users\`, `/Users/`, `/home/`, `token=`, `secret=`, `password=`, `api_key=`, `TODO`, `FIXME`, `debug only`, or `temporary`.
- Commit and release content must not expose local human names, local working paths, private credentials, or machine-specific scratch files.
