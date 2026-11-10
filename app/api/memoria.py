"""Endpoints de Memoria del mesh."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.api.schemas import MemoryCreate, MemoryRead, MemoryUpdate
from app.db.models import MemoryEntry, MemoryScope
from app.db.session import get_session

router = APIRouter(prefix="/memoria", tags=["memoria"])


@router.get("", response_model=List[MemoryRead])
def listar_memoria(
    scope: Optional[str] = None,
    comunidad_id: Optional[str] = None,
    personaje_id: Optional[str] = None,
    session: Session = Depends(get_session),
):
    query = select(MemoryEntry)
    if scope:
        query = query.where(MemoryEntry.scope == scope)
    if comunidad_id:
        query = query.where(MemoryEntry.comunidad_id == comunidad_id)
    if personaje_id:
        query = query.where(MemoryEntry.personaje_id == personaje_id)
    return session.exec(query.order_by(MemoryEntry.created_at.desc())).all()


@router.get("/buscar", response_model=List[MemoryRead])
def buscar_memoria(
    q: str = Query(..., min_length=1),
    scope: Optional[str] = None,
    comunidad_id: Optional[str] = None,
    session: Session = Depends(get_session),
):
    """Buscar memorias por texto en el resumen."""
    query = select(MemoryEntry).where(MemoryEntry.summary.contains(q))
    if scope:
        query = query.where(MemoryEntry.scope == scope)
    if comunidad_id:
        query = query.where(MemoryEntry.comunidad_id == comunidad_id)
    return session.exec(query.order_by(MemoryEntry.created_at.desc())).all()


@router.post("", response_model=MemoryRead, status_code=201)
def crear_memoria(payload: MemoryCreate, session: Session = Depends(get_session)):
    entry = MemoryEntry(**payload.model_dump())
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry


@router.get("/{memory_id}", response_model=MemoryRead)
def obtener_memoria(memory_id: str, session: Session = Depends(get_session)):
    entry = session.get(MemoryEntry, memory_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Memoria no encontrada")
    return entry


@router.patch("/{memory_id}", response_model=MemoryRead)
def actualizar_memoria(
    memory_id: str,
    payload: MemoryUpdate,
    session: Session = Depends(get_session),
):
    entry = session.get(MemoryEntry, memory_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Memoria no encontrada")
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(entry, key, value)
    from datetime import datetime, timezone
    entry.updated_at = datetime.now(timezone.utc)
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry


@router.delete("/{memory_id}", status_code=204)
def eliminar_memoria(memory_id: str, session: Session = Depends(get_session)):
    entry = session.get(MemoryEntry, memory_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Memoria no encontrada")
    session.delete(entry)
    session.commit()
    return None


@router.get("/buscar", response_model=List[MemoryRead])
def buscar_memoria(
    q: str = Query(..., min_length=1),
    scope: Optional[str] = None,
    comunidad_id: Optional[str] = None,
    session: Session = Depends(get_session),
):
    """Buscar memorias por texto en el resumen."""
    query = select(MemoryEntry).where(MemoryEntry.summary.contains(q))
    if scope:
        query = query.where(MemoryEntry.scope == scope)
    if comunidad_id:
        query = query.where(MemoryEntry.comunidad_id == comunidad_id)
    return session.exec(query.order_by(MemoryEntry.created_at.desc())).all()
