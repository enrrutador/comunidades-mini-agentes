"""
Router de Facebook: gestión de cuentas con credenciales y sesiones de navegador.

No se usa ninguna API de Facebook. Toda la interacción se hace a través
de un navegador real (Playwright) que se loguea con credenciales.

Implementación completa pendiente (Fase 2 del Documento Maestro).
Este módulo define los endpoints y los esqueletos para la gestión
de cuentas y la asignación de Páginas a personajes.
"""

import asyncio
import json
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session, select

from app.core.crypto import cifrar, descifrar
import logging

logger = logging.getLogger(__name__)
from app.db.models import Cuenta, Pagina, Personaje, Plataforma, Tarea, TareaEstado
from app.db.session import engine, get_session
from app.services.browser.manager import get_browser_manager
from app.services.orchestration.executor import ejecutar_tarea

router = APIRouter(prefix="/facebook", tags=["facebook"])


def _personaje_id_de_pagina(session: Session, pagina_id: str):
    """El personaje dueño de una Página (la relación vive en Personaje.pagina_id)."""
    personaje = session.exec(
        select(Personaje).where(Personaje.pagina_id == pagina_id)
    ).first()
    return personaje.id if personaje else None


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class CuentaCreate(BaseModel):
    nombre_identificador: str
    email_o_usuario: str
    password: str
    totp_secret: Optional[str] = None  # para 2FA TOTP


class CuentaResponse(BaseModel):
    id: str
    nombre_identificador: str
    plataforma: str
    estado_conexion: str
    metodo_autenticacion: Optional[str]
    estado_autorizacion: Optional[str]
    ultima_conexion: Optional[str]


class PaginaResponse(BaseModel):
    id: str
    id_plataforma: str
    nombre_publico: str
    url: Optional[str]
    avatar_url: Optional[str]
    estado_conexion: str
    capacidades: Optional[dict]
    personaje_id: Optional[str] = None


class AsignarPaginaRequest(BaseModel):
    personaje_id: str


class PublicarRequest(BaseModel):
    pagina_id: str
    mensaje: str
    media_url: Optional[str] = None


class ComentarRequest(BaseModel):
    post_url: str
    mensaje: str
    # Obligatorio en la práctica: hay que saber COMO QUÉ Página se
    # comenta. Sin personaje, el endpoint devuelve 400 (nunca actuar
    # con la identidad equivocada ni con la del perfil personal).
    personaje_id: Optional[str] = None


class ReaccionarRequest(BaseModel):
    object_url: str
    tipo: str  # like, love, haha, wow, sad, angry
    personaje_id: Optional[str] = None


# ---------------------------------------------------------------------------
# Gestión de cuentas
# ---------------------------------------------------------------------------

