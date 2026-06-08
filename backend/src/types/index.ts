
// ─── Ollama Types ─────────────────────────────────────────────────────────────



export interface OllamaHealthResult {
  ok: boolean;
  models?: string[];
  modelAvailable?: boolean;
  activeModel?: string;
  error?: string;
}
