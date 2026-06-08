// ─── Model health ─────────────────────────────────────────────────────────────

export interface ModelHealth {
  ok: boolean;
  models?: string[];
  modelAvailable?: boolean;
  activeModel?: string;
  error?: string;
}
