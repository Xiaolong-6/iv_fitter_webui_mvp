# Root dependency entry points

This package intentionally exposes dependency entry points at the repository root so a user can overwrite the app folder without hunting inside subdirectories.

- Python: `requirements.txt` plus editable backend install from `./backend`.
- Frontend: root `package.json` installs React/Vite/TypeScript dependencies into root `node_modules`.
- Human scripts: use the numbered `.bat` files in the root.

The backend package metadata remains in `backend/pyproject.toml` and the frontend source remains in `frontend/`. The root files are the human-facing setup contract.
