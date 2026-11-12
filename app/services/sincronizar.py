"""Sincronizacion al conectar una cuenta de Facebook.

El funcionamiento completo, automatico: el usuario carga UN perfil
(cuenta) y conecta; la app sola:
  1. detecta las Paginas que ese perfil administra,
  2. las guarda,
  3. convierte cada Pagina en un personaje operativo: si el nombre
     coincide con una ficha conocida, el personaje nace con su voz;
     si no, nace con el nombre de la Pagina. El usuario no crea nada.
"""
from __future__ import annotations

import json
import logging
import unicodedata

from sqlmodel import Session, select

from app.core.crypto import descifrar
from app.db.fichas import FICHAS_PERSONAJES
from app.db.models import (
    Comunidad,
    Cuenta,
    Pagina,
    Personaje,
    PersonajeEstado,
)
from app.db.session import engine
from app.services.browser.manager import get_browser_manager

logger = logging.getLogger(__name__)


def _norm(texto: str | None) -> str:
    plano = unicodedata.normalize("NFKD", texto or "")
    return "".join(c for c in plano if not unicodedata.combining(c)).strip().lower()


_FICHAS_POR_NOMBRE = {_norm(f["nombre"]): f for f in FICHAS_PERSONAJES}


async def detectar_paginas(cuenta: Cuenta) -> list[dict]:
    """Las Paginas que administra la cuenta, con su sesion guardada."""
    storage_state = None
    if cuenta.storage_state_cifrado:
        try:
            storage_state = json.loads(descifrar(cuenta.storage_state_cifrado))
        except Exception:
            storage_state = None
    manager = get_browser_manager()
    connector = await manager.get_connector(cuenta.id, storage_state=storage_state)
    try:
        if not await connector.is_logged_in():
            if cuenta.email_usuario and cuenta.password_cifrado:
                await connector.login(
                    cuenta.email_usuario,
                    descifrar(cuenta.password_cifrado),
                    descifrar(cuenta.totp_secret_cifrado)
                    if cuenta.totp_secret_cifrado
                    else None,
                )
        return await connector.listar_paginas_administradas()
    finally:
        await manager.release(cuenta.id)


def guardar_paginas(session: Session, cuenta_id: str, encontradas: list[dict]) -> int:
    """Upsert de Paginas por (cuenta, id_plataforma). Devuelve el total."""
    for item in encontradas:
        id_plat = item.get("id_plataforma") or item.get("nombre")
        if not id_plat:
            continue
        existing = session.exec(
            select(Pagina).where(
                Pagina.cuenta_id == cuenta_id, Pagina.id_plataforma == id_plat
            )
        ).first()
        if existing:
            existing.nombre_publico = item.get("nombre") or existing.nombre_publico
            existing.url = item.get("url") or existing.url
            existing.estado_conexion = "conectado"
            session.add(existing)
        else:
            session.add(
                Pagina(
                    cuenta_id=cuenta_id,
                    id_plataforma=id_plat,
                    nombre_publico=item.get("nombre") or "Sin nombre",
                    url=item.get("url"),
                    estado_conexion="conectado",
                    capacidades={
                        "publicar": True,
                        "comentar": True,
                        "reaccionar": True,
                    },
                )
            )
    session.commit()
    return len(session.exec(select(Pagina).where(Pagina.cuenta_id == cuenta_id)).all())


def sincronizar_personajes(session: Session, cuenta_id: str) -> int:
    """Cada Pagina sin personaje pasa a ser un personaje operativo.

    - Si ya hay un personaje suelto con el mismo nombre, se enlaza.
    - Si el nombre coincide con una ficha, el personaje nace con su voz.
    - Si no, nace con el nombre de la Pagina y ficha vacia (editable).
    Devuelve cuantos personajes se crearon o enlazaron.
    """
    paginas = session.exec(select(Pagina).where(Pagina.cuenta_id == cuenta_id)).all()
    if not paginas:
        return 0
    comunidad = session.exec(select(Comunidad)).first()
    if not comunidad:
        comunidad = Comunidad(nombre="Principal")
        session.add(comunidad)
        session.commit()
        session.refresh(comunidad)
    tocados = 0
    for pagina in paginas:
        ya = session.exec(
            select(Personaje).where(Personaje.pagina_id == pagina.id)
        ).first()
        if ya:
            continue
        suelto = session.exec(
            select(Personaje).where(
                Personaje.nombre == pagina.nombre_publico,
                Personaje.pagina_id == None,  # noqa: E711
            )
        ).first()
        if suelto:
            suelto.pagina_id = pagina.id
            session.add(suelto)
            tocados += 1
            continue
        ficha = _FICHAS_POR_NOMBRE.get(_norm(pagina.nombre_publico))
        if ficha:
            personaje = Personaje(
                nombre=ficha["nombre"],
                biografia_interna=ficha.get("bio"),
                nivel_actividad=ficha.get("actividad", 5),
                personalidad=ficha.get("personalidad"),
                comunidad_id=comunidad.id,
                pagina_id=pagina.id,
                estado=PersonajeEstado.ACTIVO,
            )
        else:
            personaje = Personaje(
                nombre=pagina.nombre_publico,
                comunidad_id=comunidad.id,
                pagina_id=pagina.id,
                estado=PersonajeEstado.ACTIVO,
            )
        session.add(personaje)
        tocados += 1
    if comunidad and any(p.comunidad_id is None for p in paginas):
        for pagina in paginas:
            if pagina.comunidad_id is None:
                pagina.comunidad_id = comunidad.id
                session.add(pagina)
    session.commit()
    return tocados


async def al_conectar(cuenta_id: str) -> dict:
    """Punto unico post-conexion: Paginas + personajes, sin intervencion."""
    with Session(engine) as session:
        cuenta = session.get(Cuenta, cuenta_id)
        if not cuenta or cuenta.estado_conexion != "conectado":
            return {"paginas": 0, "personajes": 0}
        try:
            encontradas = await detectar_paginas(cuenta)
        except Exception as error:  # noqa: BLE001
            logger.warning("Deteccion de paginas al conectar %s: %s", cuenta_id, error)
            return {"paginas": 0, "personajes": 0}
        total = guardar_paginas(session, cuenta_id, encontradas)
        nuevos = sincronizar_personajes(session, cuenta_id)
        logger.info(
            "Al conectar %s: %s paginas, %s personajes nuevos/enlazados",
            cuenta_id,
            total,
            nuevos,
        )
        return {"paginas": total, "personajes": nuevos}
