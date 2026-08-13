# TaskForge repository guide

TaskForge is the cumulative practice repository for the Claude Code tutorial
series. It contains two independent implementations of the same project
management domain:

- `nextjs/`: a full-stack Next.js application.
- `fastapi/`: a FastAPI backend with interactive OpenAPI documentation.

## Verification commands

Run commands from the relevant track directory.

### Next.js

```bash
npm ci
cp -n .env.example .env
npm run db:setup
npm run verify
```

### FastAPI

```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install --no-build-isolation --no-deps -e .
make verify
```

## Conventions

- Keep the two tracks independently runnable; never require one to run the other.
- Preserve the public API behavior documented in each track's README.
- Do not commit `.env` files, databases, build outputs, virtual environments, or dependencies.
- Use explicit TypeScript and Python types. Do not introduce TypeScript `any`.
- Use the project logger instead of `console.log`, `console.error`, or `console.warn`.
- Add tests for behavior changes and keep tutorial exercises deterministic.
- Keep files under 500 lines and functions under 50 lines.
- Keep learner-facing paths and commands synchronized with the tutorial repository.
