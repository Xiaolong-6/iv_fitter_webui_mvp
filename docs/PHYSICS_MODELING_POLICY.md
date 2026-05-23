# Physics modeling policy

This project treats empirical fitting terms as compact-model components, not as automatic physical proof.

## Rules for physical rigor

1. Every function must state its topology: core, series, or parallel.
2. Every polarity transform must be explicit: forward, reverse, or symmetric.
3. Parameters must carry units and bounds when possible.
4. A fitted parameter should be interpreted physically only when it is identifiable, stable under reasonable fit ranges, and not pinned to bounds.
5. Reverse soft-breakdown terms may also represent gradual voltage-dependent leakage; UI text must not force an avalanche/Zener interpretation unless the data support it.
6. Custom expressions must be included in exported results and warnings so the fit can be reproduced and reviewed.
7. Unsupported function/polarity combinations must fail validation; they must never silently become custom functions.

## Reporting language

Use cautious labels in the UI and reports:

- `reverse leakage / soft breakdown` instead of only `breakdown`.
- `series conductance boost` instead of unexplained `dynamic Rs`.
- `empirical high-bias branch` when a term is curve-shape motivated.

## Function extension checklist

Before adding a new function, define:

- topology and polarity support;
- formula and auxiliary functions;
- parameter names, units, defaults, and bounds;
- expected physical role and limits of interpretation;
- validation rules;
- equation-summary text;
- tests for numerical behavior and invalid configurations.
