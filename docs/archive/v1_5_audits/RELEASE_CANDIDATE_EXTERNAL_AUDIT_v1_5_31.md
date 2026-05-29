# Release-candidate external audit — v1.5.31

Audit stance: read the project as an outside reviewer would before a release handoff. This is not an update of the previous audit; it is a fresh release-candidate review after the v1.5.31 UI/layout/manual/report pass.

## Verdict

**Release candidate: acceptable for user review, with non-blocking CSS debt.**

No blocking issue was found in backend fitting behavior, public fit-result schema, saved-model compatibility, or reportability logic. The release mainly changes frontend layout, user-facing explanations, and documentation. Automated validation passed for backend tests, backend compile, frontend unit tests, and production build.

## Validation performed

```bash
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
cd frontend
npm install
npm run test -- --run --reporter=dot
npm run build
```

Observed:

- Backend pytest: **122 passed**.
- Backend compileall: **passed**.
- Frontend Vitest: **8 files / 27 tests passed**.
- Frontend production build: **passed**.

## Scope reviewed

- Fitting page containment and split-pane behavior.
- Fit setup height behavior.
- Parameters table density and high-zoom resilience.
- Chart controls and touch/click target size.
- Equivalent circuit visual chrome and scaling.
- Report model/equation explanation quality.
- Manual page navigation and scroll behavior.
- Removal of separate parameter CSV / diagnostics JSON export surface.
- Version metadata, changelog, and tested-current notes.

## Findings by area

### 1. Fitting page layout

**Status: improved, release-acceptable.**

The left Fit setup pane now has a fixed compact header/action area and a true scrollable objective/run-options body that uses the available pane height. The right side keeps plots and parameters as independent regions. The new left/right resizer remains present.

Residual risk: this is still CSS-governed behavior. There is no screenshot or Playwright regression test, so final browser checks at 100%, 125%, 150%, and low-height landscape are still required.

### 2. Parameters table

**Status: improved, release-acceptable.**

The table is denser, long descriptions are no longer forced into a visible wide meaning column, values use the table's internal scroll area, and row/input heights are reduced. Hover text still carries parameter meaning/provenance, preserving scientific transparency without occupying a full column.

Residual risk: the table remains dense by nature because it is both a scientific result display and an editable control surface. A future larger refactor should split “quick fitted values” and “advanced parameter editor” modes.

### 3. Chart controls

**Status: improved.**

Text-only controls were replaced with grouped icon-style controls with larger hit areas, individual hover titles, and clearer pan/reset affordances. The toolbar is less fragmented in multi-chart view.

Residual risk: the project still uses an in-house SVG chart rather than a full plotting library. This is acceptable for the MVP but limits interaction features such as drag-zoom rectangle, axis-lock mode, and synchronized zoom across panels.

### 4. Equivalent circuit

**Status: improved.**

The circuit preview has less padding/border chrome and uses container-aware sizing. It is visually lighter and should adapt better to Model Builder pane width.

Residual risk: complex models with many branches or many series elements can still become visually crowded. A future compact topology mode should render the series path as scrollable pills and branch groups as collapsed chips.

### 5. Report model/equation section

**Status: substantially improved.**

The Report page now explains the model in user-facing circuit language: terminal voltage → main path → internal junction voltage → branch currents → summed terminal current. The backend technical equation summary is still available but collapsed. This is much better for a scientific user reviewing whether the fit makes physical sense.

Residual risk: the formula renderer is lightweight and does not parse arbitrary backend equation strings. The release handles this correctly by keeping backend strings in a technical disclosure rather than presenting them as polished user explanations.

### 6. Manual page

**Status: improved.**

The manual page is now a stable reader: compact hero, left navigation, and one independently scrollable content pane. The redundant dropdown/current-section style UI and developer-facing tutorial wording are not part of the visible header. The left navigation is the primary way to jump between manual sections.

Residual risk: manual content is still extensive. It is now more usable, but a future release should consider a search box and “quick start / advanced details” split.

### 7. Removed exports

**Status: acceptable.**

The separate parameter CSV and diagnostics JSON export buttons and client/backend paths were already removed in the previous cleanup and remain absent from active frontend/backend code. Full report CSV and HTML report remain available, which is sufficient for normal user review and export.

Historical self-audit docs still mention the old export paths; those are archival notes, not active product documentation. No active runtime code path was found for these buttons.

### 8. Versioning and release documentation

**Status: good.**

Version metadata is synchronized to v1.5.31 in frontend, backend, root package metadata, README, changelog, tested-current notes, and handoff notes.

## Non-blocking technical debt

1. **CSS debt remains high.** `frontend/src/style.css` is approximately 4,690 lines and contains 255 `!important` declarations. This is not a release blocker for v1.5.31, but it is the largest maintainability risk.
2. **FittingPage.tsx remains a coordination-heavy component.** It is about 2,010 lines. A future refactor should split fit session state, report state, and layout state into hooks.
3. **No visual regression tests.** The most important changes in this release are layout changes; automated tests do not prove pixel-level behavior.
4. **Manual and report text are English-first.** Chinese strings exist in key places, but the most polished report phrasing should be checked in both languages before a bilingual release.

## Release recommendation

Proceed to user/browser review with v1.5.31.

Manual checks before tagging:

1. Open Fitting at 100%, 125%, and 150% browser zoom.
2. Confirm Fit setup scrolls internally and does not leave a short dead scroll box with blank space below.
3. Confirm Parameters are readable and do not overlap at high zoom.
4. Confirm plot toolbar buttons are clearly clickable and do not crowd the title/legend.
5. Confirm Model page Equivalent circuit scales with pane width.
6. Confirm Report model explanation is readable without opening the technical equation summary.
7. Confirm Manual left navigation changes sections and the content pane scrolls independently.

## Overall external-audit score

- Architecture stability: **Good**
- Backend/scientific contract preservation: **Good**
- UI release readiness: **Acceptable after manual browser pass**
- Documentation/version consistency: **Good**
- Maintainability: **Moderate risk due to CSS and FittingPage size**

Final recommendation: **ship as a release candidate package, not yet as a long-term UI-stable baseline.**
