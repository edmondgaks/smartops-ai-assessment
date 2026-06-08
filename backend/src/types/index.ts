// ─── Triage Types ────────────────────────────────────────────────────────────

export type TicketCategory =
  | "billing"
  | "technical"
  | "feature-request"
  | "complaint"
  | "general";

export type TicketPriority = "critical" | "high" | "medium" | "low";

export type TicketSentiment = "positive" | "neutral" | "negative" | "mixed";

export interface KeyFields {
  contact_info: string | null;
  product_mentioned: string | null;
  deadline_mentioned: string | null;
  error_code: string | null;
}

export interface TriageResult {
  category: TicketCategory;
  priority: TicketPriority;
  sentiment: TicketSentiment;
  summary: string;
  key_fields: KeyFields;
  suggested_reply: string;
  rawOutput: string;
  parseError: string | null;
  fallback?: boolean;
  warnings?: string[];
}

export interface Ticket extends TriageResult {
  id: string;
  raw_input: string;
  created_at: string;
}

export interface TicketRow {
  id: string;
  raw_input: string;
  category: TicketCategory;
  priority: TicketPriority;
  sentiment: TicketSentiment;
  summary: string;
  key_fields: string; // JSON string in DB
  suggested_reply: string;
  model_raw_output: string;
  parse_error: string | null;
  created_at: string;
}

export interface TriageStats {
  total: number;
  byCategory: Array<{ category: string; count: number }>;
  byPriority: Array<{ priority: string; count: number }>;
  bySentiment: Array<{ sentiment: string; count: number }>;
  recentActivity: Array<{ date: string; count: number }>;
  fallbackCount: number;
}

// ─── RAG Types ────────────────────────────────────────────────────────────────

export interface DocumentRow {
  id: string;
  title: string;
  content: string;
  chunk_index: number;
  source: string | null;
  embedding: string; // JSON string
  created_at: string;
}

export interface DocumentSummary {
  title: string;
  source: string | null;
  chunkCount: number;
  createdAt: string;
}

export interface Citation {
  id: string;
  title: string;
  source: string | null;
  score: number;
}

export interface RetrievalResult {
  chunks: Array<DocumentRow & { score: number }>;
  belowThreshold: boolean;
  topScore: number;
}

export interface RAGResponse {
  answer: string;
  grounded: boolean;
  citations: Citation[];
  topScore: number;
  sessionId: string;
}

export interface ChatMessageRow {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  citations: string; // JSON string
  grounded: number; // 0 | 1 in SQLite
  created_at: string;
}

// ─── Ollama Types ─────────────────────────────────────────────────────────────

export interface OllamaMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OllamaGenerateOptions {
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
}

export interface OllamaHealthResult {
  ok: boolean;
  models?: string[];
  modelAvailable?: boolean;
  activeModel?: string;
  error?: string;
}
