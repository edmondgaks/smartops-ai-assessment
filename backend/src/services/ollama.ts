import type {
  OllamaHealthResult,
} from "../types/index";

const OLLAMA_BASE = process.env.OLLAMA_URL ?? "http://localhost:11434";
const MODEL = process.env.OLLAMA_MODEL ?? "llama3.2";


interface OllamaTagsResponse {
  models: Array<{ name: string }>;
}

export async function checkHealth(): Promise<OllamaHealthResult> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };

    const data = (await res.json()) as OllamaTagsResponse;
    const models = data.models?.map((m) => m.name) ?? [];
    const modelAvailable = models.some((m) =>
      m.startsWith(MODEL.split(":")[0])
    );
    return { ok: true, models, modelAvailable, activeModel: MODEL };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
