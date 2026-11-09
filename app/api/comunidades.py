"""Endpoints de Comunidades."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.api.schemas import ComunidadCreate, ComunidadRead, ComunidadUpdate
from app.db.models import Comunidad
from app.db.session import get_session

router = APIRouter(prefix="/comunidades", tags=["comunidades"])


@router.get("", response_model=List[ComunidadRead])
def listar_comunidades(session: Session = Depends(get_session)):
    comunidades = session.exec(select(Comunidad).order_by(Comunidad.created_at.desc())).all()
    return comunidades


@router.post("", response_model=ComunidadRead, status_code=status.HTTP_201_CREATED)
def crear_comunidad(payload: ComunidadCreate, session: Session = Depends(get_session)):
    comunidad = Comunidad(
        nombre=payload.nombre,
        tematica=payload.tematica,
        descripcion_interna=payload.descripcion_interna,
    )
    session.add(comunidad)
    session.commit()
    session.refresh(comunidad)
    return comunidad


@router.get("/{comunidad_id}", response_model=ComunidadRead)
def obtener_comunidad(comunidad_id: str, session: Session = Depends(get_session)):
    comunidad = session.get(Comunidad, comunidad_id)
    if not comunidad:
        raise HTTPException(status_code=404, detail="Comunidad no encontrada")
    return comunidad


@router.patch("/{comunidad_id}", response_model=ComunidadRead)
def actualizar_comunidad(
    comunidad_id: str,
    payload: ComunidadUpdate,
    session: Session = Depends(get_session),
):
    comunidad = session.get(Comunidad, comunidad_id)
    if not comunidad:
        raise HTTPException(status_code=404, detail="Comunidad no encontrada")

    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(comunidad, key, value)

    from datetime import datetime
    comunidad.updated_at = datetime.utcnow()
    session.add(comunidad)
    session.commit()
    session.refresh(comunidad)
    return comunidad


@router.delete("/{comunidad_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_comunidad(comunidad_id: str, session: Session = Depends(get_session)):
    comunidad = session.get(Comunidad, comunidad_id)
    if not comunidad:
        raise HTTPException(status_code=404, detail="Comunidad no encontrada")
    session.delete(comunidad)
    session.commit()
    return None
