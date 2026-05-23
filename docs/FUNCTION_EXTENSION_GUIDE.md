# Function extension guide

The Web UI is registry-driven. Add new model functions through the backend registry first, then expose them in the frontend from `/api/component-registry`.

## Required backend steps

1. Add evaluator code in `ivfitter/components/`.
2. Add a `FunctionDefinition` in `core/component_registry.py`.
3. Add validation in `core/model_validation.py` when the function has polarity or parameter restrictions.
4. Add equation text in `core/equations.py`.
5. Add tests for registry, validation, evaluator output, and fit integration.

## Frontend rule

The frontend should not hard-code scientific meaning. It should display registry definitions, parameter descriptions, allowed polarities, and equation templates returned by the backend.

## Polarity adapter

Use the shared polarity helper:

- forward: `u=(Vj-Vt)/Vs`
- reverse: `u=(-Vj-Vt)/Vs`
- symmetric: `u=(abs(Vj)-Vt)/Vs`

Do not create separate forward/reverse/symmetric function families unless the physics is genuinely different.
