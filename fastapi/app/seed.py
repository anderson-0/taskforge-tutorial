"""Populate a migrated TaskForge database with deterministic sample data."""

import logging

from sqlalchemy import select
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.comment import Comment
from app.models.label import Label, TaskLabel
from app.models.project import Project, ProjectStatus
from app.models.task import Task, TaskPriority, TaskStatus
from app.models.user import User, UserRole
from app.utils.security import get_password_hash

logger = logging.getLogger(__name__)


def create_users(session: Session) -> dict[str, User]:
    users = {
        "admin": User(
            email="admin@taskforge.com",
            name="Admin User",
            role=UserRole.ADMIN,
            password_hash=get_password_hash("admin123"),
        ),
        "alice": User(
            email="alice@taskforge.com",
            name="Alice Smith",
            role=UserRole.MEMBER,
            password_hash=get_password_hash("alice123"),
        ),
        "bob": User(
            email="bob@taskforge.com",
            name="Bob Johnson",
            role=UserRole.MEMBER,
            password_hash=get_password_hash("bob123"),
        ),
        "viewer": User(
            email="viewer@taskforge.com",
            name="Viewer User",
            role=UserRole.VIEWER,
            password_hash=get_password_hash("viewer123"),
        ),
    }
    session.add_all(users.values())
    session.flush()
    return users


def create_projects(session: Session, users: dict[str, User]) -> dict[str, Project]:
    projects = {
        "website": Project(
            name="Website Redesign",
            description="Redesign the company website with modern UI/UX",
            status=ProjectStatus.ACTIVE,
            owner_id=users["admin"].id,
        ),
        "mobile": Project(
            name="Mobile App",
            description="Develop a mobile app for iOS and Android",
            status=ProjectStatus.ACTIVE,
            owner_id=users["admin"].id,
        ),
        "internal": Project(
            name="Internal Tools",
            description="Build internal productivity tools",
            status=ProjectStatus.ACTIVE,
            owner_id=users["alice"].id,
        ),
        "legacy": Project(
            name="Legacy Migration",
            description="Migrate legacy systems to new infrastructure",
            status=ProjectStatus.ARCHIVED,
            owner_id=users["admin"].id,
        ),
    }
    session.add_all(projects.values())
    session.flush()
    return projects


def create_labels(session: Session, projects: dict[str, Project]) -> dict[str, Label]:
    labels = {
        "bug": Label(name="Bug", color="#FF0000", project_id=projects["website"].id),
        "feature": Label(name="Feature", color="#00FF00", project_id=projects["website"].id),
        "urgent": Label(name="Urgent", color="#FF6600", project_id=projects["website"].id),
        "backend": Label(name="Backend", color="#0000FF", project_id=projects["mobile"].id),
        "frontend": Label(name="Frontend", color="#00FFFF", project_id=projects["mobile"].id),
    }
    session.add_all(labels.values())
    session.flush()
    return labels


def create_tasks(
    session: Session,
    users: dict[str, User],
    projects: dict[str, Project],
) -> dict[str, Task]:
    task_data = [
        ("mockup", "Design homepage mockup", "Create mockups for the new homepage design", TaskStatus.DONE, TaskPriority.HIGH, "website", "alice"),
        ("navigation", "Implement responsive navigation", "Build a mobile-friendly navigation menu", TaskStatus.IN_PROGRESS, TaskPriority.MEDIUM, "website", "bob"),
        ("header", "Fix header alignment issue", "Header is misaligned on mobile devices", TaskStatus.TODO, TaskPriority.URGENT, "website", "bob"),
        ("structure", "Setup project structure", "Initialize React Native project with proper architecture", TaskStatus.DONE, TaskPriority.HIGH, "mobile", "admin"),
        ("authentication", "Implement authentication", "Add user authentication with JWT", TaskStatus.IN_PROGRESS, TaskPriority.HIGH, "mobile", "alice"),
        ("icon", "Design app icon", "Create app icon for iOS and Android", TaskStatus.TODO, TaskPriority.LOW, "mobile", None),
        ("dashboard", "Build reporting dashboard", "Create dashboard for team metrics", TaskStatus.IN_PROGRESS, TaskPriority.MEDIUM, "internal", "alice"),
    ]
    tasks = {
        key: Task(
            title=title,
            description=description,
            status=status,
            priority=priority,
            project_id=projects[project].id,
            assignee_id=users[assignee].id if assignee else None,
        )
        for key, title, description, status, priority, project, assignee in task_data
    }
    session.add_all(tasks.values())
    session.flush()
    return tasks


def connect_labels(session: Session, tasks: dict[str, Task], labels: dict[str, Label]) -> None:
    session.execute(
        TaskLabel.insert(),
        [
            {"task_id": tasks["header"].id, "label_id": labels["bug"].id},
            {"task_id": tasks["header"].id, "label_id": labels["urgent"].id},
            {"task_id": tasks["mockup"].id, "label_id": labels["feature"].id},
            {"task_id": tasks["authentication"].id, "label_id": labels["backend"].id},
        ],
    )


def create_comments(session: Session, tasks: dict[str, Task], users: dict[str, User]) -> None:
    comment_data = [
        ("Great work on the mockups! The design looks modern and clean.", "mockup", "admin"),
        ("I'm working on this now. Should be done by end of day.", "navigation", "bob"),
        ("This is blocking the mobile release. Please prioritize.", "header", "admin"),
        ("I've investigated the issue. It's related to CSS flexbox.", "header", "bob"),
        ("Authentication flow is working. Now adding refresh token logic.", "authentication", "alice"),
    ]
    session.add_all(
        Comment(content=content, task_id=tasks[task].id, author_id=users[author].id)
        for content, task, author in comment_data
    )


def seed_database() -> bool:
    try:
        with SessionLocal.begin() as session:
            if session.scalar(select(User.id).limit(1)) is not None:
                logger.info("Database already contains users; seed skipped.")
                return False
            users = create_users(session)
            projects = create_projects(session, users)
            labels = create_labels(session, projects)
            tasks = create_tasks(session, users, projects)
            connect_labels(session, tasks, labels)
            create_comments(session, tasks, users)
    except OperationalError as error:
        raise RuntimeError("Database is not migrated; run `alembic upgrade head` first.") from error

    logger.info("Database seeded with TaskForge sample data.")
    return True


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    seed_database()


if __name__ == "__main__":
    main()
