"""
Endpoints de orquestación: el flujo punta a punta de la comunidad.

- POST /orquestacion/ronda: planifica una ronda de interacción sobre
  un post con la spec de comportamiento (subconjunto desprolijo,
  reacciones de firma, hilos, tardíos) y crea las tareas programadas.
  Los textos se generan con el motor de personalidad al planificar;
  la ejecución y la verificación ocurren cuando cada tarea vence.
- POST /orquestacion/responder-comentarios: lee los comentarios que
  recibió un post de un personaje y programa respuestas (a veces,
  según su tendencia a responder) para los que todavía no tienen.
- POST /orquestacion/procesar-vencidas: ejecuta ya las tareas
  vencidas (el scheduler de main.py también lo hace solo cada
  SCHEDULER_INTERVALO_SEG segundos).
"""

import asyncio
import random
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from app.db.models import Pagina, Personaje, PersonajeEstado, Tarea, TareaEstado
from app.db.session import get_session
from app.services.orchestration.executor import (
    ejecutar_tarea,
    procesar_vencidas,
    router_desde_db,
)
from app.services.orchestration.ronda import _gap, planificar_ronda
from app.services.personality.engine import generate_comment, generate_reply

router = APIRouter(prefix="/orquestacion", tags=["orquestacion"])


class RondaRequest(BaseModel):
    post_url: str
    post_texto: Optional[str] = None
    comunidad_id: Optional[str] = None
    orden_directa: bool = False


class ResponderComentariosRequest(BaseModel):
    post_url: str
    pagina_id: str
    max_respuestas: int = 3


class ProcesarVencidasRequest(BaseModel):
    limite: int = 5


def _personajes_elegibles(session: Session, comunidad_id: Optional[str]) -> list[Personaje]:
    query = select(Personaje).where(
        Personaje.estado == PersonajeEstado.ACTIVO,
        Personaje.pagina_id != None,  # noqa: E711
    )
    if comunidad_id:
        query = query.where(Personaje.comunidad_id == comunidad_id)
    return session.exec(query).all()


@router.post("/ronda")
def crear_ronda(data: RondaRequest, session: Session = Depends(get_session)):
    """
    Planificar una ronda sobre un post y dejar las tareas programadas.

    Cada tarea vence a su hora irregular; el ejecutor la publica como
    la Página del personaje y verifica el resultado en Facebook.
    """
    personajes = _personajes_elegibles(session, data.comunidad_id)
    if not personajes:
        raise HTTPException(
            status_code=400,
            detail="No hay personajes activos con Página asignada para la ronda.",
        )

    plan = planificar_ronda(personajes, orden_directa=data.orden_directa)
    if not plan:
        return {"tareas_creadas": 0, "tareas": []}

    necesita_texto = any(a.tipo in ("fb_comentar", "fb_responder") for a in plan)
    router_llm = router_desde_db(session)
    if necesita_texto and not router_llm.providers:
        raise HTTPException(
            status_code=400,
            detail="La ronda incluye comentarios/respuestas pero no hay ningún "
            "proveedor LLM activo para generar los textos.",
        )

    por_id = {p.id: p for p in personajes}
    ahora = datetime.now(timezone.utc)

    def comunidad_nombre(personaje: Personaje) -> str:
        from app.db.models import Comunidad

        comunidad = session.get(Comunidad, personaje.comunidad_id)
        return comunidad.nombre if comunidad else ""

    # Generar primero los comentarios: las respuestas se escriben
    # contestando el texto real del comentario al que responden.
    textos: dict[str, str] = {}
    for accion in plan:
        if accion.tipo == "fb_comentar":
            personaje = por_id[accion.personaje_id]
            textos[accion.personaje_id] = asyncio.run(
                generate_comment(
                    personaje,
                    data.post_texto or data.post_url,
                    comunidad_nombre(personaje),
                    router_llm,
                )
            )
    for accion in plan:
        if accion.tipo == "fb_responder":
            personaje = por_id[accion.personaje_id]
            autor = por_id.get(accion.reply_to_personaje_id)
            texto_original = textos.get(accion.reply_to_personaje_id, "")
            conversacion = [
                {
                    "role": "user",
                    "content": f"{autor.nombre if autor else 'Alguien'}: {texto_original}",
                }
            ]
            textos[accion.personaje_id + ":respuesta:" + str(accion.delay_segundos)] = asyncio.run(
                generate_reply(personaje, conversacion, comunidad_nombre(personaje), router_llm)
            )

    creadas = []
    for accion in plan:
        personaje = por_id[accion.personaje_id]
        payload: dict = {"post_url": data.post_url}
        if data.post_texto:
            payload["post_texto"] = data.post_texto
        if accion.tipo == "fb_comentar":
            payload["mensaje"] = textos.get(accion.personaje_id, "")
        elif accion.tipo == "fb_responder":
            payload["mensaje"] = textos.get(
                accion.personaje_id + ":respuesta:" + str(accion.delay_segundos), ""
            )
            payload["reply_to_autor"] = accion.objetivo_autor
            payload["reply_to_personaje_id"] = accion.reply_to_personaje_id
            payload["comentario_texto"] = textos.get(accion.reply_to_personaje_id, "")
        elif accion.tipo == "fb_reaccionar":
            payload["tipo_reaccion"] = accion.tipo_reaccion or "like"
            payload["objetivo"] = accion.objetivo
            if accion.objetivo == "comentario":
                payload["objetivo_autor"] = accion.objetivo_autor

        tarea = Tarea(
            tipo=accion.tipo,
            prioridad=5,
            estado=TareaEstado.PROGRAMADA,
            payload=payload,
            fecha_programada=ahora + timedelta(seconds=accion.delay_segundos),
            comunidad_id=personaje.comunidad_id,
            personaje_id=personaje.id,
        )
        session.add(tarea)
        session.commit()
        session.refresh(tarea)
        creadas.append(
            {
                "id": tarea.id,
                "personaje": personaje.nombre,
                "tipo": accion.tipo,
                "delay_segundos": accion.delay_segundos,
                "fecha_programada": tarea.fecha_programada.isoformat() if tarea.fecha_programada else None,
            }
        )

    return {"tareas_creadas": len(creadas), "tareas": creadas}


