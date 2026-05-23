# TESTED 1.3.7

Validation target for v1.3.7 handoff package.

Focus:
- Model-specific equation preview uses displayed formula blocks rather than raw backend/debug strings.
- Right workspace uses real scroll ownership through a flex-based layout and independently scrollable result column.
- Numeric inputs allow partial negative/scientific notation while typing and commit only on blur/Enter.
- Residual floor updates automatically when the selected trace changes.

Commands run:

```bash
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
cd frontend && npm install && npm run build
```
