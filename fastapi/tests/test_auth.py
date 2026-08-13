import warnings

import pytest
from pydantic import ValidationError

from app.config import Settings


def test_register_user(client):
    """Test user registration"""
    response = client.post(
        "/api/auth/register",
        json={
            "email": "newuser@example.com",
            "name": "New User",
            "password": "securepass123",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "newuser@example.com"
    assert data["name"] == "New User"
    assert "id" in data
    assert "password" not in data


def test_registration_rejects_role_escalation(client):
    response = client.post(
        "/api/auth/register",
        json={
            "email": "attacker@example.com",
            "name": "Attacker",
            "password": "securepass123",
            "role": "ADMIN",
        },
    )

    assert response.status_code == 422


def test_openapi_describes_json_bearer_auth(client):
    schema = client.get("/openapi.json").json()

    assert schema["components"]["securitySchemes"] == {
        "HTTPBearer": {"type": "http", "scheme": "bearer", "bearerFormat": "JWT"}
    }
    assert list(schema["paths"]["/api/auth/login"]["post"]["requestBody"]["content"]) == [
        "application/json"
    ]


def test_secret_key_is_required(monkeypatch):
    monkeypatch.delenv("SECRET_KEY", raising=False)

    with pytest.raises(ValidationError):
        Settings(_env_file=None)


def test_creating_user_does_not_use_deprecated_utcnow(client):
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        response = client.post(
            "/api/auth/register",
            json={
                "email": "time-safe@example.com",
                "name": "Time Safe",
                "password": "securepass123",
            },
        )

    assert response.status_code == 200
    assert not [warning for warning in caught if "utcnow" in str(warning.message)]


def test_login(client, test_user):
    """Test user login"""
    response = client.post(
        "/api/auth/login", json={"email": "test@example.com", "password": "testpass123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert "user" in data
    assert data["user"]["email"] == "test@example.com"


def test_get_current_user(client, auth_headers):
    """Test getting current user info"""
    response = client.get("/api/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"


# Intentional gap: Missing test for duplicate email registration
# Intentional gap: Missing test for invalid login credentials
