# User transparency and friendliness policy

The Web UI should expose enough information for scientific review without forcing users to read source code or developer notes.

## Required transparency surfaces

1. **Data tab:** imported source, selected trace, trace count, point count, and spreadsheet preview.
2. **Model summary:** user-facing Main path and Branches, with nicknames such as Rs and Rsh where useful.
3. **Function guide:** law purpose, typical use region, parameters, polarity, and advanced/internal details only behind disclosure controls.
4. **Equation preview:** model-specific equivalent circuit and formatted formulas generated from the same model sent to the backend.
5. **Fit setup:** all inputs/selectors have concise hover help without crowding the main UI.
6. **Parameter table:** values, units, bounds, fit/fixed state, and uncertainty when available.
7. **Warning/quality panels:** numerical warnings, possible physical/modeling causes, and actionable next steps.
8. **Export metadata:** exact model, config, version, warnings, and import quality.

## UI wording rules

- Prefer user-facing topology words: `Main path` and `Branches`.
- Keep internal terms such as `core`, `series`, `parallel`, adapter names, and wrapper schema names out of the primary workflow.
- Prefer `reverse leakage / soft breakdown` over just `breakdown`.
- Prefer `main-path voltage drop` over vague `series function`.
- Label empirical functions as empirical unless a physical mechanism has been independently established.
- Display units beside parameter names.
- Unsupported combinations should be disabled or warned, never silently converted.
- If a sentence mainly helps developers/agents, move it to hover help, details, or documentation rather than putting it in the main UI.
