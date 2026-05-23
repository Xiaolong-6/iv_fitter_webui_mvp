# Tested v1.3.8

Validation performed for the handoff package:

```text
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
cd frontend && npm install && npm run build
```

Expected manual checks:

1. Model Builder shows only Main path and Branches groups.
2. Import/input implementation details are hidden behind small ? tooltips, not permanent body text.
3. Collapsed dock shows tab icons only.
4. Numeric inputs accept draft negative/scientific notation values such as -0.1 and 1e-9.
