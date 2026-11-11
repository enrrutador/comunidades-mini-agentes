"""
Ejecutor de tareas de Facebook.

Cierra el lazo que faltaba en el flujo punta a punta:

    planificación -> generación -> publicación -> verificación -> memoria

Cada tarea fb_* se ejecuta con un navegador real usando la sesión
guardada de la cuenta, SIEMPRE actuando como la Página del personaje
(el conector cambia la identidad y aborta si no puede confirmarla) y
verificando en Facebook que la acción haya quedado con el autor
correcto. El resultado real — no un recibo — queda en la tarea y en
la memoria episódica del personaje.

Ritmo: la comunidad real cuelga de UNA sola cuenta, así que el tope
de acciones por hora se mide a nivel de la cuenta completa
(settings.FB_MAX_ACCIONES_POR_HORA_CUENTA). Si se supera, la tarea se
reprograma sola en vez de forzar.
"""

import asyncio
import json
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlmodel import Session, select

from app.core.config import settings
from app.core.crypto import cifrar, descifrar
from app.db.models import (
    Cuenta,
    MemoryEntry,
    MemoryScope,
    ModeloLLM,
    Pagina,
    Personaje,
    ProveedorLLM,
    Tarea,
    TareaEstado,
)
from app.services.browser.facebook import FacebookBrowserConnector
from app.services.llm.base import LLMRouter, OpenAICompatibleProvider
from app.services.personality.engine import (
    generate_comment,
    generate_post,
    generate_reply,
)

logger = logging.getLogger(__name__)

TIPOS_FB = {"fb_publicar", "fb_comentar", "fb_responder", "fb_reaccionar", "fb_leer_comentarios", "fb_leer_posts"}


class ErrorEjecucion(Exception):
    """Error de negocio al ejecutar una tarea (queda en tarea.error)."""


