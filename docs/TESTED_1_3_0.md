# Tested 1.3.0

Expected validation before commit/package:

```text
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
cd frontend
npm install
npm run build
```

User-facing consistency checks:
- Sidebar version shows v1.3.0.
- Function guide says functions are equations and placement is separate.
- Model Builder exposes placement/initials clearly.
- Fitting logic tab matches backend solver behavior.
- Parameters and warnings remain under the plot workspace.
