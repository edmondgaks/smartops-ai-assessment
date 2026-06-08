// ─── Triage ───────────────────────────────────────────────────────────────────

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

export interface Ticket {
  id: string;
  raw_input: string;
  category: TicketCategory;
  priority: TicketPriority;
  sentiment: TicketSentiment;
  summary: string;
  key_fields: KeyFields;
  suggested_reply: string;
  parse_error: string | null;
  fallback?: boolean;
  warnings?: string[];
  rawOutput?: string;
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

// ─── Model health ─────────────────────────────────────────────────────────────

export interface ModelHealth {
  ok: boolean;
  models?: string[];
  modelAvailable?: boolean;
  activeModel?: string;
  error?: string;
}
