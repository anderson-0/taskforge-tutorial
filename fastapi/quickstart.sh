#!/usr/bin/env bash

set -euo pipefail

script_directory="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$script_directory"

python_command="${PYTHON_COMMAND:-python3}"
"$python_command" -c 'import sys; sys.exit("Python 3.12 or newer is required") if sys.version_info < (3, 12) else None'

if [[ ! -x .venv/bin/python ]]; then
    "$python_command" -m venv .venv
fi

.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python -m pip install --no-build-isolation --no-deps -e .

if [[ ! -f .env ]]; then
    cp .env.example .env
fi

.venv/bin/python -m alembic upgrade head
.venv/bin/python -m app.seed

echo "TaskForge setup complete."
echo "Start the API with: .venv/bin/python -m uvicorn app.main:app --reload"
echo "OpenAPI documentation: http://localhost:8000/docs"
