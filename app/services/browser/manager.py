"""
Browser Manager: gestión de pool de navegadores para múltiples cuentas.

Mantiene un pool de BrowserContexts de Playwright, uno por cuenta.
Cada contexto es aislado (cookies, storage, cache independientes).
"""

import asyncio
import json
import logging
from typing import Optional

from app.services.browser.facebook import FacebookBrowserConnector, PLAYWRIGHT_AVAILABLE

logger = logging.getLogger(__name__)


class BrowserManager:
    """Gestor de pool de navegadores para manejo simultáneo de cuentas."""

    def __init__(self, pool_size: int = 5, headless: bool = True):
        self.pool_size = pool_size
        self.headless = headless
        self._contexts: dict[str, FacebookBrowserConnector] = {}
        self._lock = asyncio.Lock()

    async def get_connector(self, cuenta_id: str, storage_state: Optional[dict] = None, proxy: Optional[str] = None) -> FacebookBrowserConnector:
        """Obtener o crear un conector para una cuenta."""
        async with self._lock:
            if cuenta_id in self._contexts:
                connector = self._contexts[cuenta_id]
                # Verificar que sigue vivo
                try:
                    if await connector.is_logged_in():
                        return connector
                except Exception:
                    pass
                # Si no está vivo, cerrar y recrear
                try:
                    await connector.close()
                except Exception:
                    pass
                del self._contexts[cuenta_id]

            connector = FacebookBrowserConnector(storage_state=storage_state, proxy=proxy)
            await connector.start()
            self._contexts[cuenta_id] = connector
            return connector

    async def release(self, cuenta_id: str):
        """Liberar un conector (no lo cierra, solo lo marca como disponible)."""
        pass  # Los contextos se mantienen para reutilización

    async def close_all(self):
        """Cerrar todos los contextos."""
        async with self._lock:
            for cid, connector in self._contexts.items():
                try:
                    await connector.close()
                except Exception as e:
                    logger.error(f"Error cerrando contexto {cid}: {e}")
            self._contexts.clear()

    async def close(self, cuenta_id: str):
        """Cerrar el contexto de una cuenta específica."""
        async with self._lock:
            if cuenta_id in self._contexts:
                try:
                    await self._contexts[cuenta_id].close()
                except Exception as e:
                    logger.error(f"Error cerrando contexto {cuenta_id}: {e}")
                del self._contexts[cuenta_id]

    def active_count(self) -> int:
        return len(self._contexts)


# Singleton global
_browser_manager: Optional[BrowserManager] = None


def get_browser_manager(pool_size: int = 5, headless: bool = True) -> BrowserManager:
    global _browser_manager
    if _browser_manager is None:
        _browser_manager = BrowserManager(pool_size=pool_size, headless=headless)
    return _browser_manager
