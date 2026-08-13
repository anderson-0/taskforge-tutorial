from collections.abc import Generator

import pytest
from sqlalchemy.orm import Session

import app.database as database
import app.seed
from app.utils.exceptions import ForbiddenException, NotFoundException, UnauthorizedException


class ClosableSession:
    def __init__(self) -> None:
        self.closed = False

    def close(self) -> None:
        self.closed = True


def test_database_dependency_closes_its_session(monkeypatch: pytest.MonkeyPatch) -> None:
    session = ClosableSession()
    monkeypatch.setattr(database, "SessionLocal", lambda: session)

    dependency: Generator[Session, None, None] = database.get_db()
    assert next(dependency) is session
    dependency.close()

    assert session.closed is True


def test_sqlite_connections_enforce_foreign_keys() -> None:
    connection = database.engine.raw_connection()
    try:
        cursor = connection.cursor()
        cursor.execute("PRAGMA foreign_keys")
        assert cursor.fetchone() == (1,)
        cursor.close()
    finally:
        connection.close()


@pytest.mark.parametrize(
    ("exception_type", "status_code", "detail"),
    [
        (NotFoundException, 404, "Resource not found"),
        (UnauthorizedException, 401, "Unauthorized"),
        (ForbiddenException, 403, "Forbidden"),
    ],
)
def test_domain_exception_defaults(exception_type, status_code: int, detail: str) -> None:
    exception = exception_type()

    assert exception.status_code == status_code
    assert exception.detail == detail


def test_seed_module_is_safe_to_import() -> None:
    assert callable(app.seed.seed_database)
