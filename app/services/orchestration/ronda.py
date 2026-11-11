"""
Planificador de rondas de interacción.

Implementa la spec de comportamiento humano del proyecto
(la que nació de la corrección de Fabian tras la ronda del poema del
2026-11-08, donde los 15 comentarios salieron parecidos, del mismo
largo y en fila metronómica: «parece lo que es verdad: una
automatización. Esa no es la idea»).

Principio rector: nada de esto es una regla fija. Todo sale DESPROLIJO
por defecto y la irregularidad misma varía ronda a ronda. La única
uniformidad permitida es cuando Fabian pide algo específico para una
acción concreta (``orden_directa=True``: entran todos), y aun así los
tiempos, largos y reacciones salen desparejos.

Reglas que este planificador aplica:
- Nunca entran todos: subconjunto ponderado por nivel de actividad
  (entre un tercio y dos tercios), distinto en cada post.
- Roles mezclados: algunos solo reaccionan, otros solo comentan,
  otros hacen ambas cosas. Las reacciones siempre son más que los
  comentarios.
- Reacción de firma por personaje (70% de las veces), el resto varía.
- Tiempos irregulares: huecos de minutos, nunca intervalos parejos;
  a veces un «tardío» que entra horas después.
- Reacciones a comentarios GRUMOSAS: pocos comentarios juntan varias,
  la mayoría queda en cero; nunca una cadena ordenada 1 a 1.
- Nadie reacciona a un comentario que todavía no existía cuando
  «pasó»: las reacciones e hilos respetan el orden de llegada.
- Hilos: a veces (no siempre) hay respuestas entre personajes,
  mini-hilos de 2-3, nunca con la misma forma.
"""

import math
import random
from dataclasses import dataclass
from typing import Optional

REACCIONES_POSIBLES = ["like", "love", "haha", "wow"]


@dataclass
class AccionPlanificada:
    personaje_id: str
    tipo: str  # fb_comentar | fb_reaccionar | fb_responder
    delay_segundos: int
    tipo_reaccion: Optional[str] = None
    objetivo: str = "post"  # post | comentario
    # Para reacciones/respuestas a un comentario puntual:
    objetivo_autor: Optional[str] = None  # nombre visible del autor del comentario
    reply_to_personaje_id: Optional[str] = None


def _actividad(personaje) -> int:
    """Nivel de actividad 1-10 (Personaje manda; si no, la ficha)."""
    nivel = getattr(personaje, "nivel_actividad", None)
    if nivel:
        return int(nivel)
    personalidad = getattr(personaje, "personalidad", None) or {}
    return int(personalidad.get("nivel_actividad", 5) or 5)


def _reaccion_firma(personaje) -> Optional[str]:
    personalidad = getattr(personaje, "personalidad", None) or {}
    firma = personalidad.get("reaccion_firma")
    return firma if firma in REACCIONES_POSIBLES else None


def _elegir_reaccion(personaje, rng: random.Random) -> str:
    """70% la de firma; si no, una al azar con like/love dominando."""
    firma = _reaccion_firma(personaje)
    if firma and rng.random() < 0.7:
        return firma
    return rng.choices(REACCIONES_POSIBLES, weights=[5, 3, 1, 1], k=1)[0]


def _gap(rng: random.Random) -> int:
    """Hueco irregular entre acciones, en segundos. Nada de metrónomo."""
    r = rng.random()
    if r < 0.6:
        return int(rng.uniform(60, 360))       # 1 a 6 minutos
    if r < 0.9:
        return int(rng.uniform(420, 1500))     # 7 a 25 minutos
    return int(rng.uniform(1800, 5400))        # media hora a hora y media


def elegir_subconjunto(personajes: list, rng: random.Random, orden_directa: bool = False) -> list:
    """
    Quiénes entran en esta ronda.

    Con orden directa de Fabian entran todos (pero el resto del plan
    sigue desprolijo). Si no: entre un tercio y dos tercios, nunca
    todos, ponderado por nivel de actividad.
    """
    personajes = list(personajes)
    if not personajes:
        return []
    if orden_directa or len(personajes) == 1:
        elegidos = personajes[:]
        rng.shuffle(elegidos)
        return elegidos

    n = len(personajes)
    minimo = max(1, math.ceil(n / 3))
    maximo = max(minimo, min(n - 1, math.floor(2 * n / 3)))
    k = rng.randint(minimo, maximo)

    pesos = [_actividad(p) for p in personajes]
    elegidos: list = []
    pool = personajes[:]
    pool_pesos = pesos[:]
    for _ in range(k):
        elegido = rng.choices(pool, weights=pool_pesos, k=1)[0]
        idx = pool.index(elegido)
        elegidos.append(elegido)
        pool.pop(idx)
        pool_pesos.pop(idx)
    rng.shuffle(elegidos)
    return elegidos


