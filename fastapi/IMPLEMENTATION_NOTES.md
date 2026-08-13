# TaskForge FastAPI - Implementation Notes

## Overview

This is the teaching-oriented FastAPI implementation of the TaskForge project
management domain. It provides a RESTful API with authentication, project
management, task tracking, comments, and labels.

## Architecture

### Models (SQLAlchemy 2.0)

All models use the new SQLAlchemy 2.0 `Mapped` type annotations for better type checking.

#### User Model
- Fields: id, email, password_hash, name, role, created_at, updated_at
- Roles: ADMIN, MEMBER, VIEWER
- Relationships: owned_projects, assigned_tasks, comments

#### Project Model
- Fields: id, name, description, status, owner_id, created_at, updated_at
- Status: ACTIVE, ARCHIVED
- Relationships: owner, tasks, labels

#### Task Model
- Fields: id, title, description, status, priority, project_id, assignee_id, created_at, updated_at
- Status: TODO, IN_PROGRESS, DONE
- Priority: LOW, MEDIUM, HIGH, URGENT
- Relationships: project, assignee, comments, labels (many-to-many)

#### Comment Model
- Fields: id, content, task_id, author_id, created_at, updated_at
- Relationships: task, author

#### Label Model
- Fields: id, name, color, project_id
- Relationships: project, tasks (many-to-many)
- Association table: TaskLabel

### Schemas (Pydantic v2)

All schemas use Pydantic v2 with `model_config` for configuration:
- Base schemas for shared fields
- Create schemas for POST requests
- Update schemas with optional fields
- Response schemas with `from_attributes=True` for ORM conversion

### Authentication

- JWT tokens using PyJWT
- Argon2 password hashing using pwdlib
- JSON login requests with HTTP bearer authentication for protected routes
- Token expiration configurable via settings
- Current user dependency injection
- Public registration always creates a MEMBER; clients cannot choose a role

### API Structure

#### Authentication Router (`/api/auth`)
- POST `/register` - User registration
- POST `/login` - Login with JWT token
- GET `/me` - Get current user info

#### Projects Router (`/api/projects`)
- GET `/api/projects` - List user's projects
- POST `/api/projects` - Create project
- GET `/api/projects/{id}` - Get project details
- PUT `/api/projects/{id}` - Update project
- DELETE `/api/projects/{id}` - Delete project
- GET `/api/projects/{id}/labels` - Get project labels
- POST `/api/projects/{id}/labels` - Create label

#### Tasks Router (`/api/tasks`)
- GET `/api/tasks` - List tasks (optional `?project_id` filter)
- POST `/api/tasks` - Create task
- GET `/api/tasks/{id}` - Get task details
- PUT `/api/tasks/{id}` - Update task
- DELETE `/api/tasks/{id}` - Delete task

#### Comments Router (`/api/tasks/{id}/comments`)
- GET `/api/tasks/{id}/comments` - Get task comments
- POST `/api/tasks/{id}/comments` - Add comment to task

### Service Layer

The service layer handles business logic and data access:

- `auth_service.py` - User registration, authentication, token generation
- `project_service.py` - Project CRUD operations with ownership checks
- `task_service.py` - Task CRUD operations with project access validation

### Database

- SQLite-specific engine and migrations for a deterministic local course setup
- Alembic for migrations
- Session management with dependency injection
- Automatic table creation via migrations

Moving this track to PostgreSQL or MySQL is an extension exercise, not a
configuration-only switch; it requires adapting the engine configuration,
migrations, dependency lock, and database tests.

### Configuration

Using pydantic-settings for environment-based configuration:
- Database URL
- JWT secret key and algorithm
- Token expiration time
- Debug mode
- CORS origins

## Intentional Imperfections

These were included for teaching purposes:

### 1. Inconsistent Layering
- Projects router uses service layer consistently
- Comments router has mixed inline logic and service calls
- Labels endpoints keep their query logic inline

**Location**: `app/routers/projects.py`
- `get_project_labels` uses an inline query instead of a label service
- Both label endpoints still validate project ownership before querying or writing

### 2. Mixed SQLAlchemy Query Styles
**Location**: `app/routers/comments.py`
- `get_task_comments` uses both ORM query() and scalars(select())
- Inconsistent with rest of codebase that primarily uses query()

