"""Endpoints de Tareas (orquestación)."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.api.schemas import TareaCreate, TareaRead, TareaUpdate
from app.db.models import Tarea, TareaEstado
from app.db.session import get_session

router = APIRouter(prefix="/tareas", tags=["tareas"])


@router.get("", response_model=List[TareaRead])
def listar_tareas(
    estado: Optional[str] = None,
    tipo: Optional[str] = None,
    comunidad_id: Optional[str] = None,
    personaje_id: Optional[str] = None,
    session: Session = Depends(get_session),
):
    query = select(Tarea)
    if estado:
        query = query.where(Tarea.estado == estado)
    if tipo:
        query = query.where(Tarea.tipo == tipo)
    if comunidad_id:
        query = query.where(Tarea.comunidad_id == comunidad_id)
    if personaje_id:
        query = query.where(Tarea.personaje_id == personaje_id)
    return session.exec(query.order_by(Tarea.prioridad, Tarea.created_at)).all()


@router.post("", response_model=TareaRead, status_code=201)
def crear_tarea(payload: TareaCreate, session: Session = Depends(get_session)):
    # Idempotency check
    if payload.idempotency_key:
        existing = session.exec(
            select(Tarea).where(Tarea.idempotency_key == payload.idempotency_key)
        ).first()
        if existing:
            return existing

    tarea = Tarea(**payload.model_dump())
    session.add(tarea)
    session.commit()
    session.refresh(tarea)
    return tarea


@router.get("/{tarea_id}", response_model=TareaRead)
def obtener_tarea(tarea_id: str, session: Session = Depends(get_session)):
    tarea = session.get(Tarea, tarea_id)
    if not tarea:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    return tarea


@router.patch("/{tarea_id}", response_model=TareaRead)
def actualizar_tarea(
    tarea_id: str,
    payload: TareaUpdate,
    session: Session = Depends(get_session),
):
    tarea = session.get(Tarea, tarea_id)
    if not tarea:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(tarea, key, value)
    from datetime import datetime, timezone
    tarea.updated_at = datetime.now(timezone.utc)
    if payload.estado == "en_ejecucion" and not tarea.fecha_ejecucion:
        tarea.fecha_ejecucion = datetime.now(timezone.utc)
    session.add(tarea)
    session.commit()
    session.refresh(tarea)
    return tarea


@router.delete("/{tarea_id}", status_code=204)
def eliminar_tarea(tarea_id: str, session: Session = Depends(get_session)):
    tarea = session.get(Tarea, tarea_id)
    if not tarea:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    session.delete(tarea)
    session.commit()
    return None


@router.post("/{tarea_id}/reintentar")
def reintentar_tarea(tarea_id: str, session: Session = Depends(get_session)):
    """Reintentar una tarea fallida: vuelve a estado pendiente."""
    tarea = session.get(Tarea, tarea_id)
    if not tarea:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    if tarea.estado != "fallida":
        raise HTTPException(status_code=400, detail="Solo se pueden reintentar tareas fallidas")
    tarea.estado = "pendiente"
    tarea.error = None
    from datetime import datetime, timezone
    tarea.updated_at = datetime.now(timezone.utc)
    session.add(tarea)
    session.commit()
    session.refresh(tarea)
    return tarea


@router.post("/{tarea_id}/cancelar")
def cancelar_tarea(tarea_id: str, session: Session = Depends(get_session)):
    """Cancelar una tarea pendiente o programada."""
    tarea = session.get(Tarea, tarea_id)
    if not tarea:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    if tarea.estado not in ("pendiente", "programada", "en_espera"):
        raise HTTPException(status_code=400, detail="No se puede cancelar una tarea en este estado")
    tarea.estado = "cancelada"
    from datetime import datetime, timezone
    tarea.updated_at = datetime.now(timezone.utc)
    session.add(tarea)
    session.commit()
    session.refresh(tarea)
    return tarea


@router.get("/estadisticas/resumen")
def resumen_tareas(session: Session = Depends(get_session)):
    """Resumen de tareas por estado."""
    from collections import Counter
    tareas = session.exec(select(Tarea)).all()
    estados = Counter(t.estado for t in tareas)
    return {
        "total": len(tareas),
        "por_estado": dict(estados),
        "pendientes": estados.get("pendiente", 0),
        "en_ejecucion": estados.get("en_ejecucion", 0),
        "completadas": estados.get("completada", 0),
        "fallidas": estados.get("fallida", 0),
    }
