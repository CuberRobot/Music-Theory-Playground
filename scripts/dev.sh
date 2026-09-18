#!/usr/bin/env bash
# Music Theory Playground 本地预览：零依赖静态服务器
set -euo pipefail
MTP_PORT="${MTP_PORT:-5173}"
cd "$(dirname "$0")/.."
echo "Music Theory Playground → http://localhost:${MTP_PORT}"
exec python3 -m http.server "${MTP_PORT}"
