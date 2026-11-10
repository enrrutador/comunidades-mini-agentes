"""
Router de Facebook: gestión de cuentas con credenciales y sesiones de navegador.

No se usa ninguna API de Facebook. Toda la interacción se hace a través
de un navegador real (Playwright) que se loguea con credenciales.

Implementación completa pendiente (Fase 2 del Documento Maestro).
Este módulo define los endpoints y los esqueletos para la gestión
de cuentas y la asignación de Páginas a personajes.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session, select

from app.db.models import Cuenta, Pagina, Personaje, Plataforma
from app.db.session import get_session

router = APIRouter(prefix="/facebook", tags=["facebook"])


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


class AsignarPaginaRequest(BaseModel):
    personaje_id: str


class PublicarRequest(BaseModel):
    pagina_id: str
    mensaje: str
    media_url: Optional[str] = None


class ComentarRequest(BaseModel):
    post_url: str
    mensaje: str


class ReaccionarRequest(BaseModel):
    object_url: str
    tipo: str  # like, love, haha, wow, sad, angry


# ---------------------------------------------------------------------------
# Gestión de cuentas
# ---------------------------------------------------------------------------

@router.post("/cuentas", response_model=CuentaResponse)
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
    # TODO: cifrar password y totp_secret, guardar en token_usuario_cifrado
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


@router.post("/cuentas/{cuenta_id}/login")
def iniciar_login(cuenta_id: str, session: Session = Depends(get_session)):
    """
    Iniciar sesión en Facebook vía navegador.

    TODO: encolar tarea en el Browser Manager para:
    1. Crear contexto aislado.
    2. Navegar a facebook.com/login.
    3. Ingresar credenciales descifradas.
    4. Manejar 2FA/checkpoint.
    5. Guardar storage state cifrado.
    6. Actualizar estado de la cuenta.
    """
    cuenta = session.get(Cuenta, cuenta_id)
    if not cuenta:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada.")
    return {
        "status": "en_cola",
        "message": "Login encolado. El Browser Manager lo procesará.",
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
# ---------------------------------------------------------------------------

@router.post("/publicar")
def publicar_post(data: PublicarRequest, session: Session = Depends(get_session)):
    """
    Publicar un post en una Página de Facebook vía navegador.

    TODO: encolar tarea en el Browser Manager.
    """
    pagina = session.get(Pagina, data.pagina_id)
    if not pagina:
        raise HTTPException(status_code=404, detail="Página no encontrada.")
    if pagina.estado_conexion != "conectado":
        raise HTTPException(status_code=400, detail="La Página no está conectada.")
    return {
        "status": "en_cola",
        "message": "Publicación encolada para ejecución vía navegador.",
        "pagina_id": data.pagina_id,
    }


@router.post("/comentar")
def comentar(data: ComentarRequest, session: Session = Depends(get_session)):
    """Comentar en un post de Facebook vía navegador."""
    return {
        "status": "en_cola",
        "message": "Comentario encolado para ejecución vía navegador.",
        "post_url": data.post_url,
    }


@router.post("/reaccionar")
def reaccionar(data: ReaccionarRequest, session: Session = Depends(get_session)):
    """Reaccionar a un post o comentario vía navegador."""
    return {
        "status": "en_cola",
        "message": "Reacción encolada para ejecución vía navegador.",
        "object_url": data.object_url,
        "tipo": data.tipo,
    }


@router.get("/leer-posts")
def leer_posts(
    pagina_id: str = Query(...),
    limit: int = Query(10, ge=1, le=50),
    session: Session = Depends(get_session),
):
    """Leer posts de una Página vía navegador (scraping)."""
    pagina = session.get(Pagina, pagina_id)
    if not pagina:
        raise HTTPException(status_code=404, detail="Página no encontrada.")
    return {
        "status": "en_cola",
        "message": "Lectura de posts encolada para ejecución vía navegador.",
        "pagina_id": pagina_id,
        "limit": limit,
    }


@router.get("/leer-comentarios")
def leer_comentarios(
    post_url: str = Query(...),
    limit: int = Query(50, ge=1, le=200),
    session: Session = Depends(get_session),
):
    """Leer comentarios de un post vía navegador (scraping)."""
    return {
        "status": "en_cola",
        "message": "Lectura de comentarios encolada para ejecución vía navegador.",
        "post_url": post_url,
        "limit": limit,
    }
