#!/usr/bin/env bash
# Rebuild everything from scratch. Each step exits non-zero if its checks fail.
set -euo pipefail
cd "$(dirname "$0")/.."
uv run python pipeline/01_download.py
uv run python pipeline/02_extract.py
uv run python analysis/indicators.py
