# Release-candidate external audit — v1.5.39

## Scope

This audit reviews the v1.5.39 User Manual reader correction after the v1.5.38 manual/update-panel cleanup. The change is intentionally UI-only: it changes manual navigation behavior from one-section replacement to a continuous scrollable document with quick-position navigation.

## External reviewer verdict

**Release-candidate status: acceptable for browser review.**

The update addresses the main usability concern: users can now read the User Manual as one continuous document while using the left section list as fast navigation. This avoids both previous extremes: a long unstructured wall and a one-section-at-a-time reader that felt fragmented.

## What changed

- The manual content area renders all manual sections in one scrollable pane.
- The left navigation acts as quick-position tabs/anchors instead of replacing the content body.
- Active section highlighting follows scroll position.
- Manual section headings no longer show hard-coded numeric prefixes in the body, avoiding duplicate or inconsistent numbering as the document evolves.
- The compact update-check footer remains in the left sidebar and does not dominate manual content.

## Non-goals confirmed

This change did not alter:

- fitting equations or optimizer behavior,
- backend API contracts,
- saved-model compatibility,
- reportability rules,
- invalid-fit diagnostic report logic,
- release-check network behavior or GitHub updater scripts.

## Residual risks

1. There is still no Playwright/screenshot regression test for manual scrolling behavior.
2. Very small portrait screens may still prefer natural whole-page scrolling rather than fixed-pane scrolling; this is handled by existing responsive CSS but should be manually checked.
3. Function Guide remains an embedded selector inside the continuous manual. This is acceptable because its content is too dense to expand fully by default, but it should be reviewed visually.

## Recommended manual browser checks

1. Open User Manual in English and confirm all sections are in one continuous scrollable document.
2. Click several left navigation items and confirm the content pane scrolls to that section.
3. Scroll manually and confirm the active nav item updates.
4. Repeat after switching to Chinese.
5. Check 100%, 125%, and narrow viewport layouts.

## Conclusion

v1.5.39 is a focused manual-reader usability correction and is suitable as the next release-candidate package for manual review.
