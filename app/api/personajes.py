"""Endpoints de Personajes."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from app.api.schemas import PersonajeCreate, PersonajeRead, PersonajeUpdate
from app.db.models import Comunidad, Personaje
from app.db.session import get_session

router = APIRouter(prefix="/personajes", tags=["personajes"])


@router.get("", response_model=List[PersonajeRead])
def listar_personajes(
    comunidad_id: Optional[str] = Query(None),
    session: Session = Depends(get_session),
):
    query = select(Personaje)
    if comunidad_id:
        query = query.where(Personaje.comunidad_id == comunidad_id)
    personajes = session.exec(query.order_by(Personaje.created_at.desc())).all()
    return personajes


@router.post("", response_model=PersonajeRead, status_code=status.HTTP_201_CREATED)
def crear_personaje(payload: PersonajeCreate, session: Session = Depends(get_session)):
    # Validar que la comunidad exista
    comunidad = session.get(Comunidad, payload.comunidad_id)
    if not comunidad:
        raise HTTPException(status_code=400, detail="Comunidad no encontrada")

    personaje = Personaje(
        nombre=payload.nombre,
        apellido=payload.apellido,
        comunidad_id=payload.comunidad_id,
        biografia_interna=payload.biografia_interna,
        estilo_linguistico=payload.estilo_linguistico,
        avatar_url=payload.avatar_url,
        personalidad=payload.personalidad,
        nivel_actividad=payload.nivel_actividad,
    )
    session.add(personaje)
    session.commit()
    session.refresh(personaje)
    return personaje


@router.get("/{personaje_id}", response_model=PersonajeRead)
def obtener_personaje(personaje_id: str, session: Session = Depends(get_session)):
    personaje = session.get(Personaje, personaje_id)
    if not personaje:
        raise HTTPException(status_code=404, detail="Personaje no encontrado")
    return personaje


@router.patch("/{personaje_id}", response_model=PersonajeRead)
def actualizar_personaje(
    personaje_id: str,
    payload: PersonajeUpdate,
    session: Session = Depends(get_session),
):
    personaje = session.get(Personaje, personaje_id)
    if not personaje:
        raise HTTPException(status_code=404, detail="Personaje no encontrado")

    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(personaje, key, value)

    from datetime import datetime
    personaje.updated_at = datetime.utcnow()
    session.add(personaje)
    session.commit()
    session.refresh(personaje)
    return personaje


@router.delete("/{personaje_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_personaje(personaje_id: str, session: Session = Depends(get_session)):
    personaje = session.get(Personaje, personaje_id)
    if not personaje:
        raise HTTPException(status_code=404, detail="Personaje no encontrado")
    session.delete(personaje)
    session.commit()
    return None