### 3. Sparse Documentation
**Location**: Various service functions
- Some functions have comprehensive docstrings
- Others have minimal or no documentation
- Example: `app/services/task_service.py` has good docs, but some router handlers don't

### 4. Deliberately Limited Product Scope
- No pagination or search
- No project membership model beyond project ownership
- No administrator-only role-management endpoint
- No rate limiting or caching layer

The regression suite does cover the publication-critical boundaries: public
role escalation, viewer writes, cross-owner labels, invalid assignees, cascade
deletion, bearer-auth documentation, required secrets, and reproducible seeding.

## Shared Domain Concepts

The FastAPI and Next.js tracks use the same core domain concepts:

| Model | FastAPI | Next.js |
|-------|---------|---------|
| User | ✅ | ✅ |
| Project | ✅ | ✅ |
| Task | ✅ | ✅ |
| Comment | ✅ | ✅ |
| Label | ✅ | ✅ |
| TaskLabel | ✅ | ✅ |

Role, status, and priority values are aligned. The tracks remain independent:
FastAPI uses integer identifiers and snake_case JSON, while Next.js uses string
identifiers and Prisma's camelCase fields.

## JSON Response Format

FastAPI responses use the Pydantic schemas' snake_case field names:

```json
{
  "id": 1,
  "name": "Project Name",
  "description": "Description",
  "status": "ACTIVE",
  "owner_id": 1,
  "created_at": "2024-01-01T00:00:00",
  "updated_at": "2024-01-01T00:00:00"
}
```

Dates are serialized as ISO 8601 strings (handled automatically by Pydantic).

## Testing

The test suite uses:
- pytest for test running
- Starlette TestClient (backed by httpx2) for API testing
- In-memory SQLite for test isolation
- Fixtures for common setup (db, client, auth_headers)

Run `make verify` for linting, strict type checking, branch coverage, and a
dependency vulnerability audit.

## Seed Data

The seed script creates:
- 4 users (admin, 2 members, 1 viewer)
- 4 projects (3 active, 1 archived)
- 7 tasks across projects with various statuses
- 5 comments on tasks
- 5 labels with color codes
- Task-label associations

All passwords are hashed using Argon2.

## Running the Application

### Quick Start
```bash
chmod +x quickstart.sh
./quickstart.sh
```

### Manual Setup
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install --no-build-isolation --no-deps -e .
cp .env.example .env
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload
```

### Using Makefile
```bash
make setup      # Install locked dependencies, migrate, and seed
make migrate    # Run migrations
make seed       # Seed database
make run        # Start server
make test       # Run tests
make test-cov   # Run tests with coverage
make verify     # Run all publication checks
```

## API Documentation

FastAPI auto-generates interactive documentation:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- OpenAPI JSON: http://localhost:8000/openapi.json

## Security Features

- Password hashing with Argon2
- JWT tokens with expiration
- Protected routes using the documented HTTP bearer scheme
- CORS middleware for frontend integration
- SQL injection protection via ORM
- Input validation via Pydantic

## Performance Considerations

- SQLAlchemy engine and session management
- Indexed fields on users.email, primary keys
- Lightweight SQLite for development
- Pagination, query profiling, and a server database remain extension work

## Production Boundary

This repository is not a production deployment guide. Before any real-world
deployment, redesign the tenancy and authorization model, replace the sample
credentials and SQLite setup, configure managed secrets and restrictive CORS,
add rate limiting and audit logging, and establish monitoring, backup, incident
response, and deployment controls.

## Extension Points

Easy areas to extend:
1. Add file attachments to tasks
2. Implement real-time notifications (WebSockets)
3. Add email notifications
4. Implement task dependencies
5. Add time tracking
6. Create API versioning
7. Add search functionality
8. Implement pagination
9. Add audit logging
10. Create admin dashboard endpoints

## Learning Opportunities

Students can improve this codebase by:
1. Fixing inconsistent error handling patterns
2. Standardizing query styles throughout
3. Adding consumer-contract, property, and load tests
4. Adding richer domain rules and validation
5. Adding detailed docstrings
6. Implementing pagination
7. Adding filtering and sorting options
8. Creating more granular permissions
9. Adding rate limiting
10. Implementing caching strategies
