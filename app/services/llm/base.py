"""
Capa de abstracción multiproveedor.

Implementación real: OpenAICompatibleProvider para cualquier proveedor
compatible con la API de OpenAI (OpenAI, OpenRouter, Groq, NVIDIA NIM,
Ollama, vLLM, etc.) + LLMRouter con failover.
"""

import asyncio
from abc import ABC, abstractmethod
from typing import Any, Optional

import httpx


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


class OpenAICompatibleProvider(LLMProvider):
    """Proveedor compatible con la API de OpenAI."""

    def __init__(self, name: str, base_url: str, api_key: Optional[str] = None):
        self.name = name
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key or ""

    def _headers(self) -> dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    async def chat(
        self,
        messages: list[dict[str, str]],
        model: str,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        tools: Optional[list[dict]] = None,
        **kwargs: Any,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
        }
        if max_tokens:
            payload["max_tokens"] = max_tokens
        if tools:
            payload["tools"] = tools

        async with httpx.AsyncClient(timeout=90.0) as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers=self._headers(),
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

        choice = data.get("choices", [{}])[0]
        message = choice.get("message", {})
        return {
            "content": message.get("content", ""),
            "role": message.get("role", "assistant"),
            "tool_calls": message.get("tool_calls"),
            "finish_reason": choice.get("finish_reason"),
            "usage": data.get("usage", {}),
            "model": data.get("model", model),
            "provider": self.name,
        }

    async def test_connection(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    f"{self.base_url}/models",
                    headers=self._headers(),
                )
                return response.status_code == 200
        except Exception:
            return False

    async def list_models(self) -> list[str]:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    f"{self.base_url}/models",
                    headers=self._headers(),
                )
                response.raise_for_status()
                data = response.json()
                return [m.get("id", "") for m in data.get("data", []) if m.get("id")]
        except Exception:
            return []


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

    def unregister_provider(self, name: str) -> None:
        self.providers.pop(name, None)

    def get_provider(self, name: str) -> Optional[LLMProvider]:
        return self.providers.get(name)

    async def complete(
        self,
        messages: list[dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        tools: Optional[list[dict]] = None,
        **kwargs: Any,
    ) -> dict[str, Any]:
        """
        Ejecuta la llamada con failover.

        model puede ser "provider/model" o solo el identificador técnico.
        Si no se especifica, usa default_model.
        Si falla, intenta con fallback_models en orden.
        """
        target = model or self.default_model
        candidates = [target] + [m for m in self.fallback_models if m != target]

        last_error = None
        for candidate in candidates:
            if not candidate:
                continue
            # Parse "provider/model" format
            if "/" in candidate:
                provider_name, model_id = candidate.split("/", 1)
            else:
                provider_name = None
                model_id = candidate
                # Find provider that has this model
                for pname, prov in self.providers.items():
                    provider_name = pname
                    break

            provider = self.providers.get(provider_name) if provider_name else None
            if not provider and self.providers:
                provider = next(iter(self.providers.values()))
                provider_name = provider.name

            if not provider:
                continue

            try:
                result = await provider.chat(
                    messages=messages,
                    model=model_id,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    tools=tools,
                    **kwargs,
                )
                result["model_used"] = model_id
                result["provider_used"] = provider_name
                return result
            except Exception as e:
                last_error = e
                continue

        raise RuntimeError(
            f"Todos los modelos fallaron. Último error: {last_error}"
        )
