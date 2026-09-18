#!/usr/bin/env bash
# Music Theory Playground 本地预览：零依赖静态服务器（已禁用缓存）
set -euo pipefail
MTP_PORT="${MTP_PORT:-5173}"
cd "$(dirname "$0")/.."
exec python3 scripts/serve.py "${MTP_PORT}"
