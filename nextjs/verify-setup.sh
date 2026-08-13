#!/usr/bin/env bash
set -euo pipefail

node scripts/check-node-version.js

if [[ ! -f .env ]]; then
  cp .env.example .env
fi

npm ci
npm run db:migrate
npm run seed
npm run verify

echo "TaskForge Next.js setup is verified."
