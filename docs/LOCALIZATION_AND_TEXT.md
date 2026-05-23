# Localization and user-text architecture

This document defines how visible UI text, user-manual prose, and translations should evolve.

## Principle

User-visible text is product content. It should not be deeply tangled with application behavior.

When a future change adds or rewrites a meaningful amount of text, first ask:

- Could this text need another language later?
- Could a non-coding reviewer improve it?
- Could a translator or general AI assistant update it without understanding the source code?
- Could the same pattern appear again in another feature?

If yes, prefer extracting the text into a small dictionary, content object, JSON-like module, Markdown source, or other simple structure before expanding the feature.

## Desired direction

The long-term target is:

- UI behavior remains in React/TypeScript components.
- Translatable labels, help text, and documentation copy live in content structures.
- Translation work can be reviewed as text changes, not logic changes.
- Technical identifiers remain stable and are not translated accidentally.

This does not require a new i18n framework. Use the existing stack unless a new dependency is explicitly approved.

## What should be separable

Prefer separable content for:

- navigation labels;
- button labels;
- form labels and hover/help text;
- warning explanations and user actions;
- Model Builder function descriptions;
- User Manual section titles and body copy;
- fitting recipes, troubleshooting entries, and glossary definitions.

## What should stay as technical identifiers

Do not translate or rewrite these unless there is a deliberate display alias:

- serialization keys such as `D1.I0_A`;
- internal schema fields such as `law_id`, `placement`, or `evaluation_form`;
- units such as V, A, ohm, S;
- formula symbols such as `Vj`, `I0`, `Rs`, `Rsh`;
- solver names and compatibility labels when they are part of reproducibility.

When technical identifiers appear in normal UI, show them only because the user needs them for reproducibility, formulas, or reporting.

## Recommended implementation pattern

For small labels, use the existing `frontend/src/model/i18n.ts` dictionary.

For larger content, create content modules shaped like data, for example:

```ts
export const manualSections = {
  en: [{ id: "parameters", title: "Parameters", body: [...] }],
  zh: [{ id: "parameters", title: "参数", body: [...] }],
};
```

Keep rendering components responsible for layout only. They should map over content data rather than embedding long paragraphs inline.

If content becomes large enough that a translator should edit it directly, consider Markdown or JSON-like files, but avoid new build dependencies unless explicitly approved.

## Translation workflow

When adding translatable content:

1. Add or update the English source.
2. Add a Chinese translation or mark the exact missing translation clearly in the content structure.
3. Keep keys stable across languages.
4. Avoid mixing English and Chinese in one visible paragraph.
5. Run the app in both languages and check the affected screens.

When a translation-only update is requested, the agent should not need to inspect fitting math, backend code, or serialization logic. It should be able to edit the content source and run a frontend build/browser check.

## Agent rule

Before implementing a feature with many user-facing strings, agents must state whether the strings are:

- small enough for the existing i18n dictionary;
- large enough to deserve a separate content module;
- better handled as external user documentation.

If the answer is unclear, ask before adding more text directly into JSX.
