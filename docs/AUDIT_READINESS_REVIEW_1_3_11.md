# Audit readiness review — v1.3.11

## Scope

This review was performed on the v1.3.10 handoff package before preparing v1.3.11. It focused on package consistency, documentation consistency, rule hygiene, build/test status, privacy/package hygiene, and likely audit blockers.

## Automated checks run

```text
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
npm install
npm run build
```

Result:

```text
24 passed
frontend build succeeded
backend compileall succeeded
```

## Issues found and fixed in v1.3.11

### 1. README contained stale duplicated sections

The README had old version text and a stale statement that the snapshot was version 1.0.0. It also still contained older frontend/backend setup notes that conflicted with the root-level dependency workflow.

Action taken:

- Rewrote README as a concise current-version handoff document.
- Updated current version to 1.3.11.
- Documented root-level dependency manifests and numbered scripts.

Principle reinforced:

- Handoff packages must not contain stale version claims or conflicting setup instructions.

### 2. PROJECT_RULES.md had become version-specific and repetitive

The rules file accumulated repeated v1.3.x incident blocks. This made it harder to identify stable operating principles.

Action taken:

- Reorganized rules into durable sections.
- Added a rules-maintenance rule requiring periodic consolidation.
- Kept the important lessons: ambiguity gate, user-facing formula rendering, HappyMeasure compatibility, numeric drafts, selected-trace plotting, i18n, hover help, and package hygiene.

Principle reinforced:

- Rules should be stable operating principles, not an unmaintained incident log.

### 3. Some policy docs still used old core/series/parallel wording

`PHYSICS_MODELING_POLICY.md` and `USER_TRANSPARENCY_UX.md` still described user-facing topology using older internal buckets.

Action taken:

- Rewrote those policy docs around Law / Form / Placement and user-facing Main path / Branches semantics.

Principle reinforced:

- User-facing docs must match current UI semantics.

### 4. Package hygiene requires cleanup after local validation

Running tests/build creates `node_modules`, `dist`, `__pycache__`, and `.pytest_cache` locally. These must not be included in the handoff zip.

Action taken:

- v1.3.11 packaging cleanup removes generated folders before zipping.

Principle reinforced:

- A package is not audit-ready until generated artifacts are removed.

## Known limitations not fixed in v1.3.11

These are not hidden; they should be treated as next audit/development items.

1. **Manual browser interaction was not verified in this environment.** Automated build checks do not prove every UI interaction works.
2. **Backend equation summaries are still string-based.** The frontend renders them into user-facing formula cards, but a cleaner architecture would return structured formula/equation objects from the backend.
3. **Fit Quality Verdict is not fully implemented.** The UI has warnings and quality gates, but the richer verdict requested in UI review — credible / suspicious / failed with reasons and next steps — remains roadmap work.
4. **Parameter interpretability labels are not complete.** Statuses such as weakly constrained, near-bound, inherited seed, or not identifiable are not yet systematically computed.
5. **Developer details can still appear in advanced sections.** This is intentional, but audit should check that they are not visible in the normal workflow.
6. **i18n coverage should be manually clicked.** Static build cannot prove every runtime string is translated.

## Recommended next version

Suggested next version: v1.3.12 or v1.4.0 depending on scope.

Recommended focus:

- Fit Quality Verdict with actionable diagnostics.
- Parameter status/identifiability labels.
- Structured backend equation schema instead of parsing strings in the frontend.
- Manual browser audit checklist and screenshot pass.
