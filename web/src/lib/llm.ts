import type { ProviderConfig, Settings } from "./types";

export function isLocalUrl(url: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d+)?/i.test(url);
}

export function activeProvider(settings: Settings): ProviderConfig | undefined {
  return (
    settings.providers.find(
      (provider) => provider.id === settings.activeProviderId,
    ) ?? settings.providers.find((provider) => provider.enabled)
  );
}

export function llmConfigured(settings: Settings): boolean {
  const provider = activeProvider(settings);
  if (!provider) return false;
  if (!provider.baseUrl.trim()) return false;
  if (provider.models && provider.models.length > 0) return true;
  return Boolean(provider.model.trim()) || Boolean(provider.apiKey.trim());
}

interface LLMResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: string;
}

async function readJson(response: Response): Promise<LLMResponse> {
  const text = await response.text();
  try {
    return JSON.parse(text) as LLMResponse;
  } catch {
    return { error: text.slice(0, 300) || `HTTP ${response.status}` };
  }
}

export async function callLLM(
  prompt: string,
  settings: Settings,
  options?: { system?: string; maxTokens?: number; model?: string },
): Promise<string> {
  const provider = activeProvider(settings);
  if (!provider) throw new Error("No hay un proveedor LLM activo.");

  const model =
    options?.model ?? provider.model ?? provider.models?.[0] ?? "";
  if (!model.trim()) {
    throw new Error(
      "Elegí un modelo en la caja de chat (probá la conexión en ⚙ para cargar la lista).",
    );
  }

  const system =
    options?.system ??
    "Sos el orquestador de Pulse OS, un mesh de mini-agentes para comunidades sociales. Respondé en español, breve y accionable. Proponé un plan de unidades concretas para los bots y marcá qué requiere aprobación humana.";

  const response = await fetch("/api/llm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKey,
      model,
      temperature: settings.temperature,
      maxTokens: options?.maxTokens ?? settings.maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    }),
  });

  const data = await readJson(response);
  if (!response.ok) {
    throw new Error(data.error || `El proveedor respondió HTTP ${response.status}`);
  }
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("El proveedor devolvió una respuesta vacía.");
  return content;
}

export async function testProvider(
  provider: ProviderConfig,
): Promise<{ ok: boolean; models: string[] }> {
  const response = await fetch("/api/llm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      test: true,
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKey,
    }),
  });
  const data = (await readJson(response)) as LLMResponse & { models?: string[] };
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }
  return { ok: true, models: data.models ?? [] };
}
