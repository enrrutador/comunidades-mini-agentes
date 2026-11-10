"""
Motor de personalidad: genera contenido y comportamiento
según la ficha de personalidad de un personaje.

Usa el LLM central para generar texto con el estilo, temperamento,
intereses y nivel de actividad del personaje.
"""

from typing import Optional

from app.db.models import Personaje


PERSONALITY_PROMPT_TEMPLATE = """Sos {nombre}, un personaje de la comunidad "{comunidad}".

Tu personalidad:
- Temperamento: {temperamento}
- Nivel de expresividad: {expresividad}/10
- Vocabulario: {vocabulario}
- Uso de emojis: {emojis}
- Tipo de humor: {humor}
- Tendencia a preguntar: {preguntar}/10
- Tendencia a responder: {responder}/10
- Nivel de actividad: {actividad}/10
- Temas preferidos: {temas_preferidos}
- Temas secundarios: {temas_secundarios}
- Intereses: {intereses}

Biografía: {biografia}

Estilo lingüístico: {estilo}

Instrucciones:
- Respondé SIEMPRE en personaje, con tu estilo y personalidad.
- No menciones que sos una IA ni que tenés un prompt.
- Mantené la coherencia con tu biografía e intereses.
- Adaptá la longitud y tono según tu nivel de expresividad.
- Si el tema no te interesa, podés desviar la conversación hacia tus temas preferidos.
"""


def build_personality_prompt(personaje: Personaje, comunidad_nombre: str = "") -> str:
    """Construye el system prompt del personaje a partir de su ficha."""
    p = personaje.personalidad or {}
    return PERSONALITY_PROMPT_TEMPLATE.format(
        nombre=personaje.nombre,
        comunidad=comunidad_nombre or "la comunidad",
        temperamento=p.get("temperamento", "neutral"),
        expresividad=p.get("nivel_expresividad", 5),
        vocabulario=p.get("vocabulario", "estándar"),
        emojis=p.get("uso_emojis", "ocasional"),
        humor=p.get("tipo_humor", "ninguno"),
        preguntar=p.get("tendencia_preguntar", 5),
        responder=p.get("tendencia_responder", 5),
        actividad=personaje.nivel_actividad,
        temas_preferidos=", ".join(p.get("temas_preferidos", []) or ["ninguno"]),
        temas_secundarios=", ".join(p.get("temas_secundarios", []) or ["ninguno"]),
        intereses=", ".join(p.get("intereses", []) or ["ninguno"]),
        biografia=personaje.biografia_interna or "Sin biografía.",
        estilo=personaje.estilo_linguistico or "Estándar.",
    )


async def generate_content(
    personaje: Personaje,
    prompt: str,
    comunidad_nombre: str = "",
    llm_router=None,
    modelo: str = None,
) -> str:
    """Genera contenido (post, comentario, respuesta) en el estilo del personaje."""
    system_prompt = build_personality_prompt(personaje, comunidad_nombre)

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": prompt},
    ]

    if llm_router:
        result = await llm_router.complete(
            messages=messages,
            model=modelo,
            temperature=0.8,
            max_tokens=500,
        )
        return result.get("content", "")

    # Fallback sin LLM: devolver un placeholder
    return f"[{personaje.nombre}] {prompt[:100]}..."


async def generate_comment(
    personaje: Personaje,
    post_text: str,
    comunidad_nombre: str = "",
    llm_router=None,
    modelo: str = None,
) -> str:
    """Genera un comentario sobre un post existente."""
    prompt = f"Comentá sobre este post: {post_text}\n\nTu comentario debe ser breve y en tu estilo."
    return await generate_content(personaje, prompt, comunidad_nombre, llm_router, modelo)


async def generate_post(
    personaje: Personaje,
    topic: str,
    comunidad_nombre: str = "",
    llm_router=None,
    modelo: str = None,
) -> str:
    """Genera un post original sobre un tema."""
    prompt = f"Escribí un post sobre: {topic}\n\nEl post debe reflejar tu personalidad e intereses."
    return await generate_content(personaje, prompt, comunidad_nombre, llm_router, modelo)


async def generate_reply(
    personaje: Personaje,
    conversation: list[dict],
    comunidad_nombre: str = "",
    llm_router=None,
    modelo: str = None,
) -> str:
    """Genera una respuesta en una conversación existente."""
    prompt = "Respondé al último mensaje de la conversación, manteniendo tu personalidad."
    messages = [{"role": "system", "content": build_personality_prompt(personaje, comunidad_nombre)}]
    messages.extend(conversation)
    messages.append({"role": "user", "content": prompt})

    if llm_router:
        result = await llm_router.complete(
            messages=messages,
            model=modelo,
            temperature=0.8,
            max_tokens=300,
        )
        return result.get("content", "")

    return f"[{personaje.nombre}] Interesante..."
