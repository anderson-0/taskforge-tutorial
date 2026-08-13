# TaskForge tutorial starter

TaskForge is the cumulative practice project for the
[Claude Code tutorial series](https://github.com/anderson-0/claude-code-tutorials).
It provides two independent starter applications built around the same project
management domain.

## Start your own course repository

Forking is recommended because later tutorials use branches, pull requests,
issues, and CI, and therefore need a writable GitHub remote:

```bash
gh repo fork anderson-0/taskforge-tutorial --clone
cd taskforge-tutorial
```

You can also create a fresh repository from the GitHub template, or clone this
repository directly if you only want to inspect it:

```bash
git clone https://github.com/anderson-0/taskforge-tutorial.git
cd taskforge-tutorial
```

A repository generated from the template starts with its own initial commit,
so it does not inherit the source repository's checkpoint tag. Its generated
`main` branch contains the equivalent starter files.

## Choose one track

| Track | What it contains | Directory |
| --- | --- | --- |
| Next.js | Full-stack web application using Next.js, TypeScript, Prisma, SQLite, and Tailwind CSS | `nextjs/` |
| FastAPI | Backend API using Python, FastAPI, SQLAlchemy, Alembic, SQLite, and Pydantic | `fastapi/` |

The tracks share the User, Project, Task, Comment, and Label domain concepts.
They are intentionally independent and do not have identical user interfaces
or route surfaces. Each track README is the source of truth for its commands,
credentials, and endpoints.

## Next.js quick start

Prerequisite: Node.js 24.x.

```bash
cd nextjs
cp .env.example .env
npm ci
npm run db:setup
npm run dev
```

Open <http://localhost:3000> and sign in with one of these development-only
accounts:

| Email | Password | Role |
| --- | --- | --- |
| `alice@example.com` | `password123` | Admin |
| `bob@example.com` | `password123` | Member |
| `charlie@example.com` | `password123` | Read-only viewer |

Run the complete local verification suite with `npm run verify`.

## FastAPI quick start

Prerequisite: Python 3.12 or newer.

```bash
cd fastapi
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install --no-build-isolation --no-deps -e .
cp .env.example .env
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload
```

On Windows PowerShell, activate the environment with
`.venv\Scripts\Activate.ps1`. Open <http://localhost:8000/docs> for the API
documentation.

| Email | Password | Role |
| --- | --- | --- |
| `admin@taskforge.com` | `admin123` | Admin |
| `alice@taskforge.com` | `alice123` | Member |
| `bob@taskforge.com` | `bob123` | Member |
| `viewer@taskforge.com` | `viewer123` | Viewer |

Verify the track with:

```bash
make verify
```

## Course baseline

The starter is deliberately small enough to explore while remaining runnable
and testable. Tutorials add project instructions, task records, documentation,
features, refactors, automation, agents, and plugins over time.

In a fork or clone, the `course-v1/starter` tag identifies the reproducible
course baseline. If an exercise goes off track, preserve any work you need and
create a clean branch from that tag:

```bash
git switch -c tutorial-restart course-v1/starter
```

## Repository layout

```text
taskforge-tutorial/
├── .github/workflows/ci.yml
├── fastapi/
├── nextjs/
├── AGENTS.md
├── CLAUDE.md
├── LICENSE
└── README.md
```

The root `CLAUDE.md` is intentionally concise. Tutorial 2 teaches you how to
verify and expand project instructions without filling context with details
that Claude can derive from the repository.

## Security

The sample accounts, SQLite databases, and example secrets are for local
learning only. Do not deploy them or reuse their credentials. Local `.env`
files and databases are ignored by Git.

## License

MIT. See [LICENSE](LICENSE).
