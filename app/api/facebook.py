"""
Router de Facebook: autenticación OAuth, gestión de cuentas y Páginas.

Implementación completa pendiente (Fase 2 del Documento Maestro).
Este módulo define los endpoints y los esqueletos para el flujo OAuth
y la gestión de tokens cifrados.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlmodel import Session, select

from app.db.models import Cuenta, Pagina, Personaje
from app.db.session import get_session

router = APIRouter(prefix="/facebook", tags=["facebook"])


# ---------------------------------------------------------------------------
# Autenticación OAuth
# ---------------------------------------------------------------------------

@router.get("/login")
def facebook_login(
    comunidad_id: str = Query(...),
    session: Session = Depends(get_session),
):
    """
    Redirige al usuario a Facebook OAuth.

    Parámetros:
    - comunidad_id: comunidad a la que se asociarán las Páginas.

    TODO: implementar generación de state (CSRF), redirect a Facebook
    con los scopes necesarios, y almacenar el state temporalmente.
    """
    raise HTTPException(
        status_code=501,
        detail="Flujo OAuth de Facebook pendiente de implementación.",
    )


@router.get("/callback")
def facebook_callback(
    code: str = Query(...),
    state: str = Query(...),
    session: Session = Depends(get_session),
):
    """
    Callback de Facebook OAuth.

    Pasos a implementar:
    1. Validar state (CSRF).
    2. Intercambiar code por short-lived token.
    3. Extender a long-lived token.
    4. Obtener Páginas administradas y sus tokens.
    5. Persistir Cuenta + Paginas (tokens cifrados).
    6. Redirigir al frontend.
    """
    raise HTTPException(
        status_code=501,
        detail="Callback OAuth de Facebook pendiente de implementación.",
    )


# ---------------------------------------------------------------------------
# Gestión de cuentas
# ---------------------------------------------------------------------------

@router.get("/cuentas")
def listar_cuentas(session: Session = Depends(get_session)):
    """Listar cuentas de Facebook conectadas."""
    cuentas = session.exec(select(Cuenta)).all()
    return [
        {
            "id": c.id,
            "nombre_identificador": c.nombre_identificador,
            "plataforma": c.plataforma,
            "estado_conexion": c.estado_conexion,
            "metodo_autenticacion": c.metodo_autenticacion,
            "estado_autorizacion": c.estado_autorizacion,
            "ultima_conexion": c.ultima_conexion,
        }
        for c in cuentas
    ]


@router.get("/cuentas/{cuenta_id}/paginas")
def listar_paginas_de_cuenta(
    cuenta_id: str,
    session: Session = Depends(get_session),
):
    """Listar Páginas administradas por una cuenta."""
    cuenta = session.get(Cuenta, cuenta_id)
    if not cuenta:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada.")
    paginas = session.exec(
        select(Pagina).where(Pagina.cuenta_id == cuenta_id)
    ).all()
    return [
        {
            "id": p.id,
            "id_plataforma": p.id_plataforma,
            "nombre_publico": p.nombre_publico,
            "url": p.url,
            "avatar_url": p.avatar_url,
            "estado_conexion": p.estado_conexion,
            "capacidades": p.capacidades,
        }
        for p in paginas
    ]


@router.delete("/cuentas/{cuenta_id}")
def desconectar_cuenta(
    cuenta_id: str,
    session: Session = Depends(get_session),
):
    """
    Desconectar una cuenta de Facebook.

    TODO: revocar token en Facebook (DELETE /me/permissions),
    marcar cuenta y páginas como desconectadas.
    """
    cuenta = session.get(Cuenta, cuenta_id)
    if not cuenta:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada.")
    cuenta.estado_conexion = "desconectado"
    cuenta.estado_autorizacion = "revocado"
    session.add(cuenta)
    # Desconectar páginas asociadas
    paginas = session.exec(
        select(Pagina).where(Pagina.cuenta_id == cuenta_id)
    ).all()
    for p in paginas:
        p.estado_conexion = "desconectado"
        session.add(p)
    session.commit()
    return {"status": "desconectado", "cuenta_id": cuenta_id}


# ---------------------------------------------------------------------------
# Asignación de Página a Personaje
# ---------------------------------------------------------------------------

@router.patch("/paginas/{pagina_id}/asignar")
def asignar_pagina_a_personaje(
    pagina_id: str,
    personaje_id: str = Query(...),
    session: Session = Depends(get_session),
):
    """Asignar una Página a un Personaje (o desvincular con personaje_id=null)."""
    pagina = session.get(Pagina, pagina_id)
    if not pagina:
        raise HTTPException(status_code=404, detail="Página no encontrada.")

    if personaje_id and personaje_id != "null":
        personaje = session.get(Personaje, personaje_id)
        if not personaje:
            raise HTTPException(status_code=404, detail="Personaje no encontrado.")
        # Desvincular página anterior del personaje si la tenía
        personaje.pagina_id = pagina.id
        session.add(personaje)

    # Desvincular esta página de cualquier otro personaje que la tuviera
    otros = session.exec(
        select(Personaje).where(Personaje.pagina_id == pagina_id)
    ).all()
    for p in otros:
        if p.id != personaje_id:
            p.pagina_id = None
            session.add(p)

    session.commit()
    return {"status": "asignado", "pagina_id": pagina_id, "personaje_id": personaje_id}


# ---------------------------------------------------------------------------
# Publicación (usado por el orquestador)
# ---------------------------------------------------------------------------

@router.post("/publicar")
def publicar_post(
    pagina_id: str = Query(...),
    mensaje: str = Query(...),
    session: Session = Depends(get_session),
):
    """
    Publicar un post en una Página de Facebook.

    TODO: implementar llamada real a Graph API usando el token de la Página.
    """
    pagina = session.get(Pagina, pagina_id)
    if not pagina:
        raise HTTPException(status_code=404, detail="Página no encontrada.")
    if pagina.estado_conexion != "conectado":
        raise HTTPException(status_code=400, detail="La Página no está conectada.")
    raise HTTPException(
        status_code=501,
        detail="Publicación en Facebook pendiente de implementación.",
    )


@router.post("/comentar")
def comentar(
    objeto_id: str = Query(...),
    mensaje: str = Query(...),
    session: Session = Depends(get_session),
):
    """Comentar en un post o comentario de Facebook."""
    raise HTTPException(
        status_code=501,
        detail="Comentarios en Facebook pendiente de implementación.",
    )


@router.post("/reaccionar")
def reaccionar(
    objeto_id: str = Query(...),
    tipo: str = Query(...),
    session: Session = Depends(get_session),
):
    """Reaccionar a un post o comentario (like, love, haha, etc.)."""
    raise HTTPException(
        status_code=501,
        detail="Reacciones en Facebook pendiente de implementación.",
    )
