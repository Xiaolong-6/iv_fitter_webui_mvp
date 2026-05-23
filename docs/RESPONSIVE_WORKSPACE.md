# Responsive workspace

The Web UI uses a viewport-oriented layout.

## Goals

- Fit the main workflow into one screen on common landscape laptop/desktop displays.
- Keep control, plot, and result areas visible at the same time.
- Use internal panel scrolling rather than one long page scroll.
- Fall back to stacked layout on narrow screens or portrait orientation.
- Support app-local zoom through toolbar buttons and Ctrl + mouse wheel.

## Human controls

In the top toolbar:

```text
−  92%  +
```

also supports:

```text
Ctrl + mouse wheel
```

The app-local zoom changes UI density without requiring browser-level zoom.

## Layout

Landscape:

```text
sidebar | controls | plots | results
```

Narrow/portrait:

```text
sidebar
controls
plots
results
```

## Rule

Avoid adding new long top-level page sections. New panels should either be collapsible, placed inside the existing control/result stacks, or exposed through a drawer/modal.
