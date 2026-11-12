/**
 * ELIMINADO — sistema LLM local del navegador.
 *
 * Antes este módulo llamaba a los proveedores desde el navegador con
 * claves guardadas en localStorage (vía la ruta /api/llm de Next).
 * Esa vía corría en paralelo a los proveedores del backend y fallaba
 * en silencio: el usuario configuraba el proveedor en el servidor y
 * el chat no respondía nada.
 *
 * La ÚNICA fuente de verdad ahora es el backend:
 * - Proveedores y modelos: /api/llm/proveedores y /api/llm/modelos
 * - Probar conexión: testProveedor() de "@/lib/api"
 * - Chat: chatLLM() de "@/lib/api" (POST /api/llm/chat)
 *
 * Este archivo queda como stub documental; ningún código lo importa.
 */
export {};
