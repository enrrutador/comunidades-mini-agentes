"""Tests del flujo punta a punta: planificador de rondas, ejecutor y
endpoints de acciones reales (sin navegador: las cuentas de prueba no
están conectadas, así que el resultado honesto es tarea FALLIDA con
error claro — nunca un «en_cola» de mentira)."""

import random
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine, select
from sqlmodel.pool import StaticPool

from app.db.models import (
    Comunidad,
    Pagina,
    Personaje,
    PersonajeEstado,
    Tarea,
)
from app.db.session import get_session
from app.main import app
from app.services.orchestration.ronda import _elegir_reaccion, planificar_ronda


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


def _personaje_falso(nombre: str, actividad: int = 5, firma: str = "love"):
    return SimpleNamespace(
        id=f"id-{nombre}",
        nombre=nombre,
        nivel_actividad=actividad,
        personalidad={"nivel_actividad": actividad, "reaccion_firma": firma},
    )


def _crear_personaje_con_pagina(session: Session, nombre: str) -> Personaje:
    comunidad = Comunidad(nombre=f"Com {nombre}")
    session.add(comunidad)
    session.commit()
    session.refresh(comunidad)
    pagina = Pagina(
        id_plataforma=f"fb-{nombre}",
        nombre_publico=nombre,
        url=f"https://www.facebook.com/{nombre}",
        estado_conexion="conectado",
    )
    session.add(pagina)
    session.commit()
    session.refresh(pagina)
    personaje = Personaje(
        nombre=nombre,
        comunidad_id=comunidad.id,
        pagina_id=pagina.id,
        estado=PersonajeEstado.ACTIVO,
        nivel_actividad=7,
        personalidad={"reaccion_firma": "love", "tendencia_responder": 8},
    )
    session.add(personaje)
    session.commit()
    session.refresh(personaje)
    return personaje


# ---------------------------------------------------------------------------
# Planificador de rondas (spec de comportamiento)
# ---------------------------------------------------------------------------

def test_ronda_nunca_entran_todos_sin_orden_directa():
    personajes = [_personaje_falso(f"P{i}", actividad=(i % 10) + 1) for i in range(15)]
    for seed in range(30):
        plan = planificar_ronda(personajes, rng=random.Random(seed))
        participantes = {a.personaje_id for a in plan}
        assert len(participantes) < 15


def test_ronda_con_orden_directa_entran_todos():
    personajes = [_personaje_falso(f"P{i}") for i in range(6)]
    plan = planificar_ronda(personajes, orden_directa=True, rng=random.Random(1))
    participantes = {a.personaje_id for a in plan}
    assert participantes == {p.id for p in personajes}


def test_ronda_tiempos_irregulares_y_ordenados():
    personajes = [_personaje_falso(f"P{i}", actividad=8) for i in range(10)]
    plan = planificar_ronda(personajes, rng=random.Random(42))
    delays = [a.delay_segundos for a in plan]
    assert delays == sorted(delays)
    huecos = {b - a for a, b in zip(delays, delays[1:]) if b - a > 0}
    assert len(huecos) > 1  # nada de metrónomo


def test_ronda_respuestas_no_son_a_uno_mismo():
    personajes = [_personaje_falso(f"P{i}", actividad=9) for i in range(12)]
    for seed in range(20):
        plan = planificar_ronda(personajes, rng=random.Random(seed))
        for accion in plan:
            if accion.tipo == "fb_responder":
                assert accion.reply_to_personaje_id != accion.personaje_id


def test_reaccion_de_firma_domina():
    personaje = _personaje_falso("Luna", firma="love")
    rng = random.Random(7)
    elecciones = [_elegir_reaccion(personaje, rng) for _ in range(200)]
    assert elecciones.count("love") > 100


# ---------------------------------------------------------------------------
# Endpoints: identidad obligatoria y resultados honestos
# ---------------------------------------------------------------------------

