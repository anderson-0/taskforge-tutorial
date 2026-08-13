from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.comment import Comment
from app.models.label import Label
from app.models.task import Task
from app.models.user import User, UserRole
from app.utils.security import get_password_hash


def create_user(db: Session, *, email: str, role: UserRole) -> User:
    user = User(
        email=email,
        name=email.split("@", maxsplit=1)[0].title(),
        role=role,
        password_hash=get_password_hash("testpass123"),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def login_headers(client: TestClient, *, email: str) -> dict[str, str]:
    response = client.post(
        "/api/auth/login",
        json={"email": email, "password": "testpass123"},
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_viewer_cannot_create_project(client: TestClient, db: Session) -> None:
    create_user(db, email="viewer@example.com", role=UserRole.VIEWER)
    headers = login_headers(client, email="viewer@example.com")

    response = client.post("/api/projects", json={"name": "Forbidden"}, headers=headers)

    assert response.status_code == 403
    assert response.json() == {"detail": "Viewers cannot create projects"}


def test_user_cannot_create_label_for_another_users_project(
    client: TestClient,
    db: Session,
    auth_headers: dict[str, str],
) -> None:
    project = client.post(
        "/api/projects",
        json={"name": "Private project"},
        headers=auth_headers,
    ).json()
    create_user(db, email="other@example.com", role=UserRole.MEMBER)
    other_headers = login_headers(client, email="other@example.com")

    response = client.post(
        f"/api/projects/{project['id']}/labels",
        json={"name": "Unauthorized", "color": "#123456"},
        headers=other_headers,
    )

    assert response.status_code == 403
    assert response.json() == {"detail": "Access denied"}


def test_task_creation_rejects_unknown_assignee(
    client: TestClient,
    auth_headers: dict[str, str],
) -> None:
    project = client.post(
        "/api/projects",
        json={"name": "Assignee validation"},
        headers=auth_headers,
    ).json()

    response = client.post(
        "/api/tasks",
        json={"title": "Invalid assignee", "project_id": project["id"], "assignee_id": 999_999},
        headers=auth_headers,
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Assignee not found"}


def test_task_update_rejects_unknown_assignee(
    client: TestClient,
    auth_headers: dict[str, str],
) -> None:
    project = client.post(
        "/api/projects",
        json={"name": "Assignee update validation"},
        headers=auth_headers,
    ).json()
    task = client.post(
        "/api/tasks",
        json={"title": "Existing task", "project_id": project["id"]},
        headers=auth_headers,
    ).json()

    response = client.put(
        f"/api/tasks/{task['id']}",
        json={"assignee_id": 999_999},
        headers=auth_headers,
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Assignee not found"}


def test_project_deletion_cascades_to_tasks_comments_and_labels(
    client: TestClient,
    db: Session,
    auth_headers: dict[str, str],
) -> None:
    project = client.post(
        "/api/projects",
        json={"name": "Cascade project"},
        headers=auth_headers,
    ).json()
    client.post(
        f"/api/projects/{project['id']}/labels",
        json={"name": "Cascade", "color": "#123456"},
        headers=auth_headers,
    )
    task = client.post(
        "/api/tasks",
        json={"title": "Cascade task", "project_id": project["id"]},
        headers=auth_headers,
    ).json()
    client.post(
        f"/api/tasks/{task['id']}/comments",
        json={"content": "Cascade comment"},
        headers=auth_headers,
    )

    response = client.delete(f"/api/projects/{project['id']}", headers=auth_headers)

    assert response.status_code == 204
    db.expire_all()
    assert db.query(Task).count() == 0
    assert db.query(Comment).count() == 0
    assert db.query(Label).count() == 0
