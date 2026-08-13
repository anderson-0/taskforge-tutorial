#!/usr/bin/env bash
set -euo pipefail

required_node_major=22
node_major="$(node --version | sed -E 's/^v([0-9]+).*/\1/')"

if (( node_major < required_node_major )); then
  echo "TaskForge requires Node.js ${required_node_major} or newer." >&2
  exit 1
fi

if [[ ! -f .env ]]; then
  cp .env.example .env
fi

npm ci
npm run db:migrate
npm run seed
npm run verify

echo "TaskForge Next.js setup is verified."
