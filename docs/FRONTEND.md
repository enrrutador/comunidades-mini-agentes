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

---

## Estructura actual

```
web/
├── src/
│   └── app/
│       ├── layout.tsx
│       ├── page.tsx          ← pantalla principal con todas las tabs
│       └── globals.css       ← estilos neón + utilidades
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

## Cómo correr

```bash
cd web
npm install
npm run dev
```

Abrir: http://localhost:3000

---

## Próximos pasos de UI

1. Mejorar animaciones de los beams (más orgánicos)
2. Vista detallada de un personaje (ficha de personalidad)
3. Vista detallada de una comunidad
4. Panel de configuración multiproveedor LLM
5. Conexión real con el backend FastAPI (datos en vivo)
6. Dark/light toggle (opcional)

---

## Notas técnicas

- Next.js 15 + React 18 + Tailwind CSS 3
- Componentes client-side (`"use client"`)
- Sin librerías de grafos todavía (SVG puro + CSS)
- Los datos actuales son mock. Se reemplazarán por llamadas al backend.
