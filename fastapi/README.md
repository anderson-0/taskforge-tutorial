# TaskForge — FastAPI track

A project management teaching API built with FastAPI, SQLAlchemy, and SQLite.

## Features

- User authentication with JWT tokens
- Project management (CRUD operations)
- Task management with status and priority
- Comments on tasks
- Project-scoped label creation and seeded task-label associations
- Owner-scoped access; VIEWER users cannot create projects
- RESTful API design
- Auto-generated OpenAPI documentation

## Tech Stack

- **FastAPI** - Modern Python web framework
- **SQLAlchemy 2.0** - ORM for database operations
- **Alembic** - Database migrations
- **SQLite** - Lightweight database
- **Pydantic v2** - Data validation and settings
- **PyJWT** - JWT token handling
- **pwdlib with Argon2** - Password hashing
- **pytest** - Testing framework

## Setup

### Prerequisites

- Python 3.12+
- pip

### Installation

1. Create and activate a virtual environment:

```bash
python -m venv .venv
source .venv/bin/activate  # Windows PowerShell: .venv\Scripts\Activate.ps1
```

2. Install the locked dependencies and local package:

```bash
pip install -r requirements.txt
pip install --no-build-isolation --no-deps -e .
```

`requirements.txt` installs the exact, hashed versions in `requirements.lock`.
The second command installs the local package without re-resolving dependencies
or creating a separate build environment; its pinned build backend is already
in the lock. Update the lock deliberately rather than during setup:

```bash
uv lock --python 3.12
uv export --locked --extra dev --no-emit-project \
  --format requirements.txt --output-file requirements.lock
```

3. Create a `.env` file (copy from `.env.example`):

```bash
cp .env.example .env
```

`SECRET_KEY` is required. The example value is for local tutorials only; use a
random secret of at least 32 characters anywhere else.

Alternatively, run the fail-fast setup script from this directory:

```bash
./quickstart.sh
```

### Database Setup

Run database migrations:

```bash
alembic upgrade head
```

### Seed Data

Populate the database with sample data:

```bash
python -m app.seed
```

The seed is transactional and idempotent. It requires the Alembic migration
above and skips a database that already contains users. To recreate the exact
tutorial dataset, run `make reset-db`.

Sample credentials:
- `admin@taskforge.com` / `admin123` (ADMIN)
- `alice@taskforge.com` / `alice123` (MEMBER)
- `bob@taskforge.com` / `bob123` (MEMBER)
- `viewer@taskforge.com` / `viewer123` (VIEWER)

## Running the Application

Start the development server:

```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`

## API Documentation

Once the server is running, visit:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user info

### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create a new project
- `GET /api/projects/{id}` - Get project details
- `PUT /api/projects/{id}` - Update a project
- `DELETE /api/projects/{id}` - Delete a project
- `GET /api/projects/{id}/labels` - Get project labels
- `POST /api/projects/{id}/labels` - Create a label

### Tasks
- `GET /api/tasks` - List all tasks (filter by `?project_id=X`)
- `POST /api/tasks` - Create a new task
- `GET /api/tasks/{id}` - Get task details
- `PUT /api/tasks/{id}` - Update a task
- `DELETE /api/tasks/{id}` - Delete a task

### Comments
- `GET /api/tasks/{id}/comments` - Get task comments
- `POST /api/tasks/{id}/comments` - Add a comment to a task

## Testing

Run the test suite (the test configuration supplies a test-only `SECRET_KEY`):

```bash
pytest
```

Run with coverage:

```bash
pytest --cov=app --cov-report=html
```

Run every publication check:

```bash
make verify
```

This runs Ruff, mypy, pytest with branch coverage, and the Python dependency
audit. Coverage is enforced at 99.9% and the current suite covers all measured
statements and branches. The repository CI uses the same test-only secret;
production and normal development still require `SECRET_KEY` in the
environment or `.env`.

## Project Structure

```
fastapi/
├── app/
│   ├── models/          # SQLAlchemy models
│   ├── schemas/         # Pydantic schemas
│   ├── routers/         # API route handlers
│   ├── services/        # Business logic layer
│   ├── utils/           # Utility functions (auth, exceptions)
│   ├── config.py        # Application configuration
│   ├── database.py      # Database setup
│   ├── main.py          # FastAPI application
│   └── seed.py          # Database seeding script
├── alembic/             # Database migrations
├── tests/               # Test suite
├── pyproject.toml       # Project dependencies
├── alembic.ini          # Alembic configuration
└── .env.example         # Environment variables template
```

## Development Notes

This project intentionally retains a few safe imperfections for teaching purposes:

1. **Inconsistent error handling** - Some routes use service layer, others have inline logic
2. **Mixed SQLAlchemy query styles** - Both legacy `query()` and modern `select()` appear
3. **Sparse documentation** - Some functions lack comprehensive docstrings
4. **Limited product scope** - Pagination, project membership, and richer role
   workflows are future exercises

These are intentional to provide learning opportunities for code improvement.

## License

MIT. See the repository-level `LICENSE` file.
