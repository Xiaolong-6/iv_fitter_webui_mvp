# Documentation index

This file is the stable entry point for IV-fitter Web UI documentation.

## Start here

| Audience | Read first | Purpose |
|---|---|---|
| User | `README.md` | What the app does, how to run it, and how to test it in a browser. |
| Developer | `docs/HUMAN_DEVELOPER_SETUP.md` | Local setup, scripts, and validation commands. |
| Agent | `PROJECT_RULES.md` then `docs/WEBUI_AGENT_HANDOFF.md` | Operating rules and current technical handoff. |
| Release checker | `docs/TESTED_CURRENT.md` and `docs/VALIDATION_HISTORY.md` | Current validation status and historical validation summary. |

## Current core docs

### User-facing behavior

- `README.md` — concise project overview and launch instructions.
- `docs/DATA_IMPORT_EXPORT.md` — current Import page flow, CSV formats, all-trace spreadsheet preview, units, and export expectations.
- `docs/REPORTING.md` — report/export requirements and reproducibility expectations.
- `docs/RESPONSIVE_WORKSPACE.md` — responsive layout, mobile behavior, and app-local zoom.
- `docs/USER_DOCUMENTATION_POLICY.md` — how user-facing docs should be written.
- `docs/USER_TRANSPARENCY_UX.md` — what the UI must expose to users without leaking internal implementation text.
- `docs/LOCALIZATION_AND_TEXT.md` — how UI text, translations, and larger content blocks should be separated from behavior.

### Developer-facing architecture

- `docs/ARCHITECTURE.md` — current runtime split and model architecture.
- `docs/FUNCTION_EXTENSION_GUIDE.md` — how to add model functions without breaking the Law / Form / Placement architecture.
- `docs/PHYSICS_MODELING_POLICY.md` — modeling boundaries and interpretation policy.
- `docs/SCHEMA_STABILITY.md` — API/result schema stability rules.
- `DEPENDENCIES.md` — approved stack and dependency policy.

### Agent and maintenance docs

- `PROJECT_RULES.md` — highest-priority project rules.
- `docs/DEVELOPMENT_PRINCIPLES.md` — recurring engineering principles distilled from commit-history fixes and audit findings.
- `docs/WEBUI_AGENT_HANDOFF.md` — current agent handoff. Use this instead of old one-off handoff notes.
- `docs/VALIDATION_HISTORY.md` — consolidated validation history.
- `docs/TESTED_CURRENT.md` — current package validation note.
- `docs/NPM_TROUBLESHOOTING.md` — Node/Vite/npm troubleshooting.
- `docs/FRONTEND_STYLESHEET_ARCHITECTURE.md` — CSS module ownership and cascade rules.
- `docs/RELEASE_CHECKLIST.md` — release readiness checklist.
- `docs/RELEASE_MANAGER.md` — read-only in-app update checking and maintainer-only release workflow.
- `docs/RELEASE_PRIVACY_CHECKLIST.md` — privacy/path leakage rules for release text.
- `docs/FITTING_PARITY_AND_DIAGNOSTICS.md` — fitting parity and diagnostics notes.
- `docs/NUMERICAL_SANITY_AND_HOVER.md` — numerical sanity and hover diagnostics notes.
- `docs/ROADMAP.md` — future work.
- `docs/VERSION_CONTROL.md` — versioning and packaging conventions.

## Archived historical docs

Historical v1.5 self-audit and release-candidate audit markdown files were removed from the active release package. Use version-control history if old audit snapshots are needed.

Do not recreate one-off handoff/tested/audit files for every small internal iteration. Update the current handoff/tested documents instead, and only create a version-specific document for a major public release or external audit package.
