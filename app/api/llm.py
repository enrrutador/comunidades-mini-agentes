"""Endpoints de Proveedores LLM, Modelos y Chat."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.api.schemas import (
    LLMChatRequest,
    LLMChatResponse,
    LLMTestRequest,
    LLMTestResponse,
    ModeloLLMCreate,
    ModeloLLMRead,
    ModeloLLMUpdate,
    ProveedorLLMCreate,
    ProveedorLLMRead,
    ProveedorLLMUpdate,
)
from app.db.models import ModeloLLM, ProveedorLLM
from app.db.session import get_session
from app.services.llm.base import LLMRouter, OpenAICompatibleProvider

router = APIRouter(prefix="/llm", tags=["llm"])

# Router global (singleton por proceso)
_llm_router = LLMRouter()


def _get_provider_instance(proveedor: ProveedorLLM) -> OpenAICompatibleProvider:
    # La API key se lee de env o se pasa por el request; aquí usamos env como fallback
    import os
    api_key = os.getenv(f"{proveedor.nombre.upper().replace(' ', '_')}_API_KEY")
    return OpenAICompatibleProvider(
        name=proveedor.nombre,
        base_url=proveedor.base_url or "",
        api_key=api_key,
    )


# ---------------------------------------------------------------------------
# Proveedores
# ---------------------------------------------------------------------------

@router.get("/proveedores", response_model=List[ProveedorLLMRead])
def listar_proveedores(session: Session = Depends(get_session)):
    return session.exec(select(ProveedorLLM).order_by(ProveedorLLM.prioridad)).all()


@router.post("/proveedores", response_model=ProveedorLLMRead, status_code=status.HTTP_201_CREATED)
def crear_proveedor(payload: ProveedorLLMCreate, session: Session = Depends(get_session)):
    proveedor = ProveedorLLM(**payload.model_dump())
    session.add(proveedor)
    session.commit()
    session.refresh(proveedor)
    return proveedor


@router.get("/proveedores/{proveedor_id}", response_model=ProveedorLLMRead)
def obtener_proveedor(proveedor_id: str, session: Session = Depends(get_session)):
    proveedor = session.get(ProveedorLLM, proveedor_id)
    if not proveedor:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    return proveedor


@router.patch("/proveedores/{proveedor_id}", response_model=ProveedorLLMRead)
def actualizar_proveedor(
    proveedor_id: str,
    payload: ProveedorLLMUpdate,
    session: Session = Depends(get_session),
):
    proveedor = session.get(ProveedorLLM, proveedor_id)
    if not proveedor:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(proveedor, key, value)
    from datetime import datetime, timezone
    proveedor.updated_at = datetime.now(timezone.utc)
    session.add(proveedor)
    session.commit()
    session.refresh(proveedor)
    return proveedor


@router.delete("/proveedores/{proveedor_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_proveedor(proveedor_id: str, session: Session = Depends(get_session)):
    proveedor = session.get(ProveedorLLM, proveedor_id)
    if not proveedor:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    # Eliminar modelos asociados
    modelos = session.exec(select(ModeloLLM).where(ModeloLLM.proveedor_id == proveedor_id)).all()
    for m in modelos:
        session.delete(m)
    session.delete(proveedor)
    session.commit()
    return None


# ---------------------------------------------------------------------------
# Modelos
# ---------------------------------------------------------------------------

@router.get("/modelos", response_model=List[ModeloLLMRead])
def listar_modelos(
    proveedor_id: Optional[str] = None,
    session: Session = Depends(get_session),
):
    query = select(ModeloLLM)
    if proveedor_id:
        query = query.where(ModeloLLM.proveedor_id == proveedor_id)
    return session.exec(query.order_by(ModeloLLM.prioridad)).all()


@router.post("/modelos", response_model=ModeloLLMRead, status_code=status.HTTP_201_CREATED)
def crear_modelo(payload: ModeloLLMCreate, session: Session = Depends(get_session)):
    # Verificar que el proveedor existe
    proveedor = session.get(ProveedorLLM, payload.proveedor_id)
    if not proveedor:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    modelo = ModeloLLM(**payload.model_dump())
    session.add(modelo)
    session.commit()
    session.refresh(modelo)
    return modelo


@router.get("/modelos/{modelo_id}", response_model=ModeloLLMRead)
def obtener_modelo(modelo_id: str, session: Session = Depends(get_session)):
    modelo = session.get(ModeloLLM, modelo_id)
    if not modelo:
        raise HTTPException(status_code=404, detail="Modelo no encontrado")
    return modelo


@router.patch("/modelos/{modelo_id}", response_model=ModeloLLMRead)
def actualizar_modelo(
    modelo_id: str,
    payload: ModeloLLMUpdate,
    session: Session = Depends(get_session),
):
    modelo = session.get(ModeloLLM, modelo_id)
    if not modelo:
        raise HTTPException(status_code=404, detail="Modelo no encontrado")
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(modelo, key, value)
    from datetime import datetime, timezone
    modelo.updated_at = datetime.now(timezone.utc)
    session.add(modelo)
    session.commit()
    session.refresh(modelo)
    return modelo


@router.delete("/modelos/{modelo_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_modelo(modelo_id: str, session: Session = Depends(get_session)):
    modelo = session.get(ModeloLLM, modelo_id)
    if not modelo:
        raise HTTPException(status_code=404, detail="Modelo no encontrado")
    session.delete(modelo)
    session.commit()
    return None


# ---------------------------------------------------------------------------
# Test de conexión
# ---------------------------------------------------------------------------

@router.post("/test", response_model=LLMTestResponse)
async def test_proveedor(payload: LLMTestRequest, session: Session = Depends(get_session)):
    proveedor = session.get(ProveedorLLM, payload.proveedor_id)
    if not proveedor:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")

    instance = _get_provider_instance(proveedor)
    ok = await instance.test_connection()
    modelos = await instance.list_models() if ok else []
    error = None if ok else "No se pudo conectar al proveedor."

    if ok:
        # OJO: /models responde aunque NO haya clave cargada (es público en
        # varios proveedores), así que listar modelos NO prueba nada. La
        # prueba honesta es una llamada de chat real y mínima.
        modelo_prueba = None
        fila = session.exec(
            select(ModeloLLM)
            .where(ModeloLLM.proveedor_id == proveedor.id, ModeloLLM.disponible == True)  # noqa: E712
            .order_by(ModeloLLM.prioridad)
        ).first()
        if fila:
            modelo_prueba = fila.identificador_tecnico
        elif modelos:
            modelo_prueba = modelos[0]
        if modelo_prueba:
            try:
                await instance.chat(
                    messages=[{"role": "user", "content": "hola"}],
                    model=modelo_prueba,
                    max_tokens=1,
                )
            except Exception as e:
                import os

                var_clave = f"{proveedor.nombre.upper().replace(' ', '_')}_API_KEY"
                ok = False
                error = (
                    f"La lista de modelos responde, pero la llamada real al modelo "
                    f"{modelo_prueba} falló: {e}. "
                    f"Clave {var_clave} cargada en el servidor: "
                    f"{'sí' if instance.api_key else 'NO — falta definirla en la celda de Kaggle'}."
                )

    from datetime import datetime, timezone
    proveedor.updated_at = datetime.now(timezone.utc)
    session.add(proveedor)
    session.commit()

    return LLMTestResponse(
        ok=ok,
        modelos_disponibles=modelos,
        error=error,
    )


# ---------------------------------------------------------------------------
# Chat
# ---------------------------------------------------------------------------

@router.post("/chat", response_model=LLMChatResponse)
async def chat(payload: LLMChatRequest, session: Session = Depends(get_session)):
    """
    Ejecutar una llamada de chat con el modelo especificado (o el default).

    Si se pasa modelo_id, se usa ese modelo y su proveedor.
    Si se pasa proveedor_id, se usa el primer modelo disponible de ese proveedor.
    Si no se pasa ninguno, se usa el modelo marcado como default.
    """
    # Resolver modelo y proveedor
    modelo: Optional[ModeloLLM] = None
    proveedor: Optional[ProveedorLLM] = None

    if payload.modelo_id:
        modelo = session.get(ModeloLLM, payload.modelo_id)
        if not modelo:
            raise HTTPException(status_code=404, detail="Modelo no encontrado")
        proveedor = session.get(ProveedorLLM, modelo.proveedor_id)
    elif payload.proveedor_id:
        proveedor = session.get(ProveedorLLM, payload.proveedor_id)
        if not proveedor:
            raise HTTPException(status_code=404, detail="Proveedor no encontrado")
        modelos = session.exec(
            select(ModeloLLM)
            .where(ModeloLLM.proveedor_id == proveedor.id)
            .where(ModeloLLM.disponible == True)
            .order_by(ModeloLLM.prioridad)
        ).all()
        if modelos:
            modelo = modelos[0]
    else:
        # Buscar modelo default (primer disponible por prioridad)
        modelos = session.exec(
            select(ModeloLLM)
            .where(ModeloLLM.disponible == True)
            .order_by(ModeloLLM.prioridad)
        ).all()
        if modelos:
            modelo = modelos[0]
            proveedor = session.get(ProveedorLLM, modelo.proveedor_id)

    if not modelo or not proveedor:
        raise HTTPException(
            status_code=400,
            detail="No hay modelo ni proveedor disponible. Registrá al menos uno.",
        )

    instance = _get_provider_instance(proveedor)
    # Registrar en el router para failover
    _llm_router.register_provider(instance)
    if not _llm_router.default_model:
        _llm_router.default_model = f"{proveedor.nombre}/{modelo.identificador_tecnico}"

    try:
        result = await _llm_router.complete(
            messages=payload.messages,
            model=f"{proveedor.nombre}/{modelo.identificador_tecnico}",
            temperature=payload.temperature,
            max_tokens=payload.max_tokens,
            tools=payload.tools,
        )
        return LLMChatResponse(
            content=result.get("content", ""),
            role=result.get("role", "assistant"),
            model_used=result.get("model_used"),
            provider_used=result.get("provider_used"),
            usage=result.get("usage"),
            finish_reason=result.get("finish_reason"),
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error del proveedor LLM: {e}")
