# Function extension guide

The Web UI is registry-driven. New model functions should be added through the backend first, then exposed in the frontend through the component registry and user-facing documentation.

## Required backend steps

1. Add evaluator code in the fitting/model component layer.
2. Add or update the function definition in `core/component_registry.py`.
3. Add validation in `core/model_validation.py` when placement, polarity, or parameter restrictions matter.
4. Add equation text or structured summary support in `core/equations.py`.
5. Add tests for registry visibility, validation, evaluator output, and fit integration.

## Required frontend steps

1. Expose the law only in valid placements: **Main path** or **Branches**.
2. Show user-facing names and descriptions by default.
3. Put schema details in collapsed **Advanced details** only.
4. Render formulas through the existing math/formula component; do not add a new math-rendering library without approval.
5. Keep mobile layout usable at <= 640 px.

## User documentation rule

Every function in the Function Guide should answer, by default:

- what physical phenomenon it describes;
- when to use it;
- when not to use it;
- how it changes the I-V curve;
- what the main parameters mean;
- how to fit it safely.

Internal terms such as law IDs, forms, placements, adapter names, serialization notes, and parameter keys must stay inside collapsed **Advanced details**.

## Dependency rule

Do not add new libraries, frameworks, services, plotting packages, or math renderers without explicit user approval. Extend the existing lightweight formula rendering when possible.
