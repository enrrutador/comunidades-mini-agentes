# Pulse OS · Frontend

Documentación del panel administrativo.

**Última actualización:** 10 de noviembre de 2026

---

## Visión de diseño

La interfaz de **Pulse OS** está inspirada en interfaces tipo *neural mesh / agent control center* (referencias: Grok Bot Mesh / Altair AI).

Características visuales clave:

- Fondo casi negro (`#050508`)
- Tarjetas con bordes neón de colores distintos
- Grafo central con nodos y haces de energía (SVG animados)
- Header con tabs + contadores en vivo + indicador LIVE
- Tipografía monoespaciada para logs y estados
- Estética “sistema vivo”
- Hover glow más intenso en las tarjetas
- Layout responsive: en móvil el mesh, el output y el composer se apilan; el log queda fijo sobre el composer

---

## Estructura actual

```
web/
├── src/
│   ├── app/
│   │   ├── api/llm/route.ts  ← proxy LLM OpenAI-compatible
│   │   ├── layout.tsx
│   │   ├── page.tsx          ← estado global, simulación de runs y tabs
│   │   └── globals.css       ← estilos neón + utilidades
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── GlobalView.tsx
│   │   ├── BotsView.tsx
│   │   ├── RunsView.tsx
│   │   ├── RulesView.tsx
│   │   ├── MemoryView.tsx
│   │   ├── CommunityView.tsx
│   │   ├── MeshGraph.tsx
│   │   ├── BotCard.tsx
│   │   ├── CharacterCard.tsx
│   │   ├── OutputPanel.tsx
│   │   ├── Composer.tsx
│   │   ├── LogStrip.tsx
│   │   ├── SettingsModal.tsx
│   │   └── ui.tsx
│   └── lib/
│       ├── api.ts            ← cliente TypeScript del backend
│       ├── data.ts           ← módulos, bots, comunidades y personajes semilla
│       ├── types.ts
│       ├── theme.ts
│       ├── llm.ts
│       └── useStored.ts      ← persistencia en localStorage
├── package.json
├── tailwind.config.ts
├── postcss.config.mjs
├── tsconfig.json
└── next.config.ts
```

---

## Tabs implementadas

| Tab           | Estado   | Descripción                                                       |
|---------------|----------|-------------------------------------------------------------------|
| **Global**    | Completa | Mesh central, filtros, tarjetas de bots/personajes, output y composer |
| **Bots**      | Completa | Módulos del sistema y bots de workflow, búsqueda y edición         |
| **Runs**      | Completa | Historial de corridas, modelo usado y verificación                |
| **Rules**     | Completa | Reglas editoriales y políticas editables                          |
| **Memory**    | Completa | Memoria individual, colectiva, episódica y semántica              |
| **Comunidad** | Completa | Comunidades, personajes y cuentas de Página                       |

### Funcionalidad destacada

- **Mesh Global** con filtros *Todo / Módulos / Bots / Personajes*.
- **Bots** (8 módulos + 15 de workflow) con configuración de instrucciones, modelo override, loops, verificación y conexión al mesh.
- **Personajes** editables (estado, actividad, bio, temperamento, temas) por comunidad.
- **Composer** para enviar una tarea al orquestador; simula el task graph y muestra unidades verificadas/rechazadas.
- **Configuración multiproveedor** (OpenAI, OpenRouter, Groq, NVIDIA NIM, Ollama local y custom), con test de conexión y proveedor activo.
- **LLM real** mediante proxy interno; si no hay API key, se usa un plan demo local.
- **Persistencia local** de configuración, bots, reglas, memoria, personajes, cuentas, runs y workspace.

---

## Flujo del LLM

El panel llama a `POST /api/llm` (route handler de Next.js) con:

- `baseUrl`, `apiKey`, `model`, `messages`, `temperature`, `maxTokens`.

El proxy reenvía a `${baseUrl}/chat/completions` (formato OpenAI) y devuelve la respuesta sin persistir la API key. Para probar un proveedor usa `{ "test": true, "baseUrl": "...", "apiKey": "..." }`, que consulta `${baseUrl}/models`.

La API key se guarda sólo en `localStorage` del navegador. Si el proveedor es local (`localhost` / `127.0.0.1`), no se exige key.

---

## Persistencia

Claves usadas en `localStorage`:

```
pulse.settings.v1
pulse.bots.v1
pulse.rules.v1
pulse.memory.v1
pulse.characters.v1
pulse.communities.v1
pulse.accounts.v1
pulse.runs.v1
pulse.workspace.v1
```

Para volver a los datos semilla, borrar esas claves y recargar.

---

## Conexión con el backend

El cliente está en `src/lib/api.ts`.

```ts
import { listComunidades, listPersonajes, createComunidad } from "@/lib/api";
```

Variable de entorno (crear `.env.local` en `web/`):

```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

Por ahora los datos de la UI siguen siendo locales/mock. El siguiente paso es reemplazarlos por llamadas reales usando este cliente.

---

## Cómo correr

```bash
cd web
npm install
npm run dev
```

Abrir: http://localhost:3000

Build de producción:

```bash
cd web
npm run build
npm run start
```

Backend (en otra terminal):
```bash
uvicorn app.main:app --reload --port 8000
```

---

## Próximos pasos de UI

1. Reemplazar mocks por datos reales del backend (comunidades y personajes).
2. Persistir reglas, memoria y runs en la base de datos.
3. Conectar el composer a la cola real de tareas (Fase 2).
4. Vista detallada de un personaje y de una comunidad.
5. Mejorar animaciones de los beams y el grafo de relaciones.

---

## Notas técnicas

- Next.js 15 + React 18 + Tailwind CSS 3
- Componentes client-side (`"use client"`)
- Sin librerías de grafos todavía (SVG puro + CSS)
- La simulación de runs usa timers del cliente; el LLM real corre en paralelo y no bloquea el task graph
- Responsive: layout de 3 columnas en desktop (mesh · bots · output); en móvil se apila mesh → filtros/bots → output, con log y composer fijos abajo
