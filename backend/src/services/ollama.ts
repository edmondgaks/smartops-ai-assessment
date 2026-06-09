import type {
  OllamaMessage,
  OllamaGenerateOptions,
  OllamaHealthResult,
} from "../types/index";
import { log } from "./logger";

const OLLAMA_BASE = process.env.OLLAMA_URL ?? "http://localhost:11434";
const MODEL = process.env.OLLAMA_MODEL ?? "llama3.2";
const TIMEOUT_MS = 120_000;

interface OllamaGenerateResponse {
  response: string;
  done: boolean;
}

interface OllamaChatResponse {
  message: { role: string; content: string };
  done: boolean;
}

interface OllamaTagsResponse {
  models: Array<{ name: string }>;
}

function abortSignal(): AbortSignal {
  return AbortSignal.timeout(TIMEOUT_MS);
}

export async function generate(
  prompt: string,
  options: OllamaGenerateOptions = {}
): Promise<string> {
  log.debug("Ollama", "Sending generate request", { model: MODEL, promptLength: prompt.length });
  const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: abortSignal(),
    body: JSON.stringify({
      model: MODEL,
      prompt,
      stream: false,
      options: {
        temperature: options.temperature ?? 0.1,
        top_p: options.top_p ?? 0.9,
        num_predict: options.max_tokens ?? 1024,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    log.error("Ollama", `Generate error ${res.status}`, { error: errText });
    throw new Error(`Ollama generate error ${res.status}: ${errText}`);
  }

  const data = (await res.json()) as OllamaGenerateResponse;
  return data.response?.trim() ?? "";
}

export async function chat(
  messages: OllamaMessage[],
  options: OllamaGenerateOptions = {}
): Promise<string> {
  log.debug("Ollama", "Sending chat request", { model: MODEL, messageCount: messages.length });
  const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: abortSignal(),
    body: JSON.stringify({
      model: MODEL,
      messages,
      stream: false,
      options: {
        temperature: options.temperature ?? 0.2,
        top_p: options.top_p ?? 0.9,
        num_predict: options.max_tokens ?? 1024,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    log.error("Ollama", `Chat error ${res.status}`, { error: errText });
    throw new Error(`Ollama chat error ${res.status}: ${errText}`);
  }

  const data = (await res.json()) as OllamaChatResponse;
  return data.message?.content?.trim() ?? "";
}

export async function checkHealth(): Promise<OllamaHealthResult> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) {
      log.warn("Ollama", `Health check failed with status ${res.status}`);
      return { ok: false, error: `HTTP ${res.status}` };
    }

    const data = (await res.json()) as OllamaTagsResponse;
    const models = data.models?.map((m) => m.name) ?? [];
    const modelAvailable = models.some((m) =>
      m.startsWith(MODEL.split(":")[0])
    );
    return { ok: true, models, modelAvailable, activeModel: MODEL };
  } catch (e) {
    log.warn("Ollama", "Health check exception", { error: (e as Error).message });
    return { ok: false, error: (e as Error).message };
  }
}