def planificar_ronda(
    personajes: list,
    *,
    orden_directa: bool = False,
    rng: Optional[random.Random] = None,
) -> list[AccionPlanificada]:
    """
    Planificar una ronda de interacción sobre un post.

    Devuelve las acciones ordenadas por delay (segundos desde ahora).
    No genera textos: eso lo hace el motor de personalidad al crear
    las tareas (comentarios/respuestas) o el ejecutor.
    """
    rng = rng or random.Random()
    subset = elegir_subconjunto(personajes, rng, orden_directa=orden_directa)
    if not subset:
        return []

    acciones: list[AccionPlanificada] = []
    comentarios: list[tuple[object, int]] = []  # (personaje, delay) que ya comentaron

    tiempo = int(rng.uniform(60, 240))  # la primera acción no es inmediata
    for personaje in subset:
        tiempo += _gap(rng)
        rol = rng.choices(
            ["solo_reacciona", "solo_comenta", "ambos"], weights=[35, 35, 30], k=1
        )[0]

        if rol in ("solo_reacciona", "ambos"):
            acciones.append(
                AccionPlanificada(
                    personaje_id=personaje.id,
                    tipo="fb_reaccionar",
                    delay_segundos=tiempo,
                    tipo_reaccion=_elegir_reaccion(personaje, rng),
                    objetivo="post",
                )
            )
        if rol in ("solo_comenta", "ambos"):
            delay_comentario = tiempo + (int(rng.uniform(0, 180)) if rol == "ambos" else 0)
            acciones.append(
                AccionPlanificada(
                    personaje_id=personaje.id,
                    tipo="fb_comentar",
                    delay_segundos=delay_comentario,
                )
            )
            comentarios.append((personaje, delay_comentario))

    # Un «tardío» ocasional: alguien que vio el post mucho después.
    if len(subset) >= 4 and rng.random() < 0.35:
        tardio = rng.choice(subset)
        acciones.append(
            AccionPlanificada(
                personaje_id=tardio.id,
                tipo="fb_reaccionar",
                delay_segundos=tiempo + int(rng.uniform(7200, 18000)),  # 2 a 5 horas
                tipo_reaccion=_elegir_reaccion(tardio, rng),
                objetivo="post",
            )
        )

    if comentarios:
        # Reacciones GRUMOSAS a comentarios: 0-2 comentarios juntan
        # varias reacciones; el resto queda en cero. Solo reaccionan
        # personajes cuyo paso por el post es POSTERIOR al comentario.
        cantidad_objetivos = rng.randint(0, min(2, len(comentarios)))
        objetivos = rng.sample(comentarios, cantidad_objetivos) if cantidad_objetivos else []
        for autor_comentario, delay_comentario in objetivos:
            cantidad = rng.randint(2, 4)
            # candidatos: personajes del subconjunto distintos del autor
            posibles = [p for p in subset if p.id != autor_comentario.id]
            rng.shuffle(posibles)
            for reactor in posibles[:cantidad]:
                acciones.append(
                    AccionPlanificada(
                        personaje_id=reactor.id,
                        tipo="fb_reaccionar",
                        delay_segundos=delay_comentario + int(rng.uniform(120, 2400)),
                        tipo_reaccion=_elegir_reaccion(reactor, rng),
                        objetivo="comentario",
                        objetivo_autor=getattr(autor_comentario, "nombre", None),
                    )
                )

        # Hilos: a veces, 1-3 respuestas entre personajes.
        if len(comentarios) >= 2 and rng.random() < 0.6:
            cantidad_hilos = rng.randint(1, min(3, len(comentarios)))
            base = rng.sample(comentarios, cantidad_hilos)
            for autor_comentario, delay_comentario in base:
                posibles = [p for p in subset if p.id != autor_comentario.id]
                if not posibles:
                    continue
                respondedor = rng.choice(posibles)
                delay_respuesta = delay_comentario + int(rng.uniform(180, 1800))
                acciones.append(
                    AccionPlanificada(
                        personaje_id=respondedor.id,
                        tipo="fb_responder",
                        delay_segundos=delay_respuesta,
                        objetivo="comentario",
                        objetivo_autor=getattr(autor_comentario, "nombre", None),
                        reply_to_personaje_id=autor_comentario.id,
                    )
                )
                # Contra-respuesta ocasional del autor original (mini-hilo de 3)
                if rng.random() < 0.3:
                    acciones.append(
                        AccionPlanificada(
                            personaje_id=autor_comentario.id,
                            tipo="fb_responder",
                            delay_segundos=delay_respuesta + int(rng.uniform(180, 1500)),
                            objetivo="comentario",
                            objetivo_autor=getattr(respondedor, "nombre", None),
                            reply_to_personaje_id=respondedor.id,
                        )
                    )

    acciones.sort(key=lambda a: a.delay_segundos)
    return acciones
