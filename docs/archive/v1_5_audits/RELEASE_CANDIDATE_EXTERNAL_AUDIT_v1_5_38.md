# Release-candidate external audit — v1.5.38

## Scope

This audit reviews the v1.5.38 cleanup after the v1.5.37 release-manager and invalid-report work. The review focuses on User Manual information architecture, release-check status semantics, update-panel placement, and whether the change preserves fitting/report behavior.

## External-auditor conclusion

**Release-candidate status: acceptable for browser/user review.**

v1.5.38 fixes the main user-facing issue introduced by v1.5.37: the full Updates/release-notes panel no longer dominates the User Manual sidebar. The manual now keeps navigation primary, while update checking is presented as a compact read-only footer. The release checker also distinguishes a local development build that is newer than the latest public GitHub release from a true “up to date” state.

## Findings

### 1. Manual information architecture

- The left side is again primarily a section navigator.
- Version/update information is present but compact.
- Release notes/assets are hidden behind an explicit details control.
- The main manual content remains independently scrollable.

Residual risk: the manual still uses section-by-section content rather than a long continuous article. This is intentional for the current UI but should be checked with real users.

### 2. Release-check semantics

- `updateAvailable` remains true only when the public release is newer than the local build.
- A local build newer than the public release is now labeled as such instead of being summarized simply as “Up to date”.
- Network failures are still contained in structured state and do not block app startup or fitting.
- No GitHub write token is used by the frontend/runtime.

### 3. Manual equations and wording

- The first manual section now uses user-facing labels for the two central equations: external voltage balance and total current.
- The text better explains why Report diagnostics matter when the optimizer terminates but the result is not scientifically usable.

### 4. Scientific/algorithmic safety

No fitting physics, optimizer, model registry, backend API, saved-model compatibility, or reportability logic was intentionally changed in this version.

## Non-blocking limitations

1. There is still no automated screenshot/Playwright coverage for manual layout.
2. Update-check display depends on GitHub’s public latest-release endpoint; if public releases lag behind internal builds, the new “local newer” state is expected.
3. Manual prose can continue to be improved, but the current structure is no longer misleading or developer-facing.

## Recommended manual checks

1. Open User Manual at 100%, 125%, and 150% zoom.
2. Confirm section navigation remains usable and not hidden by Updates.
3. Click Check for updates when public latest release is older than the local build; confirm the status says local version is newer than public release.
4. Expand release details and confirm release notes do not permanently occupy the sidebar.
5. Toggle Chinese/English and confirm new update labels render.

## Verdict

v1.5.38 is suitable as a corrected release-candidate package for manual browser review.
