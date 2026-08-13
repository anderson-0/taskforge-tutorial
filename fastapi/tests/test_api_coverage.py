import jwt
import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.config import settings
from app.models.user import User, UserRole
from app.utils.security import get_current_user, get_password_hash


class IdentifiedResponse(dict[str, object]):
    @property
    def id(self) -> int:
        return int(self["id"])


def create_project(
    client: TestClient,
    headers: dict[str, str],
    name: str = "Project",
) -> IdentifiedResponse:
    response = client.post("/api/projects", json={"name": name}, headers=headers)
    assert response.status_code == 201
    return IdentifiedResponse(response.json())


def create_task(
    client: TestClient,
    headers: dict[str, str],
    project_id: int,
    title: str = "Task",
) -> IdentifiedResponse:
    response = client.post(
        "/api/tasks",
        json={"title": title, "project_id": project_id},
        headers=headers,
    )
    assert response.status_code == 201
    return IdentifiedResponse(response.json())


def add_user(db: Session, email: str) -> User:
    user = User(
        email=email,
        name="Other User",
        role=UserRole.MEMBER,
        password_hash=get_password_hash("testpass123"),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def login_headers(client: TestClient, email: str) -> dict[str, str]:
    response = client.post(
        "/api/auth/login",
        json={"email": email, "password": "testpass123"},
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_root_and_health_routes(client: TestClient) -> None:
    assert client.get("/").json() == {"message": "TaskForge API", "docs": "/docs"}
    assert client.get("/health").json() == {"status": "healthy"}


def test_duplicate_registration_is_rejected(client: TestClient, test_user: User) -> None:
    response = client.post(
        "/api/auth/register",
        json={"email": test_user.email, "name": "Duplicate", "password": "password123"},
    )

    assert response.status_code == 400
    assert response.json() == {"detail": "Email already registered"}


@pytest.mark.parametrize(
    ("email", "password"),
    [("missing@example.com", "testpass123"), ("test@example.com", "wrong-password")],
)
def test_invalid_login_is_rejected(
    client: TestClient,
    test_user: User,
    email: str,
    password: str,
) -> None:
    response = client.post("/api/auth/login", json={"email": email, "password": password})

    assert response.status_code == 401
    assert response.json() == {"detail": "Incorrect email or password"}


def test_missing_project_and_task_return_not_found(
    client: TestClient,
    auth_headers: dict[str, str],
) -> None:
    assert client.get("/api/projects/999999", headers=auth_headers).status_code == 404
    assert client.get("/api/tasks/999999", headers=auth_headers).status_code == 404


def test_project_labels_and_task_comments(
    client: TestClient,
    auth_headers: dict[str, str],
) -> None:
    project = create_project(client, auth_headers)
    label_response = client.post(
        f"/api/projects/{project.id}/labels",
        json={"name": "Feature", "color": "#123456"},
        headers=auth_headers,
    )
    task = create_task(client, auth_headers, project.id)
    comment_response = client.post(
        f"/api/tasks/{task.id}/comments",
        json={"content": "First comment"},
        headers=auth_headers,
    )

    assert label_response.status_code == 201
    assert (
        client.get(f"/api/projects/{project.id}/labels", headers=auth_headers).json()[0]["name"]
        == "Feature"
    )
    assert comment_response.status_code == 201
    comments = client.get(f"/api/tasks/{task.id}/comments", headers=auth_headers)
    assert comments.status_code == 200
    assert comments.json()[0]["content"] == "First comment"


def test_comment_access_failures(
    client: TestClient, db: Session, auth_headers: dict[str, str]
) -> None:
    project = create_project(client, auth_headers)
    task = create_task(client, auth_headers, project.id)
    add_user(db, "other-comments@example.com")
    other_headers = login_headers(client, "other-comments@example.com")

    assert client.get("/api/tasks/999999/comments", headers=auth_headers).status_code == 404
    denied = client.post(
        f"/api/tasks/{task.id}/comments",
        json={"content": "Denied"},
        headers=other_headers,
    )
    assert denied.status_code == 403


def test_task_read_update_and_delete(
    client: TestClient,
    db: Session,
    auth_headers: dict[str, str],
) -> None:
    project = create_project(client, auth_headers)
    assignee = add_user(db, "assignee@example.com")
    task = create_task(client, auth_headers, project.id)

    assert client.get(f"/api/tasks/{task.id}", headers=auth_headers).status_code == 200
    updated = client.put(
        f"/api/tasks/{task.id}",
        json={"title": "Updated", "assignee_id": assignee.id},
        headers=auth_headers,
    )
    assert updated.status_code == 200
    assert updated.json()["title"] == "Updated"
    assert updated.json()["assignee_id"] == assignee.id
    title_only = client.put(
        f"/api/tasks/{task.id}",
        json={"title": "Title only"},
        headers=auth_headers,
    )
    assert title_only.status_code == 200
    assert title_only.json()["title"] == "Title only"
    assert client.delete(f"/api/tasks/{task.id}", headers=auth_headers).status_code == 204


def test_task_project_access_failures(
    client: TestClient,
    db: Session,
    auth_headers: dict[str, str],
) -> None:
    missing = client.post(
        "/api/tasks",
        json={"title": "Missing project", "project_id": 999999},
        headers=auth_headers,
    )
    add_user(db, "other-project@example.com")
    other_headers = login_headers(client, "other-project@example.com")
    private_project = create_project(client, other_headers, "Private")
    forbidden = client.post(
        "/api/tasks",
        json={"title": "Forbidden", "project_id": private_project.id},
        headers=auth_headers,
    )

    assert missing.status_code == 403
    assert forbidden.status_code == 403


@pytest.mark.parametrize(
    "credentials",
    [None, HTTPAuthorizationCredentials(scheme="Basic", credentials="token")],
)
def test_current_user_requires_bearer_credentials(
    credentials: HTTPAuthorizationCredentials | None,
    db: Session,
) -> None:
    with pytest.raises(HTTPException) as caught:
        get_current_user(credentials, db)

    assert caught.value.status_code == 401


@pytest.mark.parametrize(
    "token",
    [
        "not-a-jwt",
        jwt.encode({}, settings.SECRET_KEY, algorithm=settings.ALGORITHM),
        jwt.encode({"sub": "not-an-integer"}, settings.SECRET_KEY, algorithm=settings.ALGORITHM),
        jwt.encode({"sub": "999999"}, settings.SECRET_KEY, algorithm=settings.ALGORITHM),
    ],
)
def test_current_user_rejects_invalid_token_subjects(token: str, db: Session) -> None:
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

    with pytest.raises(HTTPException) as caught:
        get_current_user(credentials, db)

    assert caught.value.status_code == 401
