# Windows one-click scripts

Use the numbered `.bat` files in the repository root. They are the only human-facing Windows entry points.

Recommended order:

1. `00_validate_scripts.bat`
   - Checks PowerShell helper-script syntax.
   - Does not install anything.

2. `01_check_environment.bat`
   - Checks Python 3.12 and pip.
   - Does not modify the project.

Optional: `01a_install_node_lts.bat`
   - Use only if setup reports that npm was not found.
   - Installs Node.js LTS through winget after confirmation.

3. `02_setup_dev.bat`
   - Creates or reuses root `.venv`.
   - Installs backend dependencies.
   - Installs frontend dependencies if Node/npm is available.

4. `03_test_backend.bat`
   - Runs backend tests through the root `.venv`.

5. `04_run_dev.bat`
   - Opens backend and frontend in separate windows.

Optional split launchers:

- `04a_run_backend_only.bat`
- `04b_run_frontend_only.bat`

There are no unnumbered `.bat` alias wrappers in the clean workflow. This keeps the project root smaller and makes debugging clearer.
