# Tested v1.3.15

Validation target: compact equivalent-circuit layout and removal of duplicate Model Builder summary text.

## Commands run

```text
npm install
npm run build
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
```

## Results

```text
npm install: passed, 69 packages installed, 0 vulnerabilities reported
npm run build: passed
backend tests: passed, 32 tests
compileall: passed
```

## Expected manual checks

- Model Builder title shows only the title/help, not repeated Main path / Branches text.
- Equivalent-circuit preview reads left-to-right through the main path to Vj.
- Parallel branches are drawn below the main path, folding left from Vj to a shared return bus and one shared terminal-minus node.
- Narrow windows keep the branch stack below the main path instead of pushing branches off to the right.
