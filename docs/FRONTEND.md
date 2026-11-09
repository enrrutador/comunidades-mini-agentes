# Pulse OS · Frontend

Documentación del panel administrativo.

**Última actualización:** 9 de noviembre de 2026

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

---

## Estructura actual

```
web/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx          ← pantalla principal con todas las tabs
│   │   └── globals.css       ← estilos neón + utilidades
│   └── lib/
│       └── api.ts            ← cliente TypeScript del backend
├── package.json
├── tailwind.config.ts
├── postcss.config.mjs
├── tsconfig.json
└── next.config.ts
```

---

## Tabs implementadas

| Tab       | Estado      | Descripción                                      |
|-----------|-------------|--------------------------------------------------|
| **Global**    | Completa    | Mesh central + módulos + comunidades + log       |
| **Bots**      | Completa    | Vista de módulos del sistema (Orquestador, Memory, etc.) |
| **Runs**      | Completa    | Lista de tareas / ejecuciones recientes          |
| **Rules**     | Placeholder | Reglas editoriales y políticas (próximamente)    |
| **Memory**    | Completa    | Entradas de memoria individual / colectiva / episódica |

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

Por ahora los datos de la UI siguen siendo mock. El siguiente paso es reemplazarlos por llamadas reales usando este cliente.

---

## Cómo correr

```bash
cd web
npm install
npm run dev
```

Abrir: http://localhost:3000

Backend (en otra terminal):
```bash
uvicorn app.main:app --reload --port 8000
```

---

## Próximos pasos de UI

1. Reemplazar mocks por datos reales del backend
2. Vista detallada de un personaje (ficha de personalidad)
3. Vista detallada de una comunidad
4. Panel de configuración multiproveedor LLM
5. Mejorar animaciones de los beams

---

## Notas técnicas

- Next.js 15 + React 18 + Tailwind CSS 3
- Componentes client-side (`"use client"`)
- Sin librerías de grafos todavía (SVG puro + CSS)
