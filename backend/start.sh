#!/bin/bash
PORT="${PORT:-8000}"
cd "$(dirname "$0")"
/opt/miniconda3/bin/uvicorn main:app --host 0.0.0.0 --port "$PORT"
