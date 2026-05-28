# Tested current — v1.5.40

Validated after fitting plot/control polish, manual navigation compaction, Start page wording/action polish, and Data copy cleanup.

Commands run:

```bash
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests tools/audit_release_page.py tools/update_github_release.py
```

Observed result:

- Backend pytest: passed.
- Python compileall: passed.
- Frontend Vitest/build: not completed in this environment because npm dependency install is blocked by package registry/mirror availability.

Local release validation still required:

```bash
cd frontend
npm install
npm run test -- --run --reporter=dot
npm run build
```

Manual browser checks recommended: Start page, Data header, Fitting plot-pair selector, plot/parameter resize handle, chart icon controls, Manual compact section tabs, English/Chinese switching.
