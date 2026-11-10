import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface LLMRequest {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  messages?: Array<{ role: string; content: string }>;
  temperature?: number;
  maxTokens?: number;
  test?: boolean;
}

function normalizeBase(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function upstreamError(text: string, status: number): string {
  try {
    const data = JSON.parse(text) as {
      error?: { message?: string } | string;
      message?: string;
    };
    if (typeof data.error === "string") return data.error;
    if (data.error?.message) return data.error.message;
    if (data.message) return data.message;
  } catch {
    // respuesta no JSON
  }
  return text.slice(0, 300) || `El proveedor respondió HTTP ${status}`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LLMRequest;
    const baseUrl = normalizeBase(String(body.baseUrl ?? ""));
    if (!/^https?:\/\//i.test(baseUrl)) {
      return NextResponse.json(
        { error: "La URL base debe empezar con http:// o https://." },
        { status: 400 },
      );
    }

    const apiKey = String(body.apiKey ?? "").trim();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

    if (body.test) {
      const response = await fetch(`${baseUrl}/models`, {
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      const text = await response.text();
      if (!response.ok) {
        return NextResponse.json(
          { error: upstreamError(text, response.status) },
          { status: 502 },
        );
      }
      let models: string[] = [];
      try {
        const data = JSON.parse(text) as { data?: Array<{ id?: string }> };
        models = (data.data ?? [])
          .map((model) => model.id)
          .filter((id): id is string => Boolean(id))
          .slice(0, 6);
      } catch {
        // algunos proveedores no devuelven JSON en /models
      }
      return NextResponse.json({ ok: true, models });
    }

    const model = String(body.model ?? "").trim();
    const messages = Array.isArray(body.messages) ? body.messages : [];
    if (!model || messages.length === 0) {
      return NextResponse.json(
        { error: "Faltan el modelo o los mensajes." },
        { status: 400 },
      );
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages,
        temperature: body.temperature ?? 0.7,
        max_tokens: body.maxTokens ?? 800,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(90000),
    });

    const text = await response.text();
    if (!response.ok) {
      return NextResponse.json(
        { error: upstreamError(text, response.status) },
        { status: 502 },
      );
    }

    try {
      return NextResponse.json(JSON.parse(text));
    } catch {
      return NextResponse.json({ raw: text });
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error de conexión desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
