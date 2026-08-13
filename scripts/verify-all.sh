#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

(
  cd "$repository_root/nextjs"
  ./verify-setup.sh
)

(
  cd "$repository_root/fastapi"
  ./quickstart.sh
  export PATH="$PWD/.venv/bin:$PATH"
  make verify
  alembic upgrade head
)
