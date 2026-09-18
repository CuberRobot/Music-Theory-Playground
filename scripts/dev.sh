#!/usr/bin/env bash
# MusicL 本地预览：零依赖静态服务器
set -euo pipefail
MUSICL_PORT="${MUSICL_PORT:-5173}"
cd "$(dirname "$0")/.."
echo "MusicL → http://localhost:${MUSICL_PORT}"
exec python3 -m http.server "${MUSICL_PORT}"
