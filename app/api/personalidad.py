"""Endpoints del motor de personalidad."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.api.schemas import GenerarContenidoRequest, GenerarContenidoResponse
from app.db.models import Personaje
from app.db.session import get_session
from app.services.llm.base import LLMRouter, OpenAICompatibleProvider
from app.services.personality.engine import (
    build_personality_prompt,
    generate_comment,
    generate_content,
    generate_post,
    generate_reply,
)

router = APIRouter(prefix="/personalidad", tags=["personalidad"])

_llm_router = LLMRouter()


@router.get("/prompt/{personaje_id}")
def obtener_prompt_personaje(personaje_id: str, session: Session = Depends(get_session)):
    """Obtener el system prompt de personalidad de un personaje."""
    personaje = session.get(Personaje, personaje_id)
    if not personaje:
        raise HTTPException(status_code=404, detail="Personaje no encontrado")
    # Obtener nombre de la comunidad
    from app.db.models import Comunidad
    comunidad = session.get(Comunidad, personaje.comunidad_id)
    comunidad_nombre = comunidad.nombre if comunidad else ""
    prompt = build_personality_prompt(personaje, comunidad_nombre)
    return {"personaje_id": personaje_id, "prompt": prompt}


@router.post("/generar", response_model=GenerarContenidoResponse)
async def generar_contenido(
    payload: GenerarContenidoRequest,
    session: Session = Depends(get_session),
):
    """Generar contenido en el estilo de un personaje."""
    personaje = session.get(Personaje, payload.personaje_id)
    if not personaje:
        raise HTTPException(status_code=404, detail="Personaje no encontrado")

    from app.db.models import Comunidad
    comunidad = session.get(Comunidad, personaje.comunidad_id)
    comunidad_nombre = comunidad.nombre if comunidad else ""

    # Configurar LLM router si hay proveedor
    if payload.proveedor_id:
        from app.db.models import ProveedorLLM
        proveedor = session.get(ProveedorLLM, payload.proveedor_id)
        if proveedor:
            import os
            api_key = os.getenv(f"{proveedor.nombre.upper().replace(' ', '_')}_API_KEY")
            instance = OpenAICompatibleProvider(
                name=proveedor.nombre,
                base_url=proveedor.base_url or "",
                api_key=api_key,
            )
            _llm_router.register_provider(instance)
            if payload.modelo_id:
                _llm_router.default_model = f"{proveedor.nombre}/{payload.modelo_id}"

    content = await generate_content(
        personaje=personaje,
        prompt=payload.prompt,
        comunidad_nombre=comunidad_nombre,
        llm_router=_llm_router,
        modelo=payload.modelo_id,
    )

    return GenerarContenidoResponse(
        personaje_id=personaje.id,
        personaje_nombre=personaje.nombre,
        contenido=content,
    )


@router.post("/comentar", response_model=GenerarContenidoResponse)
async def generar_comentario(
    payload: GenerarContenidoRequest,
    session: Session = Depends(get_session),
):
    """Generar un comentario sobre un post en el estilo del personaje."""
    personaje = session.get(Personaje, payload.personaje_id)
    if not personaje:
        raise HTTPException(status_code=404, detail="Personaje no encontrado")

    from app.db.models import Comunidad
    comunidad = session.get(Comunidad, personaje.comunidad_id)
    comunidad_nombre = comunidad.nombre if comunidad else ""

    content = await generate_comment(
        personaje=personaje,
        post_text=payload.prompt,
        comunidad_nombre=comunidad_nombre,
        llm_router=_llm_router,
        modelo=payload.modelo_id,
    )

    return GenerarContenidoResponse(
        personaje_id=personaje.id,
        personaje_nombre=personaje.nombre,
        contenido=content,
    )


@router.post("/post", response_model=GenerarContenidoResponse)
async def generar_post(
    payload: GenerarContenidoRequest,
    session: Session = Depends(get_session),
):
    """Generar un post original en el estilo del personaje."""
    personaje = session.get(Personaje, payload.personaje_id)
    if not personaje:
        raise HTTPException(status_code=404, detail="Personaje no encontrado")

    from app.db.models import Comunidad
    comunidad = session.get(Comunidad, personaje.comunidad_id)
    comunidad_nombre = comunidad.nombre if comunidad else ""

    content = await generate_post(
        personaje=personaje,
        topic=payload.prompt,
        comunidad_nombre=comunidad_nombre,
        llm_router=_llm_router,
        modelo=payload.modelo_id,
    )

    return GenerarContenidoResponse(
        personaje_id=personaje.id,
        personaje_nombre=personaje.nombre,
        contenido=content,
    )
