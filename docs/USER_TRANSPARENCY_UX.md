# User transparency and friendliness policy

The Web UI should expose enough information for scientific review without forcing users to read source code.

## Required transparency surfaces

1. Current model summary: core, series, and parallel components.
2. Function library drawer: formula, allowed polarity, parameters, and physical role.
3. Equation preview: generated from the same `ModelSpec` sent to the backend.
4. Parameter table: value, unit, bounds, fit/fixed state, and uncertainty when available.
5. Warning panel: compliance exclusion, invalid parameters, custom expressions, and bound issues.
6. Export metadata: exact model, config, version, warnings, and import quality.

## UI wording rules

- Prefer `reverse leakage / soft breakdown` over just `breakdown`.
- Prefer `series conductance boost` over vague `dynamic Rs` when the function reduces effective series resistance.
- Label empirical functions as empirical unless a physical mechanism has been independently established.
- Display units beside parameter names.
- Unsupported combinations should be disabled or warned, never silently converted to custom.
