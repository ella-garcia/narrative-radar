#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$HERE"
exec "$HERE/.venv/bin/python" -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --log-level warning