@router.post("/responder-comentarios")
def responder_comentarios(
    data: ResponderComentariosRequest, session: Session = Depends(get_session)
):
    """
    Leer los comentarios de un post propio y programar respuestas.

    Responde el personaje dueño de la Página, solo a comentarios de
    terceros que todavía no tienen respuesta, y solo A VECES: la
    probabilidad sale de su tendencia a responder (ficha de voz).
    El texto se genera al ejecutar la tarea, con el comentario real
    como contexto.
    """
    pagina = session.get(Pagina, data.pagina_id)
    if not pagina:
        raise HTTPException(status_code=404, detail="Página no encontrada.")
    duenio = session.exec(
        select(Personaje).where(Personaje.pagina_id == pagina.id)
    ).first()
    if not duenio:
        raise HTTPException(
            status_code=400,
            detail="La Página no tiene personaje asignado: no se sabe quién responde.",
        )

    # Leer los comentarios de verdad (tarea ejecutada en el momento)
    tarea_lectura = Tarea(
        tipo="fb_leer_comentarios",
        prioridad=5,
        estado=TareaEstado.PENDIENTE,
        payload={"post_url": data.post_url, "limit": 50},
        comunidad_id=duenio.comunidad_id,
        personaje_id=duenio.id,
    )
    session.add(tarea_lectura)
    session.commit()
    session.refresh(tarea_lectura)
    ejecutar_tarea(session, tarea_lectura)
    session.refresh(tarea_lectura)
    if tarea_lectura.estado != TareaEstado.COMPLETADA:
        raise HTTPException(
            status_code=400,
            detail=f"No se pudieron leer los comentarios: {tarea_lectura.error}",
        )
    comentarios = (tarea_lectura.resultado or {}).get("comentarios", [])

    from app.services.browser.facebook import _norm

    nombres_propios = {
        _norm(p.nombre_publico)
        for p in session.exec(select(Pagina)).all()
    }
    ya_respondidos = set()
    for t in session.exec(
        select(Tarea).where(Tarea.tipo == "fb_responder")
    ).all():
        if (t.payload or {}).get("post_url") == data.post_url and t.estado not in (
            TareaEstado.CANCELADA,
            TareaEstado.FALLIDA,
        ):
            autor = (t.payload or {}).get("reply_to_autor")
            if autor:
                ya_respondidos.add(_norm(autor))

    ficha = duenio.personalidad or {}
    tendencia = int(ficha.get("tendencia_responder", 5) or 5)
    rng = random.Random()
    ahora = datetime.now(timezone.utc)

    creadas = []
    for comentario in comentarios:
        if len(creadas) >= data.max_respuestas:
            break
        autor = (comentario.get("author") or "").strip()
        if not autor:
            continue
        if _norm(autor) in nombres_propios or _norm(autor) in ya_respondidos:
            continue
        # A veces: ni el dueño responde todo lo que le comentan.
        if rng.random() > tendencia / 10:
            continue
        delay = int(rng.uniform(300, 3600)) + _gap(rng) // 2
        tarea = Tarea(
            tipo="fb_responder",
            prioridad=5,
            estado=TareaEstado.PROGRAMADA,
            payload={
                "post_url": data.post_url,
                "reply_to_autor": autor,
                "comentario_texto": comentario.get("text", ""),
            },
            fecha_programada=ahora + timedelta(seconds=delay),
            comunidad_id=duenio.comunidad_id,
            personaje_id=duenio.id,
        )
        session.add(tarea)
        session.commit()
        session.refresh(tarea)
        creadas.append(
            {
                "id": tarea.id,
                "responde_a": autor,
                "delay_segundos": delay,
                "fecha_programada": tarea.fecha_programada.isoformat() if tarea.fecha_programada else None,
            }
        )

    return {
        "comentarios_leidos": len(comentarios),
        "tareas_creadas": len(creadas),
        "tareas": creadas,
    }


@router.post("/procesar-vencidas")
def procesar_vencidas_endpoint(
    data: ProcesarVencidasRequest, session: Session = Depends(get_session)
):
    """Ejecutar ahora las tareas de Facebook vencidas (hasta el límite)."""
    procesadas = procesar_vencidas(session, limite=data.limite)
    return {
        "procesadas": len(procesadas),
        "tareas": [
            {
                "id": t.id,
                "tipo": t.tipo,
                "estado": t.estado.value if hasattr(t.estado, "value") else t.estado,
                "error": t.error,
                "verificado": (t.resultado or {}).get("verificado") if t.resultado else None,
            }
            for t in procesadas
        ],
    }
