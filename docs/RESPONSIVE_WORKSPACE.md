# Responsive workspace

The Web UI uses a viewport-oriented layout for desktop and a continuous one-column workflow on phone portrait screens.

## Goals

- Fit the main workflow into one screen on common landscape laptop/desktop displays.
- Keep control, plot, and result areas visible at the same time where screen space allows.
- Use internal panel scrolling on desktop rather than one long page scroll.
- On screens <= 640 px, remove desktop-style vertical gaps and let sections flow continuously in one column.
- Keep the mobile **Run fit** action full-width and sticky above the bottom tab navigation.
- Support app-local zoom through toolbar buttons and Ctrl + mouse wheel.

## Human controls

In the top toolbar:

```text
−  100%  +
```

also supports:

```text
Ctrl + mouse wheel
```

The app-local zoom changes UI density without requiring browser-level zoom. Current high-resolution support allows zoom above the older 118% ceiling.

## Mobile interaction rules

- Section headers need large tap targets, visible chevrons, and short status summaries.
- Voltage range controls must stay compact; V min and V max should not consume excessive vertical space.
- Backend connection failures should appear as user-facing banners with Retry/Help actions, not raw `TypeError: Failed to fetch` text.
- Avoid decorative effects that slow fitting, hide warnings, or make the workflow less clear.
