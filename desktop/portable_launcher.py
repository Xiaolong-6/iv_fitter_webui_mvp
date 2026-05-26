"""Windows portable launcher for IV-fitter Web UI.

The PyInstaller build bundles this module, the backend package, runtime
dependencies, and the Vite production frontend. At runtime it serves the
frontend and API from one localhost process, then opens the user's browser.
"""

from __future__ import annotations

import os
import socket
import sys
import threading
import time
import webbrowser
from pathlib import Path

import uvicorn
from fastapi.staticfiles import StaticFiles

from ivfitter.api.main import app


APP_NAME = "IV-fitter"


def _resource_root() -> Path:
    if getattr(sys, "frozen", False):
        return Path(getattr(sys, "_MEIPASS", Path(sys.executable).parent))
    return Path(__file__).resolve().parents[1]


def _frontend_dist() -> Path:
    root = _resource_root()
    candidates = [
        root / "frontend_dist",
        root / "dist",
        root / "frontend" / "dist",
    ]
    for candidate in candidates:
        if (candidate / "index.html").exists():
            return candidate
    joined = ", ".join(str(path) for path in candidates)
    raise RuntimeError(f"Frontend build was not found. Checked: {joined}")


def _free_port(preferred: int = 8765) -> int:
    for port in range(preferred, preferred + 100):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                sock.bind(("127.0.0.1", port))
            except OSError:
                continue
            return port
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def _open_browser_later(url: str) -> None:
    def worker() -> None:
        time.sleep(0.8)
        webbrowser.open(url)

    threading.Thread(target=worker, daemon=True).start()


def main() -> int:
    dist = _frontend_dist()
    requested_port = os.getenv("IVFITTER_PORT")
    port = int(requested_port) if requested_port else _free_port()
    url = f"http://127.0.0.1:{port}"
    os.environ["IVFITTER_CORS_ORIGINS"] = url

    # Mount after API routes so /api/* remains handled by FastAPI endpoints.
    if not any(getattr(route, "name", None) == "frontend" for route in app.routes):
        app.mount("/", StaticFiles(directory=str(dist), html=True), name="frontend")

    print(f"{APP_NAME} portable is starting at {url}")
    print("Close this window to stop the local app.")
    if os.getenv("IVFITTER_NO_BROWSER") != "1":
        _open_browser_later(url)
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="warning")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