def test_comentar_sin_personaje_es_400(client: TestClient):
    r = client.post(
        "/api/facebook/comentar",
        json={"post_url": "https://facebook.com/x/posts/1", "mensaje": "hola"},
    )
    assert r.status_code == 400


def test_comentar_sin_cuenta_queda_fallida_no_en_cola(client: TestClient, session: Session):
    personaje = _crear_personaje_con_pagina(session, "LunaTest")
    r = client.post(
        "/api/facebook/comentar",
        json={
            "post_url": "https://facebook.com/x/posts/1",
            "mensaje": "hola",
            "personaje_id": personaje.id,
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "fallida"
    assert data["tarea_id"]
    tarea = session.get(Tarea, data["tarea_id"])
    assert tarea is not None
    assert tarea.error  # error claro registrado


def test_paginas_devuelve_personaje_id(client: TestClient, session: Session):
    personaje = _crear_personaje_con_pagina(session, "SofiTest")
    r = client.get("/api/facebook/paginas")
    assert r.status_code == 200
    paginas = r.json()
    assert len(paginas) == 1
    assert paginas[0]["personaje_id"] == personaje.id


# ---------------------------------------------------------------------------
# Orquestación: ronda programa tareas; el ejecutor las procesa
# ---------------------------------------------------------------------------

def test_ronda_crea_tareas_programadas(client: TestClient, session: Session, monkeypatch):
    for nombre in ("A", "B", "C", "D"):
        _crear_personaje_con_pagina(session, f"Ronda{nombre}")

    async def fake_comment(personaje, post_text, comunidad_nombre="", llm_router=None, modelo=None):
        return f"comentario de {personaje.nombre}"

    async def fake_reply(personaje, conversation, comunidad_nombre="", llm_router=None, modelo=None):
        return f"respuesta de {personaje.nombre}"

    monkeypatch.setattr("app.api.orquestacion.generate_comment", fake_comment)
    monkeypatch.setattr("app.api.orquestacion.generate_reply", fake_reply)
    monkeypatch.setattr(
        "app.api.orquestacion.router_desde_db",
        lambda s: SimpleNamespace(providers={"fake": object()}),
    )

    r = client.post(
        "/api/orquestacion/ronda",
        json={"post_url": "https://facebook.com/x/posts/9", "post_texto": "un post de gatos"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["tareas_creadas"] > 0

    tareas = session.exec(select(Tarea)).all()
    assert len(tareas) == data["tareas_creadas"]
    for tarea in tareas:
        assert tarea.estado.value == "programada"
        assert tarea.fecha_programada is not None


def test_procesar_vencidas_sin_cuenta_marca_fallida(client: TestClient, session: Session):
    personaje = _crear_personaje_con_pagina(session, "VencidaTest")
    tarea = Tarea(
        tipo="fb_comentar",
        estado="pendiente",
        payload={"post_url": "https://facebook.com/x/posts/1", "mensaje": "hola"},
        fecha_programada=datetime.now(timezone.utc) - timedelta(minutes=5),
        personaje_id=personaje.id,
        comunidad_id=personaje.comunidad_id,
    )
    session.add(tarea)
    session.commit()

    r = client.post("/api/orquestacion/procesar-vencidas", json={"limite": 5})
    assert r.status_code == 200
    data = r.json()
    assert data["procesadas"] == 1
    assert data["tareas"][0]["estado"] == "fallida"
    assert data["tareas"][0]["error"]


def test_responder_comentarios_sin_cuenta_es_error_honesto(client: TestClient, session: Session):
    personaje = _crear_personaje_con_pagina(session, "RespTest")
    r = client.post(
        "/api/orquestacion/responder-comentarios",
        json={"post_url": "https://facebook.com/x/posts/2", "pagina_id": personaje.pagina_id},
    )
    assert r.status_code == 400
    assert "No se pudieron leer" in r.json()["detail"]
