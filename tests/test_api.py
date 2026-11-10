"""Tests básicos de la API."""

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.main import app
from app.db.session import get_session


@pytest.fixture(name="session")
def session_fixture():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


@pytest.fixture(name="client")
def client_fixture(session: Session):
    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


def test_health(client: TestClient):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_root(client: TestClient):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["name"] == "Pulse OS"


def test_crear_comunidad(client: TestClient):
    response = client.post("/api/comunidades", json={"nombre": "Test", "tematica": "Testing"})
    assert response.status_code == 201
    data = response.json()
    assert data["nombre"] == "Test"
    assert "id" in data


def test_listar_comunidades(client: TestClient):
    client.post("/api/comunidades", json={"nombre": "Test1"})
    client.post("/api/comunidades", json={"nombre": "Test2"})
    response = client.get("/api/comunidades")
    assert response.status_code == 200
    assert len(response.json()) == 2


def test_crear_personaje(client: TestClient):
    com = client.post("/api/comunidades", json={"nombre": "Com"}).json()
    response = client.post("/api/personajes", json={
        "nombre": "Luna",
        "comunidad_id": com["id"],
        "nivel_actividad": 9,
    })
    assert response.status_code == 201
    assert response.json()["nombre"] == "Luna"


def test_crud_proveedor_llm(client: TestClient):
    # Create
    r = client.post("/api/llm/proveedores", json={
        "nombre": "Test Provider",
        "tipo_api": "openai_compatible",
        "base_url": "http://localhost:11434/v1",
        "activo": True,
        "prioridad": 10,
    })
    assert r.status_code == 201
    pid = r.json()["id"]

    # Read
    r = client.get(f"/api/llm/proveedores/{pid}")
    assert r.status_code == 200
    assert r.json()["nombre"] == "Test Provider"

    # Update
    r = client.patch(f"/api/llm/proveedores/{pid}", json={"nombre": "Updated"})
    assert r.status_code == 200
    assert r.json()["nombre"] == "Updated"

    # Delete
    r = client.delete(f"/api/llm/proveedores/{pid}")
    assert r.status_code == 204


def test_memoria(client: TestClient):
    r = client.post("/api/memoria", json={
        "scope": "individual",
        "owner": "Luna",
        "summary": "Test memory entry",
    })
    assert r.status_code == 201

    r = client.get("/api/memoria")
    assert r.status_code == 200
    assert len(r.json()) == 1

    r = client.get("/api/memoria/buscar?q=Test")
    assert r.status_code == 200
    assert len(r.json()) == 1


def test_tareas(client: TestClient):
    r = client.post("/api/tareas", json={"tipo": "test_task", "prioridad": 5})
    assert r.status_code == 201
    tid = r.json()["id"]

    r = client.patch(f"/api/tareas/{tid}", json={"estado": "en_ejecucion"})
    assert r.status_code == 200
    assert r.json()["estado"] == "en_ejecucion"

    r = client.get("/api/tareas/estadisticas/resumen")
    assert r.status_code == 200
    assert r.json()["total"] == 1


def test_auth_register_and_login(client: TestClient):
    # Register
    r = client.post("/api/auth/register", json={
        "username": "admin",
        "password": "secret123",
        "is_admin": True,
    })
    assert r.status_code == 201

    # Login
    r = client.post("/api/auth/login", data={"username": "admin", "password": "secret123"})
    assert r.status_code == 200
    token = r.json()["access_token"]
    assert token

    # Me
    r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["username"] == "admin"


def test_facebook_cuenta(client: TestClient):
    r = client.post("/api/facebook/cuentas", json={
        "nombre_identificador": "test_fb",
        "email_o_usuario": "test@test.com",
        "password": "pass123",
    })
    assert r.status_code == 201
    assert r.json()["estado_conexion"] == "desconectado"
