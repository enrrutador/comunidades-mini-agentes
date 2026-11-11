"""
Conector de Facebook basado en navegador (Playwright).

Toda la interacción se hace a través de un navegador real.
No se usa ninguna API de Facebook.

Requiere: pip install playwright && playwright install chromium
"""

import asyncio
import json
import logging
import random
from typing import Optional

logger = logging.getLogger(__name__)

try:
    from playwright.async_api import async_playwright, Browser, BrowserContext, Page
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False
    logger.warning("Playwright no está instalado. El conector de Facebook no funcionará.")


class FacebookBrowserConnector:
    """Conector de Facebook vía navegador (Playwright)."""

    def __init__(self, storage_state: Optional[dict] = None, proxy: Optional[str] = None):
        self.storage_state = storage_state
        self.proxy = proxy
        self._playwright = None
        self._browser: Optional["Browser"] = None
        self._context: Optional["BrowserContext"] = None
        self._page: Optional["Page"] = None

    async def start(self):
        """Iniciar el navegador y crear un contexto."""
        if not PLAYWRIGHT_AVAILABLE:
            raise RuntimeError("Playwright no está instalado. Ejecutá: pip install playwright && playwright install chromium")

        self._playwright = await async_playwright().start()
        self._browser = await self._playwright.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled"],
        )
        context_opts = {
            "viewport": {"width": 1280, "height": 800},
            "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        }
        if self.storage_state:
            context_opts["storage_state"] = self.storage_state
        if self.proxy:
            context_opts["proxy"] = {"server": self.proxy}

        self._context = await self._browser.new_context(**context_opts)
        self._page = await self._context.new_page()

    async def close(self):
        """Cerrar el navegador."""
        if self._context:
            await self._context.close()
        if self._browser:
            await self._browser.close()
        if self._playwright:
            await self._playwright.stop()

    async def get_storage_state(self) -> dict:
        """Exportar el storage state actual (cookies + localStorage)."""
        if not self._context:
            raise RuntimeError("Contexto no iniciado. Llamá a start() primero.")
        return await self._context.storage_state()

    async def is_logged_in(self) -> bool:
        """Verificar si la sesión sigue activa."""
        if not self._page:
            return False
        try:
            await self._page.goto("https://www.facebook.com/", wait_until="domcontentloaded", timeout=15000)
            await asyncio.sleep(2)
            # Buscar indicador de sesión activa
            cookies = await self._context.cookies("https://www.facebook.com")
            return any(c["name"] == "c_user" for c in cookies)
        except Exception:
            return False

    async def login(self, email: str, password: str, totp_secret: Optional[str] = None) -> bool:
        """Iniciar sesión en Facebook con credenciales."""
        from app.services.browser.selectors import SELECTORS as S

        if not self._page:
            await self.start()

        try:
            await self._page.goto("https://www.facebook.com/login", wait_until="domcontentloaded", timeout=15000)
            await asyncio.sleep(1)

            await self._page.fill(S["login_email"], email)
            await asyncio.sleep(random.uniform(0.5, 1.5))
            await self._page.fill(S["login_password"], password)
            await asyncio.sleep(random.uniform(0.5, 1.5))
            try:
                await self._page.click(S["login_button"], timeout=8000)
            except Exception:
                try:
                    await self._page.click("button[type='submit']", timeout=8000)
                except Exception:
                    await self._page.press(S["login_password"], "Enter")
            await asyncio.sleep(4)

            # Manejar 2FA
            if totp_secret:
                try:
                    import pyotp
                    totp = pyotp.TOTP(totp_secret)
                    code = totp.now()
                    await self._page.fill(S["login_2fa_code"], code)
                    await self._page.click(S["login_2fa_submit"])
                    await asyncio.sleep(3)
                except Exception:
                    pass

            # Verificar login exitoso
            logged_in = await self.is_logged_in()
            if logged_in:
                logger.info("Login exitoso en Facebook")
            else:
                logger.warning("Login fallido o checkpoint detectado")
            return logged_in
        except Exception as e:
            logger.error(f"Error en login: {e}")
            return False

    async def _human_delay(self, min_s: float = 2.0, max_s: float = 5.0):
        """Delay aleatorio para simular comportamiento humano."""
        await asyncio.sleep(random.uniform(min_s, max_s))

    async def publish_post(self, page_url: str, message: str) -> dict:
        """Publicar un post en una Página de Facebook."""
        from app.services.browser.selectors import SELECTORS as S

        if not self._page:
            raise RuntimeError("Navegador no iniciado")

        try:
            await self._page.goto(page_url, wait_until="domcontentloaded", timeout=15000)
            await self._human_delay(2, 4)

            # Clic en "Crear publicación"
            create_btn = await self._page.query_selector(S["create_post_button"])
            if create_btn:
                await create_btn.click()
                await self._human_delay(1, 2)

            # Escribir mensaje
            textarea = await self._page.query_selector(S["post_textarea"])
            if textarea:
                await textarea.click()
                await self._page.keyboard.type(message, delay=random.randint(50, 150))
                await self._human_delay(1, 2)

            # Publicar
            publish_btn = await self._page.query_selector(S["publish_button"])
            if publish_btn:
                await publish_btn.click()
                await self._human_delay(2, 4)

            return {"status": "publicado", "message": message[:50]}
        except Exception as e:
            logger.error(f"Error al publicar: {e}")
            return {"status": "error", "error": str(e)}

    async def publish_comment(self, post_url: str, message: str) -> dict:
        """Comentar en un post de Facebook."""
        from app.services.browser.selectors import SELECTORS as S

        if not self._page:
            raise RuntimeError("Navegador no iniciado")

        try:
            await self._page.goto(post_url, wait_until="domcontentloaded", timeout=15000)
            await self._human_delay(2, 4)

            comment_btn = await self._page.query_selector(S["comment_button"])
            if comment_btn:
                await comment_btn.click()
                await self._human_delay(1, 2)

            comment_input = await self._page.query_selector(S["comment_input"])
            if comment_input:
                await comment_input.click()
                await self._page.keyboard.type(message, delay=random.randint(50, 150))
                await self._human_delay(0.5, 1.5)
                await self._page.keyboard.press("Enter")
                await self._human_delay(1, 2)

            return {"status": "comentado", "message": message[:50]}
        except Exception as e:
            logger.error(f"Error al comentar: {e}")
            return {"status": "error", "error": str(e)}

    async def react(self, object_url: str, reaction_type: str = "like") -> dict:
        """Reaccionar a un post o comentario."""
        from app.services.browser.selectors import SELECTORS as S

        if not self._page:
            raise RuntimeError("Navegador no iniciado")

        try:
            await self._page.goto(object_url, wait_until="domcontentloaded", timeout=15000)
            await self._human_delay(2, 4)

            # Mapeo de tipo de reacción a selector
            reaction_map = {
                "like": S["like_button"],
                "love": S["reaction_love"],
                "haha": S["reaction_haha"],
                "wow": S["reaction_wow"],
                "sad": S["reaction_sad"],
                "angry": S["reaction_angry"],
            }

            if reaction_type == "like":
                like_btn = await self._page.query_selector(S["like_button"])
                if like_btn:
                    await like_btn.click()
            else:
                # Hover para mostrar picker
                like_btn = await self._page.query_selector(S["like_button"])
                if like_btn:
                    await like_btn.hover()
                    await self._human_delay(0.5, 1)
                    selector = reaction_map.get(reaction_type)
                    if selector:
                        reaction_btn = await self._page.query_selector(selector)
                        if reaction_btn:
                            await reaction_btn.click()

            await self._human_delay(1, 2)
            return {"status": "reaccionado", "tipo": reaction_type}
        except Exception as e:
            logger.error(f"Error al reaccionar: {e}")
            return {"status": "error", "error": str(e)}

    async def get_page_posts(self, page_url: str, limit: int = 10) -> list[dict]:
        """Leer posts de una Página de Facebook."""
        from app.services.browser.selectors import SELECTORS as S

        if not self._page:
            raise RuntimeError("Navegador no iniciado")

        posts = []
        try:
            await self._page.goto(page_url, wait_until="domcontentloaded", timeout=15000)
            await self._human_delay(2, 4)

            # Scroll para cargar más posts
            for _ in range(min(limit // 3, 5)):
                await self._page.evaluate("window.scrollBy(0, window.innerHeight)")
                await self._human_delay(1, 2)

            # Extraer posts
            post_elements = await self._page.query_selector_all(S["post_container"])
            for el in post_elements[:limit]:
                try:
                    text_el = await el.query_selector(S["post_text"])
                    text = await text_el.inner_text() if text_el else ""
                    author_el = await el.query_selector(S["post_author"])
                    author = await author_el.inner_text() if author_el else ""
                    posts.append({"author": author, "text": text})
                except Exception:
                    continue

            return posts
        except Exception as e:
            logger.error(f"Error al leer posts: {e}")
            return posts

    async def take_screenshot(self) -> bytes:
        """Tomar screenshot de la página actual."""
        if not self._page:
            raise RuntimeError("Navegador no iniciado")
        return await self._page.screenshot()
