# External-style release-candidate audit — v1.5.37

## Verdict

Release-candidate status: acceptable for browser/user review after manual visual checks.

This audit treats the repository as if reviewed by a fresh outside agent. The v1.5.37 changes are UI semantics, report diagnostics, release-check infrastructure, and layout regression fixes. No intentional fitting physics, optimizer, residual weighting, backend schema, or saved-model behavior changes were made.

## Positive findings

- Invalid/non-reportable fits now use explicit state language: **Invalid fit** and **Diagnostic report only**.
- The Report page explains that numerical optimizer termination is not equivalent to a validated fit.
- Failure diagnostics are grouped by root cause, with raw backend diagnostic codes moved into a technical details section.
- Suggested recovery actions are visible before equations for invalid fits.
- Diagnostic exports are explicitly labelled troubleshooting-only.
- Parameter summaries identify near-bound or suspect values and use consistent scientific notation through shared formatting helpers.
- Manual page now has compact left navigation, independent content scrolling, and an Updates panel rather than a redundant top selector.
- The in-app release checker is read-only and contains no GitHub write token.
- Developer release scripts keep write operations outside the app runtime and include privacy/security checks.
- The Parameters table containment regression from v1.5.36 was addressed without reverting the stylesheet modularization.

## Remaining non-blocking risks

- Report invalid-state classification is based on current warnings, reportability flags, and curve-scale heuristics. It improves presentation but does not replace backend reportability logic.
- There is still no Playwright/screenshot regression test for the exact Fitting/Report/Manual layouts.
- Release updater write mode was not exercised against GitHub during this offline package validation; dry-run and syntax validation are covered locally.
- The update checker depends on GitHub availability when manually triggered, but failure is non-blocking by design.

## Manual release checks required

1. Valid fit report: normal report labels and model explanation remain available.
2. Invalid numerical-explosion report: top card says invalid, diagnostic-only, suggested actions visible, raw codes collapsed.
3. Warning-only fit report: status is needs review, not invalid unless quality gates fail.
4. Parameters table at 100%, 125%, and 150% app zoom: no hidden large blank region, no overlapping columns.
5. User Manual: left nav remains visible; content scrolls independently; Updates panel works or fails gracefully.
6. Chinese/English language toggle: no broken UI labels in Report, Manual, and Updates.
7. Narrow/portrait viewport: Report and Manual collapse safely.

## Validation commands

Expected validation for this release candidate:

```bash
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests tools/audit_release_page.py tools/update_github_release.py
cd frontend
npm run test -- --run --reporter=dot
npm run build
```
