# Pulse OS · Integración Facebook (cuentas y Páginas)

Documento de diseño para la conexión con Facebook Pages.

**Última actualización:** 10 de noviembre de 2026

---

## 1. Objetivo

Permitir que el sistema administre Páginas de Facebook asociadas a personajes, para publicar contenido, comentar, reaccionar e interactuar, respetando los límites de la API y las políticas de la plataforma.

Principios del Documento Maestro que aplican:
- Administración de una cantidad variable de cuentas y Páginas.
- Separación clara: Cuenta / Página / Personaje / Comunidad.
- Identidades modificables (un personaje no queda atado permanentemente a una Página).
- Conectores independientes por plataforma (Facebook primero).

---

## 2. Modelo de relación

```
Cuenta (Facebook user identity)
  └── tiene N → Pagina (Facebook Page)
        └── asignada a 0..1 → Personaje
              └── pertenece a → Comunidad
```

- Una **Cuenta** es una identidad de Facebook (un usuario real o una cuenta de administración) que gestiona una o más Páginas.
- Una **Página** es una Facebook Page con su propio token de acceso.
- Un **Personaje** puede tener 0 o 1 Página asignada.
- Una Página puede reasignarse a otro Personaje sin perder historial.

### Tablas involucradas

| Tabla | Rol |
|-------|-----|
| `cuentas` | Identidad de Facebook + tokens de usuario |
| `paginas` | Facebook Page + token de página + capacidades |
| `personajes` | Personaje con FK opcional a `paginas.id` |
| `comunidades` | Agrupación de personajes |

---

## 3. Facebook App (Meta Developer Console)

### 3.1. Creación de la app

