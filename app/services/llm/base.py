"""
Capa de abstracción multiproveedor.

Objetivo: poder cambiar de proveedor o modelo sin modificar la lógica central
ni perder personalidades / memorias (que viven en la base de datos del proyecto).
"""

from abc import ABC, abstractmethod
from typing import Any, Optional


class LLMProvider(ABC):
    """Interfaz común para cualquier proveedor de LLM."""

    name: str

    @abstractmethod
    async def chat(
        self,
        messages: list[dict[str, str]],
        model: str,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        tools: Optional[list[dict]] = None,
        **kwargs: Any,
    ) -> dict[str, Any]:
        """Realiza una llamada de chat. Devuelve respuesta normalizada."""
        ...

    @abstractmethod
    async def test_connection(self) -> bool:
        """Verifica que el proveedor responde."""
        ...


class LLMRouter:
    """
    Enrutador inteligente + failover.

    - Selección manual o automática según tipo de tarea / costo / disponibilidad.
    - Cambio automático a modelo alternativo ante error o límite.
    - Registro del modelo utilizado.
    """

    def __init__(self):
        self.providers: dict[str, LLMProvider] = {}
        self.default_model: Optional[str] = None
        self.fallback_models: list[str] = []

    def register_provider(self, provider: LLMProvider) -> None:
        self.providers[provider.name] = provider

    async def complete(
        self,
        messages: list[dict[str, str]],
        model: Optional[str] = None,
        **kwargs: Any,
    ) -> dict[str, Any]:
        """
        Ejecuta la llamada con failover.
        model puede ser "provider/model" o solo el identificador técnico.
        """
        # Implementación completa en siguientes commits
        raise NotImplementedError("Enrutador en construcción — Fase 2")
