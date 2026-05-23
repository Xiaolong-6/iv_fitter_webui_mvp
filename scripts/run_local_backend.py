"""Small local backend launcher for development smoke checks."""
from __future__ import annotations
import subprocess
import sys

if __name__ == "__main__":
    raise SystemExit(subprocess.call([sys.executable, "-m", "uvicorn", "ivfitter.api.main:app", "--host", "127.0.0.1", "--port", "8000"]))