1. Crear una app en [developers.facebook.com](https://developers.facebook.com) con tipo "Business" o "Consumer".
2. Agregar el producto **Facebook Login**.
3. Agregar el producto **Pages API** (o Graph API).
4. Configurar los dominios permitidos (redirect URIs).
5. Anotar `App ID` y `App Secret` (se guardan en `.env` o secret store, nunca en el repo).

### 3.2. Permisos requeridos (scopes OAuth)

| Permiso | Uso |
|---------|-----|
| `pages_show_list` | Listar las Páginas que el usuario administra |
| `pages_read_engagement` | Leer métricas, comentarios y reacciones |
| `pages_manage_posts` | Publicar, editar y eliminar posts |
| `pages_manage_metadata` | Actualizar info de la Página |
| `pages_messaging` (opcional, Fase 4+) | Responder mensajes de Messenger |

### 3.3. App Review

Los permisos avanzados (`pages_manage_posts`, `pages_manage_metadata`) requieren **App Review** de Meta antes de usarse con usuarios reales. Durante desarrollo se puede usar con roles de test (administradores, desarrolladores, testers).

---

## 4. Flujo de autenticación (OAuth 2.0)

### 4.1. Diagrama de flujo

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐     ┌────────────┐
│  Panel   │────▶│  Backend     │────▶│  Facebook    │────▶│  Usuario   │
│  (admin) │     │  (FastAPI)   │     │  OAuth       │     │  (login)   │
└──────────┘     └──────────────┘     └──────────────┘     └────────────┘
                       │                                            │
                       │◀─────────────────────────────────────────────┘
                       │         (redirect con code)
                       ▼
              ┌──────────────────┐
              │  Backend         │
              │  1. code → token │
              │  2. token → LLT  │
              │  3. LLT → Pages  │
              │  4. Guardar todo │
              └──────────────────┘
```

### 4.2. Pasos detallados

**Paso 1 — Inicio desde el panel**
- El admin hace clic en "Conectar cuenta de Facebook".
- El frontend redirige al backend: `GET /api/facebook/login?comunidad_id=...`
- El backend genera un `state` (CSRF token) y redirige a:
  ```
  https://www.facebook.com/v19.0/dialog/oauth?
    client_id={APP_ID}
    &redirect_uri={REDIRECT_URI}
    &scope=pages_show_list,pages_read_engagement,pages_manage_posts,pages_manage_metadata
    &state={STATE}
    &response_type=code
  ```

**Paso 2 — Autorización del usuario**
- El usuario inicia sesión en Facebook (si no lo está) y autoriza la app.
- Facebook redirige a: `{REDIRECT_URI}?code={CODE}&state={STATE}`

**Paso 3 — Intercambio de code por token (backend)**
- El backend valida el `state` (CSRF).
- Llama a:
  ```
  GET https://graph.facebook.com/v19.0/oauth/access_token?
    client_id={APP_ID}
    &redirect_uri={REDIRECT_URI}
    &client_secret={APP_SECRET}
    &code={CODE}
  ```
- Recibe un **short-lived user access token** (~1 hora).

**Paso 4 — Extender a long-lived token (backend)**
- Llama a:
  ```
  GET https://graph.facebook.com/v19.0/oauth/access_token?
    grant_type=fb_exchange_token
    &client_id={APP_ID}
    &client_secret={APP_SECRET}
    &fb_exchange_token={SHORT_LIVED_TOKEN}
  ```
- Recibe un **long-lived user access token** (~60 días).

**Paso 5 — Obtener Páginas administradas (backend)**
- Con el long-lived user token, llama a:
  ```
  GET https://graph.facebook.com/v19.0/me/accounts?
    access_token={LLT}
  ```
- La respuesta incluye cada Página con su **Page access token** (que no expira si se obtiene con un LLT).

**Paso 6 — Persistir (backend)**
- Crear/actualizar registro en `cuentas` con:
  - `nombre_identificador`: nombre del usuario de Facebook.
  - `metodo_autenticacion`: `"facebook_oauth"`.
  - `estado_autorizacion`: `"autorizado"`.
  - `estado_conexion`: `"conectado"`.
  - `ultima_conexion`: now().
  - Token de usuario (long-lived) → almacenado de forma segura (ver §5).
- Para cada Página devuelta, crear/actualizar registro en `paginas` con:
  - `id_plataforma`: ID de la Página en Facebook.
  - `nombre_publico`: nombre de la Página.
  - `url`: URL de la Página.
  - `avatar_url`: foto de perfil.
  - `plataforma`: `"facebook"`.
  - `estado_conexion`: `"conectado"`.
  - `capacidades`: JSON con los permisos disponibles.
  - Token de Página → almacenado de forma segura (ver §5).

**Paso 7 — Redirigir al panel**
- El backend redirige al frontend con un parámetro de éxito: `{FRONTEND_URL}/comunidad?facebook=connected&cuenta_id={ID}`.
- El panel muestra las Páginas disponibles para asignar a personajes.

---

## 4.3. Asignación de Página a Personaje

Desde el panel de Comunidad:

1. El admin selecciona una Página conectada.
2. Selecciona un Personaje (o crea uno nuevo).
3. El backend actualiza `personajes.pagina_id = paginas.id`.
4. El Personaje queda listo para publicar en esa Página.

Reasignación: cambiar `pagina_id` a otra Página o `NULL` (desvincular). El historial de publicaciones se conserva.

---

## 5. Almacenamiento seguro de tokens

### 5.1. Principio

Los tokens **nunca** se almacenan en texto plano en la base de datos principal ni se exponen al LLM ni al frontend.

### 5.2. Opciones de implementación

| Opción | Descripción | Recomendación |
|--------|-------------|---------------|
| **A. Columna cifrada en DB** | Usar `cryptography` (Fernet) con una clave maestra en `.env`. Tokens cifrados at-rest. | Fase 1-2 (desarrollo) |
| **B. Secret manager** | AWS Secrets Manager, GCP Secret Manager, o HashiCorp Vault. | Fase 3+ (producción) |
| **C. Tabla separada** | Tabla `tokens` con relación a `cuentas`/`paginas`, cifrada. | Alternativa a A |

### 5.3. Implementación recomendada (Fase 1-2)

- Agregar un campo `token_cifrado` (Text) a `cuentas` y `paginas`.
- Usar `cryptography.fernet.Fernet` con `TOKEN_ENCRYPTION_KEY` en `.env`.
- Nunca loguear tokens ni incluirlos en respuestas de API.
- El LLM y el frontend solo ven `estado_conexion` y `nombre_publico`, nunca el token.

### 5.4. Campos a agregar en los modelos

```python
# En Cuenta:
token_usuario_cifrado: Optional[str] = Field(default=None, sa_column=Column(Text))
token_expira: Optional[datetime] = None  # None si es long-lived

# En Pagina:
token_pagina_cifrado: Optional[str] = Field(default=None, sa_column=Column(Text))
token_expira: Optional[datetime] = None  # None para page tokens (no expiran)
```

---

## 6. Ciclo de vida de los tokens

### 6.1. Tipos de token

| Token | Duración | Renovación |
|-------|----------|------------|
| Short-lived user token | ~1 hora | Se descarta después de obtener el LLT |
| Long-lived user token | ~60 días | Se renueva con el flujo de refresh |
| Page access token | No expira (si se obtiene con LLT) | Se re-obtiene si se invalida |

### 6.2. Refresh automático

Un worker periódico (cron o tarea programada) debe:

1. Listar cuentas con `token_expira` dentro de los próximos 7 días.
2. Intentar renovar el long-lived token con el flujo `fb_exchange_token`.
3. Si falla, marcar `estado_conexion = "error"` y `estado_autorizacion = "expirado"`.
4. Notificar al admin (log + alerta en el panel).

### 6.3. Invalidación

Si un token se invalida (usuario revoca permisos, app desactivada, etc.):
- Las llamadas a Graph API devuelven error 190 (Invalid OAuth access token).
- El conector marca la Cuenta/Página como `estado_conexion = "error"`.
- El sistema no reintenta automáticamente; espera intervención del admin.
- Se registra el error en el log de actividad.

---

## 7. Conector de Facebook (adaptador)

### 7.1. Estructura

```
app/
├── connectors/
│   └── facebook/
│       ├── __init__.py
│       ├── client.py       # Wrapper de Graph API
│       ├── auth.py         # Flujo OAuth
│       ├── publisher.py    # Publicar posts, comentarios, reacciones
│       └── reader.py       # Leer posts, comentarios, métricas
```

### 7.2. Interfaz del conector

```python
class FacebookConnector:
    def __init__(self, page_token: str):
        self.token = page_token
        self.base_url = "https://graph.facebook.com/v19.0"

    async def publish_post(self, page_id: str, message: str, media: Optional[dict] = None) -> dict:
        ...

    async def publish_comment(self, object_id: str, message: str) -> dict:
        ...

    async def react(self, object_id: str, reaction_type: str) -> dict:
        ...

    async def get_page_posts(self, page_id: str, limit: int = 10) -> list[dict]:
        ...

    async def get_post_comments(self, post_id: str, limit: int = 50) -> list[dict]:
        ...
```

### 7.3. Rate limits

Facebook Graph API tiene límites por app y por usuario. El conector debe:
- Respetar los headers `X-App-Usage` y `X-Page-Usage`.
- Implementar backoff exponencial.
- Encolar acciones en la cola de tareas, no ejecutarlas sincrónicamente.

---

## 8. Endpoints de backend necesarios

### Autenticación Facebook

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/facebook/login` | Redirige a Facebook OAuth (query: `comunidad_id`) |
| GET | `/api/facebook/callback` | Callback OAuth, procesa code y guarda tokens |
| GET | `/api/facebook/cuentas` | Listar cuentas conectadas |
| GET | `/api/facebook/cuentas/{id}/paginas` | Listar Páginas de una cuenta |
| DELETE | `/api/facebook/cuentas/{id}` | Desconectar cuenta (revoca tokens) |
| PATCH | `/api/facebook/paginas/{id}/asignar` | Asignar Página a un Personaje |

### Publicación (usado por el orquestador, no por el panel)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/facebook/publicar` | Publicar post en una Página |
| POST | `/api/facebook/comentar` | Comentar en un post |
| POST | `/api/facebook/reaccionar` | Reaccionar a un post/comentario |

---

## 9. Flujo completo de ejemplo

1. Admin abre el panel → tab Comunidad → "Conectar Facebook".
2. Se redirige a Facebook → inicia sesión → autoriza.
3. Callback al backend → se guardan Cuenta + Páginas.
4. Panel muestra las Páginas disponibles.
5. Admin asigna "Comunidad Gatos" (Página) a personaje "Luna".
6. El orquestador recibe una tarea: "Publicá un post sobre adopción en la Página de Luna".
7. El conector usa el token de la Página para publicar vía Graph API.
8. Se registra la tarea como completada con el ID del post.

---

## 10. Seguridad

- **Tokens cifrados at-rest** (Fernet o secret manager).
- **Tokens nunca en logs, respuestas de API ni conversaciones del LLM.**
- **CSRF protection** en el flujo OAuth (parámetro `state`).
- **Validación de redirect URI** (solo URIs registradas en Meta).
- **Rate limiting** en endpoints de autenticación.
- **Revocación**: al desconectar una cuenta, se intenta revocar el token en Facebook (`DELETE /me/permissions`).
- **Auditoría**: cada acción de publicación se registra con personaje, Página, timestamp y resultado.

---

## 11. Variables de entorno necesarias

```env
# Facebook App
FACEBOOK_APP_ID=tu_app_id
FACEBOOK_APP_SECRET=tu_app_secret
FACEBOOK_REDIRECT_URI=http://localhost:8000/api/facebook/callback

# Cifrado de tokens
TOKEN_ENCRYPTION_KEY=clave_fernet_base64

# Frontend
FRONTEND_URL=http://localhost:3000
```

---

## 12. Próximos pasos

1. Crear la Facebook App en Meta Developer Console.
2. Agregar campos de token cifrado a los modelos `Cuenta` y `Pagina`.
3. Implementar el flujo OAuth en FastAPI.
4. Crear el conector de Facebook (client + publisher + reader).
5. Agregar endpoints de autenticación y publicación.
6. Actualizar el frontend (tab Comunidad) para mostrar Páginas conectadas y permitir asignación.
7. Implementar refresh automático de tokens (worker).
8. Tests con una Página de prueba.
9. App Review para permisos de producción.