@router.post("/cuentas", response_model=CuentaResponse, status_code=201)
def registrar_cuenta(
    data: CuentaCreate,
    session: Session = Depends(get_session),
):
    """
    Registrar una nueva cuenta de Facebook.

    Las credenciales se cifran antes de almacenar.
    TODO: implementar cifrado con Fernet (CREDENTIAL_ENCRYPTION_KEY).
    """
    # Verificar que no exista una cuenta con el mismo identificador
    existing = session.exec(
        select(Cuenta).where(Cuenta.nombre_identificador == data.nombre_identificador)
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Ya existe una cuenta con ese nombre.")

    cuenta = Cuenta(
        nombre_identificador=data.nombre_identificador,
        plataforma=Plataforma.FACEBOOK,
        estado_conexion="desconectado",
        metodo_autenticacion="browser_credentials",
        estado_autorizacion="pendiente",
    )
    cuenta.email_usuario = data.email_o_usuario
    cuenta.password_cifrado = cifrar(data.password)
    cuenta.totp_secret_cifrado = (
        cifrar(data.totp_secret) if data.totp_secret else None
    )
    session.add(cuenta)
    session.commit()
    session.refresh(cuenta)
    return CuentaResponse(
        id=cuenta.id,
        nombre_identificador=cuenta.nombre_identificador,
        plataforma=cuenta.plataforma.value,
        estado_conexion=cuenta.estado_conexion,
        metodo_autenticacion=cuenta.metodo_autenticacion,
        estado_autorizacion=cuenta.estado_autorizacion,
        ultima_conexion=cuenta.ultima_conexion.isoformat() if cuenta.ultima_conexion else None,
    )


@router.get("/cuentas", response_model=list[CuentaResponse])
def listar_cuentas(session: Session = Depends(get_session)):
    """Listar cuentas de Facebook registradas."""
    cuentas = session.exec(select(Cuenta)).all()
    return [
        CuentaResponse(
            id=c.id,
            nombre_identificador=c.nombre_identificador,
            plataforma=c.plataforma.value,
            estado_conexion=c.estado_conexion,
            metodo_autenticacion=c.metodo_autenticacion,
            estado_autorizacion=c.estado_autorizacion,
            ultima_conexion=c.ultima_conexion.isoformat() if c.ultima_conexion else None,
        )
        for c in cuentas
    ]


@router.get("/cuentas/{cuenta_id}", response_model=CuentaResponse)
def obtener_cuenta(cuenta_id: str, session: Session = Depends(get_session)):
    """Obtener detalle de una cuenta."""
    cuenta = session.get(Cuenta, cuenta_id)
    if not cuenta:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada.")
    return CuentaResponse(
        id=cuenta.id,
        nombre_identificador=cuenta.nombre_identificador,
        plataforma=cuenta.plataforma.value,
        estado_conexion=cuenta.estado_conexion,
        metodo_autenticacion=cuenta.metodo_autenticacion,
        estado_autorizacion=cuenta.estado_autorizacion,
        ultima_conexion=cuenta.ultima_conexion.isoformat() if cuenta.ultima_conexion else None,
    )


@router.delete("/cuentas/{cuenta_id}")
def eliminar_cuenta(cuenta_id: str, session: Session = Depends(get_session)):
    """Eliminar una cuenta y sus sesiones."""
    cuenta = session.get(Cuenta, cuenta_id)
    if not cuenta:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada.")
    # Eliminar sesiones de navegador asociadas
    from app.db.models import SesionNavegador
    sesiones = session.exec(
        select(SesionNavegador).where(SesionNavegador.cuenta_id == cuenta_id)
    ).all()
    for s in sesiones:
        session.delete(s)
    session.delete(cuenta)
    session.commit()
    return {"status": "eliminada", "cuenta_id": cuenta_id}


def _ejecutar_login(cuenta_id: str) -> None:
    """Tarea en segundo plano: login real de Facebook vía Playwright."""

    def _marcar_error(session: Session, mensaje: str) -> None:
        logger.error("Login %s: %s", cuenta_id, mensaje)
        cuenta = session.get(Cuenta, cuenta_id)
        if cuenta:
            cuenta.estado_conexion = "error"
            session.add(cuenta)
            session.commit()

    with Session(engine) as session:
        cuenta = session.get(Cuenta, cuenta_id)
        if not cuenta:
            return
        try:
            email = cuenta.email_usuario or ""
            password = descifrar(cuenta.password_cifrado) if cuenta.password_cifrado else ""
            totp = descifrar(cuenta.totp_secret_cifrado) if cuenta.totp_secret_cifrado else None
            if not email or not password:
                _marcar_error(session, "faltan credenciales")
                return

            async def _run() -> None:
                manager = get_browser_manager()
                connector = await manager.get_connector(cuenta_id)
                try:
                    ok = await connector.login(email, password, totp)
                    if ok:
                        state = await connector.get_storage_state()
                        cuenta.storage_state_cifrado = cifrar(json.dumps(state))
                        cuenta.estado_conexion = "conectado"
                        cuenta.ultima_conexion = datetime.now(timezone.utc)
                        logger.info("Login OK %s", cuenta_id)
                    else:
                        cuenta.estado_conexion = "error"
                        logger.warning("Login rechazado %s", cuenta_id)
                finally:
                    await manager.release(cuenta_id)

            asyncio.run(_run())
            session.add(cuenta)
            session.commit()
        except Exception as error:  # noqa: BLE001
            _marcar_error(session, str(error))


@router.post("/cuentas/{cuenta_id}/login")
def iniciar_login(
    cuenta_id: str,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
):
    """
    Iniciar sesión en Facebook vía navegador (Playwright headless).

    La tarea corre en segundo plano: el frontend consulta
    GET /cuentas/{cuenta_id}/estado hasta que cambia a conectado/error.
    """
    cuenta = session.get(Cuenta, cuenta_id)
    if not cuenta:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada.")
    cuenta.estado_conexion = "conectando"
    session.add(cuenta)
    session.commit()
    background_tasks.add_task(_ejecutar_login, cuenta_id)
    return {
        "status": "en_cola",
        "message": "Login en progreso. El navegador se abrirá en segundo plano.",
        "cuenta_id": cuenta_id,
    }


@router.get("/cuentas/{cuenta_id}/estado")
def estado_cuenta(cuenta_id: str, session: Session = Depends(get_session)):
    """Obtener el estado de conexión de una cuenta."""
    cuenta = session.get(Cuenta, cuenta_id)
    if not cuenta:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada.")
    return {
        "cuenta_id": cuenta_id,
        "estado_conexion": cuenta.estado_conexion,
        "estado_autorizacion": cuenta.estado_autorizacion,
        "ultima_conexion": cuenta.ultima_conexion.isoformat() if cuenta.ultima_conexion else None,
    }



class CrearPaginaRequest(BaseModel):
    nombre: str
    categoria: Optional[str] = "Comunidad"


@router.post("/cuentas/{cuenta_id}/crear-pagina")
def crear_pagina(
    cuenta_id: str,
    data: CrearPaginaRequest,
    session: Session = Depends(get_session),
):
    """Crear una Página de Facebook nueva con el navegador de la cuenta."""
    cuenta = session.get(Cuenta, cuenta_id)
    if not cuenta:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada.")
    if cuenta.estado_conexion != "conectado":
        raise HTTPException(status_code=400, detail="La cuenta debe estar conectada primero.")

    storage_state = None
    if cuenta.storage_state_cifrado:
        try:
            storage_state = json.loads(descifrar(cuenta.storage_state_cifrado))
        except Exception:
            storage_state = None

    async def _run() -> dict:
        manager = get_browser_manager()
        connector = await manager.get_connector(cuenta_id, storage_state=storage_state)
        try:
            if not await connector.is_logged_in():
                # re-login con credenciales guardadas
                if cuenta.email_usuario and cuenta.password_cifrado:
                    await connector.login(
                        cuenta.email_usuario,
                        descifrar(cuenta.password_cifrado),
                        descifrar(cuenta.totp_secret_cifrado) if cuenta.totp_secret_cifrado else None,
                    )
            return await connector.crear_pagina(data.nombre, data.categoria or "Comunidad")
        finally:
            await manager.release(cuenta_id)

    resultado = asyncio.run(_run())

    if resultado.get("status") == "creada":
        pagina = Pagina(
            cuenta_id=cuenta.id,
            id_plataforma=resultado.get("id_plataforma") or resultado.get("nombre"),
            nombre_publico=data.nombre,
            url=resultado.get("url"),
            estado_conexion="conectado",
            capacidades={"publicar": True, "comentar": True, "reaccionar": True},
        )
        session.add(pagina)
        session.commit()
        session.refresh(pagina)
        resultado["pagina_id"] = pagina.id

    return resultado


@router.post("/cuentas/{cuenta_id}/detectar-paginas")
def detectar_paginas(
    cuenta_id: str,
    session: Session = Depends(get_session),
):
    """Detectar las Páginas que la cuenta administra y guardarlas en la DB."""
    cuenta = session.get(Cuenta, cuenta_id)
    if not cuenta:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada.")
    if cuenta.estado_conexion != "conectado":
        raise HTTPException(status_code=400, detail="La cuenta debe estar conectada primero.")

    storage_state = None
    if cuenta.storage_state_cifrado:
        try:
            storage_state = json.loads(descifrar(cuenta.storage_state_cifrado))
        except Exception:
            storage_state = None

    async def _run() -> list[dict]:
        manager = get_browser_manager()
        connector = await manager.get_connector(cuenta_id, storage_state=storage_state)
        try:
            if not await connector.is_logged_in():
                if cuenta.email_usuario and cuenta.password_cifrado:
                    await connector.login(
                        cuenta.email_usuario,
                        descifrar(cuenta.password_cifrado),
                        descifrar(cuenta.totp_secret_cifrado) if cuenta.totp_secret_cifrado else None,
                    )
            return await connector.listar_paginas_administradas()
        finally:
            await manager.release(cuenta_id)

    encontradas = asyncio.run(_run())

    nuevas = 0
    for item in encontradas:
        id_plat = item.get("id_plataforma") or item.get("nombre")
        existing = session.exec(
            select(Pagina).where(Pagina.cuenta_id == cuenta_id, Pagina.id_plataforma == id_plat)
        ).first()
        if existing:
            existing.nombre_publico = item.get("nombre") or existing.nombre_publico
            existing.url = item.get("url") or existing.url
            session.add(existing)
        else:
            session.add(
                Pagina(
                    cuenta_id=cuenta.id,
                    id_plataforma=id_plat,
                    nombre_publico=item.get("nombre") or "Sin nombre",
                    url=item.get("url"),
                    estado_conexion="conectado",
                    capacidades={"publicar": True, "comentar": True, "reaccionar": True},
                )
            )
            nuevas += 1
    session.commit()

    paginas = session.exec(select(Pagina).where(Pagina.cuenta_id == cuenta_id)).all()
    return [
        PaginaResponse(
            id=p.id,
            id_plataforma=p.id_plataforma,
            nombre_publico=p.nombre_publico,
            url=p.url,
            avatar_url=p.avatar_url,
            estado_conexion=p.estado_conexion,
            capacidades=p.capacidades,
            personaje_id=_personaje_id_de_pagina(session, p.id),
        )
        for p in paginas
    ]


# ---------------------------------------------------------------------------
# Páginas
# ---------------------------------------------------------------------------

@router.get("/cuentas/{cuenta_id}/paginas", response_model=list[PaginaResponse])
def listar_paginas_de_cuenta(cuenta_id: str, session: Session = Depends(get_session)):
    """Listar Páginas detectadas en una cuenta."""
    cuenta = session.get(Cuenta, cuenta_id)
    if not cuenta:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada.")
    paginas = session.exec(
        select(Pagina).where(Pagina.cuenta_id == cuenta_id)
    ).all()
    return [
        PaginaResponse(
            id=p.id,
            id_plataforma=p.id_plataforma,
            nombre_publico=p.nombre_publico,
            url=p.url,
            avatar_url=p.avatar_url,
            estado_conexion=p.estado_conexion,
            capacidades=p.capacidades,
            personaje_id=_personaje_id_de_pagina(session, p.id),
        )
        for p in paginas
    ]


@router.get("/paginas", response_model=list[PaginaResponse])
def listar_paginas(session: Session = Depends(get_session)):
    """Listar todas las Páginas registradas."""
    paginas = session.exec(select(Pagina)).all()
    return [
        PaginaResponse(
            id=p.id,
            id_plataforma=p.id_plataforma,
            nombre_publico=p.nombre_publico,
            url=p.url,
            avatar_url=p.avatar_url,
            estado_conexion=p.estado_conexion,
            capacidades=p.capacidades,
            personaje_id=_personaje_id_de_pagina(session, p.id),
        )
        for p in paginas
    ]


@router.patch("/paginas/{pagina_id}/asignar")
def asignar_pagina_a_personaje(
    pagina_id: str,
    data: AsignarPaginaRequest,
    session: Session = Depends(get_session),
):
    """Asignar una Página a un Personaje."""
    pagina = session.get(Pagina, pagina_id)
    if not pagina:
        raise HTTPException(status_code=404, detail="Página no encontrada.")

    personaje = session.get(Personaje, data.personaje_id)
    if not personaje:
        raise HTTPException(status_code=404, detail="Personaje no encontrado.")

    # Desvincular esta página de cualquier otro personaje
    otros = session.exec(
        select(Personaje).where(Personaje.pagina_id == pagina_id)
    ).all()
    for p in otros:
        if p.id != personaje.id:
            p.pagina_id = None
            session.add(p)

    personaje.pagina_id = pagina.id
    session.add(personaje)
    session.commit()
    return {"status": "asignado", "pagina_id": pagina_id, "personaje_id": personaje.id}


@router.patch("/paginas/{pagina_id}/desasignar")
def desasignar_pagina(
    pagina_id: str,
    session: Session = Depends(get_session),
):
    """Desvincular una Página de su Personaje."""
    personajes = session.exec(
        select(Personaje).where(Personaje.pagina_id == pagina_id)
    ).all()
    for p in personajes:
        p.pagina_id = None
        session.add(p)
    session.commit()
    return {"status": "desasignado", "pagina_id": pagina_id}


# ---------------------------------------------------------------------------
# Acciones (usadas por el orquestador, ejecutadas vía navegador)
#
# Cada acción crea una Tarea real y la ejecuta en el momento con el
# ejecutor: navegador con la sesión de la cuenta, identidad de la
# Página del personaje y verificación del resultado en Facebook.
# La respuesta devuelve el estado REAL de la tarea (completada /
# fallida + si quedó verificada), nunca un "en_cola" de mentira.
# ---------------------------------------------------------------------------

def _ejecutar_accion(session: Session, tarea: Tarea) -> dict:
    session.add(tarea)
    session.commit()
    session.refresh(tarea)
    ejecutar_tarea(session, tarea)
    session.refresh(tarea)
    estado = tarea.estado.value if hasattr(tarea.estado, "value") else tarea.estado
    return {
        "status": estado,
        "tarea_id": tarea.id,
        "verificado": (tarea.resultado or {}).get("verificado") if tarea.resultado else None,
        "message": tarea.error or "Acción ejecutada.",
        "resultado": tarea.resultado,
    }


@router.post("/publicar")
def publicar_post(data: PublicarRequest, session: Session = Depends(get_session)):
    """Publicar un post en una Página, como el personaje dueño de la Página."""
    pagina = session.get(Pagina, data.pagina_id)
    if not pagina:
        raise HTTPException(status_code=404, detail="Página no encontrada.")
    personaje_id = _personaje_id_de_pagina(session, pagina.id)
    if not personaje_id:
        raise HTTPException(
            status_code=400,
            detail="La Página no tiene personaje asignado: no se sabe como quién publicar.",
        )
    tarea = Tarea(
        tipo="fb_publicar",
        prioridad=5,
        estado=TareaEstado.PENDIENTE,
        payload={"pagina_id": data.pagina_id, "mensaje": data.mensaje},
        personaje_id=personaje_id,
    )
    return _ejecutar_accion(session, tarea)


@router.post("/comentar")
def comentar(data: ComentarRequest, session: Session = Depends(get_session)):
    """Comentar en un post, como la Página del personaje indicado."""
    if not data.personaje_id:
        raise HTTPException(
            status_code=400,
            detail="Falta personaje_id: hay que saber como qué Página se comenta. "
            "Sin identidad confirmada no se comenta.",
        )
    personaje = session.get(Personaje, data.personaje_id)
    if not personaje:
        raise HTTPException(status_code=404, detail="Personaje no encontrado.")
    tarea = Tarea(
        tipo="fb_comentar",
        prioridad=5,
        estado=TareaEstado.PENDIENTE,
        payload={"post_url": data.post_url, "mensaje": data.mensaje},
        comunidad_id=personaje.comunidad_id,
        personaje_id=personaje.id,
    )
    return _ejecutar_accion(session, tarea)


@router.post("/reaccionar")
def reaccionar(data: ReaccionarRequest, session: Session = Depends(get_session)):
    """Reaccionar a un post, como la Página del personaje indicado."""
    if not data.personaje_id:
        raise HTTPException(
            status_code=400,
            detail="Falta personaje_id: hay que saber como qué Página se reacciona.",
        )
    personaje = session.get(Personaje, data.personaje_id)
    if not personaje:
        raise HTTPException(status_code=404, detail="Personaje no encontrado.")
    tarea = Tarea(
        tipo="fb_reaccionar",
        prioridad=5,
        estado=TareaEstado.PENDIENTE,
        payload={"object_url": data.object_url, "tipo_reaccion": data.tipo},
        comunidad_id=personaje.comunidad_id,
        personaje_id=personaje.id,
    )
    return _ejecutar_accion(session, tarea)


@router.get("/leer-posts")
def leer_posts(
    pagina_id: str = Query(...),
    limit: int = Query(10, ge=1, le=50),
    session: Session = Depends(get_session),
):
    """Leer posts de una Página vía navegador (scraping), de verdad."""
    pagina = session.get(Pagina, pagina_id)
    if not pagina:
        raise HTTPException(status_code=404, detail="Página no encontrada.")
    personaje_id = _personaje_id_de_pagina(session, pagina.id)
    if not personaje_id:
        raise HTTPException(
            status_code=400, detail="La Página no tiene personaje asignado."
        )
    tarea = Tarea(
        tipo="fb_leer_posts",
        prioridad=5,
        estado=TareaEstado.PENDIENTE,
        payload={"pagina_id": pagina_id, "limit": limit},
        personaje_id=personaje_id,
    )
    resultado = _ejecutar_accion(session, tarea)
    return {**resultado, "posts": (tarea.resultado or {}).get("posts", [])}


@router.get("/leer-comentarios")
def leer_comentarios(
    post_url: str = Query(...),
    pagina_id: str = Query(...),
    limit: int = Query(50, ge=1, le=200),
    session: Session = Depends(get_session),
):
    """Leer comentarios de un post vía navegador (scraping), de verdad."""
    pagina = session.get(Pagina, pagina_id)
    if not pagina:
        raise HTTPException(status_code=404, detail="Página no encontrada.")
    personaje_id = _personaje_id_de_pagina(session, pagina.id)
    if not personaje_id:
        raise HTTPException(
            status_code=400, detail="La Página no tiene personaje asignado."
        )
    tarea = Tarea(
        tipo="fb_leer_comentarios",
        prioridad=5,
        estado=TareaEstado.PENDIENTE,
        payload={"post_url": post_url, "limit": limit},
        personaje_id=personaje_id,
    )
    resultado = _ejecutar_accion(session, tarea)
    return {**resultado, "comentarios": (tarea.resultado or {}).get("comentarios", [])}