def _aware(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is not None and dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


# ---------------------------------------------------------------------------
# Resolución de la cadena Personaje -> Página -> Cuenta
# ---------------------------------------------------------------------------

def resolver_cadena(session: Session, tarea: Tarea):
    payload = tarea.payload or {}
    personaje: Optional[Personaje] = None
    pagina: Optional[Pagina] = None

    if tarea.personaje_id:
        personaje = session.get(Personaje, tarea.personaje_id)
    if personaje and personaje.pagina_id:
        pagina = session.get(Pagina, personaje.pagina_id)
    if not pagina and payload.get("pagina_id"):
        pagina = session.get(Pagina, payload["pagina_id"])
    if pagina and not personaje:
        personaje = session.exec(
            select(Personaje).where(Personaje.pagina_id == pagina.id)
        ).first()

    if not personaje:
        raise ErrorEjecucion(
            "La tarea no tiene personaje (ni directo ni dueño de la Página): "
            "no se sabe como quién actuar."
        )
    if not pagina:
        raise ErrorEjecucion(
            f"El personaje {personaje.nombre} no tiene Página asignada."
        )
    if not pagina.cuenta_id:
        raise ErrorEjecucion(f"La Página {pagina.nombre_publico} no tiene cuenta asociada.")
    cuenta = session.get(Cuenta, pagina.cuenta_id)
    if not cuenta:
        raise ErrorEjecucion("La cuenta de la Página no existe.")
    if cuenta.estado_conexion != "conectado":
        raise ErrorEjecucion(
            f"La cuenta {cuenta.nombre_identificador} no está conectada "
            f"(estado: {cuenta.estado_conexion})."
        )
    return personaje, pagina, cuenta


# ---------------------------------------------------------------------------
# Ritmo a nivel cuenta
# ---------------------------------------------------------------------------

def acciones_fb_ultima_hora(session: Session) -> int:
    """Acciones de Facebook completadas en los últimos 60 minutos.

    La comunidad real opera con una sola cuenta administradora, así
    que el conteo global ES el conteo de la cuenta.
    """
    desde = datetime.now(timezone.utc) - timedelta(hours=1)
    tareas = session.exec(
        select(Tarea).where(
            Tarea.tipo.in_(TIPOS_FB),
            Tarea.estado == TareaEstado.COMPLETADA,
        )
    ).all()
    return sum(1 for t in tareas if _aware(t.fecha_ejecucion) and _aware(t.fecha_ejecucion) >= desde)


# ---------------------------------------------------------------------------
# Generación de texto (cuando la tarea no trae el mensaje)
# ---------------------------------------------------------------------------

def router_desde_db(session: Session) -> LLMRouter:
    """Armar el router LLM con los proveedores activos de la DB.

    Sigue la convención del proyecto: la API key de cada proveedor se
    lee de la variable de entorno <PROVEEDOR>_API_KEY.
    """
    router = LLMRouter()
    proveedores = session.exec(
        select(ProveedorLLM)
        .where(ProveedorLLM.activo == True)  # noqa: E712
        .order_by(ProveedorLLM.prioridad)
    ).all()
    for prov in proveedores:
        api_key = os.getenv(f"{prov.nombre.upper().replace(' ', '_')}_API_KEY")
        router.register_provider(
            OpenAICompatibleProvider(
                name=prov.nombre, base_url=prov.base_url or "", api_key=api_key
            )
        )
        modelos = session.exec(
            select(ModeloLLM)
            .where(ModeloLLM.proveedor_id == prov.id, ModeloLLM.disponible == True)  # noqa: E712
            .order_by(ModeloLLM.prioridad)
        ).all()
        for m in modelos:
            router.fallback_models.append(f"{prov.nombre}/{m.identificador_tecnico}")
        if modelos and not router.default_model:
            router.default_model = f"{prov.nombre}/{modelos[0].identificador_tecnico}"
    return router


async def generar_texto(session: Session, tarea: Tarea, personaje: Personaje) -> str:
    """Generar el texto de la tarea con el motor de personalidad."""
    payload = tarea.payload or {}
    router = router_desde_db(session)
    if not router.providers:
        raise ErrorEjecucion(
            "La tarea no trae mensaje y no hay ningún proveedor LLM activo "
            "para generarlo."
        )
    comunidad_nombre = ""
    if personaje.comunidad_id:
        from app.db.models import Comunidad

        comunidad = session.get(Comunidad, personaje.comunidad_id)
        comunidad_nombre = comunidad.nombre if comunidad else ""

    if tarea.tipo == "fb_publicar":
        tema = payload.get("tema")
        if not tema:
            raise ErrorEjecucion("fb_publicar sin mensaje ni tema en el payload.")
        texto = await generate_post(personaje, tema, comunidad_nombre, router)
    elif tarea.tipo == "fb_responder":
        conversacion = [
            {
                "role": "user",
                "content": f"{payload.get('reply_to_autor', 'Alguien')}: {payload.get('comentario_texto', '')}",
            }
        ]
        texto = await generate_reply(personaje, conversacion, comunidad_nombre, router)
    else:  # fb_comentar
        contexto = payload.get("post_texto") or payload.get("post_url", "")
        texto = await generate_comment(personaje, contexto, comunidad_nombre, router)

    texto = (texto or "").strip()
    if not texto or texto.startswith(f"[{personaje.nombre}]"):
        raise ErrorEjecucion(
            "El motor de personalidad no generó un texto válido "
            "(sin LLM disponible o respuesta vacía)."
        )
    return texto


# ---------------------------------------------------------------------------
# Ejecución en el navegador
# ---------------------------------------------------------------------------

async def _ejecutar_en_navegador(
    cuenta: Cuenta, pagina: Pagina, tarea: Tarea, payload: dict
) -> tuple[dict, Optional[str]]:
    """Corre la acción en un navegador nuevo. Devuelve (resultado, storage_state_json_o_None)."""
    storage_state = None
    if cuenta.storage_state_cifrado:
        try:
            storage_state = json.loads(descifrar(cuenta.storage_state_cifrado))
        except Exception:
            storage_state = None

    connector = FacebookBrowserConnector(storage_state=storage_state)
    await connector.start()
    nuevo_estado: Optional[str] = None
    try:
        if not await connector.is_logged_in():
            email = cuenta.email_usuario or ""
            password = descifrar(cuenta.password_cifrado) if cuenta.password_cifrado else ""
            totp = (
                descifrar(cuenta.totp_secret_cifrado)
                if cuenta.totp_secret_cifrado
                else None
            )
            if not email or not password:
                raise ErrorEjecucion("La cuenta no tiene credenciales para re-login.")
            ok = await connector.login(email, password, totp)
            if not ok:
                raise ErrorEjecucion(
                    "La sesión expiró y el re-login falló (¿checkpoint de Facebook?)."
                )
            state = await connector.get_storage_state()
            nuevo_estado = json.dumps(state)

        nombre_pagina = pagina.nombre_publico
        if tarea.tipo == "fb_publicar":
            url = pagina.url or f"https://www.facebook.com/{pagina.id_plataforma}"
            resultado = await connector.publish_post(url, payload["mensaje"], page_name=nombre_pagina)
        elif tarea.tipo == "fb_comentar":
            resultado = await connector.publish_comment(
                payload["post_url"], payload["mensaje"], page_name=nombre_pagina
            )
        elif tarea.tipo == "fb_responder":
            resultado = await connector.publish_comment(
                payload["post_url"],
                payload["mensaje"],
                page_name=nombre_pagina,
                reply_to_author=payload.get("reply_to_autor"),
            )
        elif tarea.tipo == "fb_reaccionar":
            resultado = await connector.react(
                payload.get("object_url") or payload.get("post_url"),
                payload.get("tipo_reaccion", "like"),
                page_name=nombre_pagina,
                comment_author=payload.get("objetivo_autor"),
            )
        elif tarea.tipo == "fb_leer_comentarios":
            comentarios = await connector.get_post_comments(
                payload["post_url"], limit=int(payload.get("limit", 50))
            )
            resultado = {"status": "leido", "comentarios": comentarios}
        elif tarea.tipo == "fb_leer_posts":
            url = pagina.url or f"https://www.facebook.com/{pagina.id_plataforma}"
            posts = await connector.get_page_posts(url, limit=int(payload.get("limit", 10)))
            resultado = {"status": "leido", "posts": posts}
        else:
            raise ErrorEjecucion(f"Tipo de tarea no ejecutable: {tarea.tipo}")

        if isinstance(resultado, dict) and resultado.get("status") == "error":
            raise ErrorEjecucion(resultado.get("error", "Error del navegador"))
        return resultado, nuevo_estado
    finally:
        await connector.close()


def _registrar_memoria(
    session: Session, personaje: Personaje, pagina: Pagina, tarea: Tarea, resultado: dict
) -> None:
    """Dejar constancia episódica de lo que el personaje hizo de verdad."""
    payload = tarea.payload or {}
    verificado = resultado.get("verificado")
    if tarea.tipo == "fb_publicar":
        resumen = f"Publicó en su Página «{pagina.nombre_publico}»: «{payload.get('mensaje', '')[:80]}»"
    elif tarea.tipo == "fb_comentar":
        resumen = f"Comentó como {pagina.nombre_publico} en {payload.get('post_url', '')}: «{payload.get('mensaje', '')[:80]}»"
    elif tarea.tipo == "fb_responder":
        resumen = f"Respondió a {payload.get('reply_to_autor', 'alguien')} como {pagina.nombre_publico}: «{payload.get('mensaje', '')[:80]}»"
    elif tarea.tipo == "fb_reaccionar":
        resumen = f"Reaccionó ({payload.get('tipo_reaccion', 'like')}) como {pagina.nombre_publico} en {payload.get('object_url') or payload.get('post_url', '')}"
    else:
        return
    if verificado is not None:
        resumen += f" (verificado en Facebook: {'sí' if verificado else 'no'})"
    session.add(
        MemoryEntry(
            scope=MemoryScope.EPISODICA,
            owner=personaje.nombre,
            summary=resumen,
            comunidad_id=personaje.comunidad_id,
            personaje_id=personaje.id,
            metadata_json={
                "tarea_id": tarea.id,
                "tipo": tarea.tipo,
                "verificado": verificado,
            },
        )
    )


# ---------------------------------------------------------------------------
# API del ejecutor
# ---------------------------------------------------------------------------

def ejecutar_tarea(session: Session, tarea: Tarea) -> Tarea:
    """Ejecutar una tarea fb_* ahora, dejando el resultado real en la tarea."""
    if tarea.tipo not in TIPOS_FB:
        raise ErrorEjecucion(f"Tipo no ejecutable por este ejecutor: {tarea.tipo}")

    # Ritmo a nivel cuenta: si ya se llegó al tope de la hora, reprogramar.
    if acciones_fb_ultima_hora(session) >= settings.FB_MAX_ACCIONES_POR_HORA_CUENTA:
        tarea.estado = TareaEstado.PROGRAMADA
        tarea.fecha_programada = datetime.now(timezone.utc) + timedelta(minutes=30)
        tarea.error = None
        session.add(tarea)
        session.commit()
        session.refresh(tarea)
        return tarea

    tarea.estado = TareaEstado.EN_EJECUCION
    tarea.fecha_ejecucion = datetime.now(timezone.utc)
    tarea.error = None
    session.add(tarea)
    session.commit()

    try:
        personaje, pagina, cuenta = resolver_cadena(session, tarea)
        resultado, nuevo_estado = asyncio.run(
            _correr_con_estado(session, tarea, personaje, pagina, cuenta)
        )
        if nuevo_estado:
            cuenta.storage_state_cifrado = cifrar(nuevo_estado)
            cuenta.ultima_conexion = datetime.now(timezone.utc)
            session.add(cuenta)
        tarea.estado = TareaEstado.COMPLETADA
        tarea.resultado = resultado
        _registrar_memoria(session, personaje, pagina, tarea, resultado)
    except Exception as e:  # noqa: BLE001 - el error queda registrado en la tarea
        logger.error("Tarea %s (%s) falló: %s", tarea.id, tarea.tipo, e)
        tarea.estado = TareaEstado.FALLIDA
        tarea.error = str(e)
    tarea.updated_at = datetime.now(timezone.utc)
    session.add(tarea)
    session.commit()
    session.refresh(tarea)
    return tarea


async def _correr_con_estado(session: Session, tarea: Tarea, personaje, pagina, cuenta):
    payload = dict(tarea.payload or {})
    if tarea.tipo in ("fb_publicar", "fb_comentar", "fb_responder") and not payload.get("mensaje"):
        payload["mensaje"] = await generar_texto(session, tarea, personaje)
        tarea.payload = payload
        session.add(tarea)
        session.commit()
    return await _ejecutar_en_navegador(cuenta, pagina, tarea, payload)


def procesar_vencidas(session: Session, limite: int = 5) -> list[Tarea]:
    """Ejecutar las tareas fb_* pendientes/programadas ya vencidas, en orden."""
    ahora = datetime.now(timezone.utc)
    candidatas = session.exec(
        select(Tarea)
        .where(Tarea.tipo.in_(TIPOS_FB), Tarea.estado.in_([TareaEstado.PENDIENTE, TareaEstado.PROGRAMADA]))
        .order_by(Tarea.fecha_programada, Tarea.created_at)
    ).all()
    vencidas = [
        t
        for t in candidatas
        if _aware(t.fecha_programada) is None or _aware(t.fecha_programada) <= ahora
    ][:limite]

    procesadas: list[Tarea] = []
    for i, tarea in enumerate(vencidas):
        if i > 0 and settings.FB_PAUSA_ENTRE_ACCIONES_SEG > 0:
            import time

            time.sleep(settings.FB_PAUSA_ENTRE_ACCIONES_SEG)
        procesadas.append(ejecutar_tarea(session, tarea))
    return procesadas
