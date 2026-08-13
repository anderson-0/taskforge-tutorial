import os
import sqlite3
import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
TEST_SECRET = "test-only-taskforge-secret-key-never-use-in-production"


def environment_for(database_path: Path) -> dict[str, str]:
    return {
        **os.environ,
        "DATABASE_URL": f"sqlite:///{database_path}",
        "SECRET_KEY": TEST_SECRET,
    }


def run_module(
    module: str,
    *arguments: str,
    environment: dict[str, str],
) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-m", module, *arguments],
        cwd=PROJECT_ROOT,
        env=environment,
        check=False,
        capture_output=True,
        text=True,
    )


def test_seed_requires_migrated_database(tmp_path: Path) -> None:
    result = run_module("app.seed", environment=environment_for(tmp_path / "unmigrated.db"))

    assert result.returncode != 0
    assert "alembic upgrade head" in result.stderr


def test_seed_is_idempotent_after_migration(tmp_path: Path) -> None:
    database_path = tmp_path / "seeded.db"
    environment = environment_for(database_path)
    migration = run_module("alembic", "upgrade", "head", environment=environment)
    assert migration.returncode == 0, migration.stderr

    first_seed = run_module("app.seed", environment=environment)
    second_seed = run_module("app.seed", environment=environment)

    assert first_seed.returncode == 0, first_seed.stderr
    assert second_seed.returncode == 0, second_seed.stderr
    with sqlite3.connect(database_path) as connection:
        counts = {
            table: connection.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
            for table in ("users", "projects", "labels", "tasks", "comments", "task_labels")
        }
    assert counts == {
        "users": 4,
        "projects": 4,
        "labels": 5,
        "tasks": 7,
        "comments": 5,
        "task_labels": 4,
    }
