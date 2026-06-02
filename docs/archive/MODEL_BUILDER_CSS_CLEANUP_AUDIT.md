# Model Builder CSS Cleanup Audit — v1.8.36

## Direct conclusion

This release removes the legacy `final-overrides.css` override pile and consolidates the Model Builder editor-panel rules back into `frontend/src/styles/model-builder.css`.

The previous state was not acceptable for maintainability:

- `final-overrides.css` was a 3,000+ line late-loaded override file.
- It contained nearly 2,000 `!important` declarations.
- It redefined key Model Builder selectors multiple times, including `.xy-canvas-component-editor`.
- Panel height and overflow rules contradicted each other, causing clipping and unpredictable inspector layout.

## What changed

### 1. Removed final override import

`frontend/src/style.css` no longer imports:

```css
@import "./styles/final-overrides.css";
```

### 2. Deleted the stale override file

`frontend/src/styles/final-overrides.css` was removed from the source package.

### 3. Consolidated Model Builder editor CSS

The active Model Builder editor-panel rules now live in one canonical section in:

```text
frontend/src/styles/model-builder.css
```

Canonical selectors include `.xy-canvas-component-editor`, `.xy-editor-header`, `.xy-editor-title-block`, `.xy-editor-fields`, `.xy-custom-expression-field`, `.xy-canvas-component-role`, `.xy-canvas-component-equation`, and `.xy-canvas-preview-panel .canvas-model-preview`.

### 4. Fixed panel overflow behavior

The component inspector now has one explicit scroll policy:

```css
.xy-canvas-component-editor {
  max-height: min(760px, calc(100vh - 110px));
  overflow: auto;
}
```

The role description is no longer forcibly clipped with `max-height: 44px`.

### 5. Width is variable-driven

Responsive width is controlled by a single custom property on `.model-builder`:

```css
.model-builder {
  --xy-canvas-editor-width: min(420px, 34vw);
}
```

The editor consumes only `width: var(--xy-canvas-editor-width);`, avoiding repeated conflicting width declarations.

## Verification performed

Static checks performed in this package:

- `frontend/src/style.css` contains no `final-overrides.css` import.
- `frontend/src/styles/final-overrides.css` is absent.
- `model-builder.css` contains one base `.xy-canvas-component-editor` definition.
- `model-builder.css` contains one base `.xy-canvas-component-role` definition.
- No `max-height: 44px` clipping rule remains for `.xy-canvas-component-role`.
- No OpenAI internal npm registry URL remains in `frontend/package-lock.json`.

## Remaining caution

`model-builder.css` still contains some `!important` declarations inherited from earlier React Flow override work. These should be reduced in a later broader CSS pass, but the critical late-loaded `final-overrides.css` pile has been removed and the inspector-panel conflict has been resolved.

## Rule for future agents

Do not recreate a late-loaded global override file. If a selector needs to be changed, edit its canonical section in the owning CSS file. For Model Builder, the owning file is `frontend/src/styles/model-builder.css`.
