import { generate } from "./ollama";
import type {
  TriageResult,
  TicketCategory,
  TicketPriority,
  TicketSentiment,
  KeyFields,
} from "../types/index";

const CATEGORIES: TicketCategory[] = [
  "billing",
  "technical",
  "feature-request",
  "complaint",
  "general",
];
const PRIORITIES: TicketPriority[] = ["critical", "high", "medium", "low"];
const SENTIMENTS: TicketSentiment[] = [
  "positive",
  "neutral",
  "negative",
  "mixed",
];

function buildPrompt(text: string): string {
  return `You are a customer support triage system. Analyze the support ticket below and return ONLY a valid JSON object — no prose, no markdown fences, no explanation.

Support ticket:
"""
${text}
"""

Return exactly this JSON structure:
{
  "category": "<one of: billing, technical, feature-request, complaint, general>",
  "priority": "<one of: critical, high, medium, low>",
  "sentiment": "<one of: positive, neutral, negative, mixed>",
  "summary": "<1-2 sentence plain-English summary>",
  "key_fields": {
    "contact_info": "<email or name if mentioned, else null>",
    "product_mentioned": "<product or feature if mentioned, else null>",
    "deadline_mentioned": "<any deadline or urgency date if mentioned, else null>",
    "error_code": "<error code or ID if mentioned, else null>"
  },
  "suggested_reply": "<professional, empathetic reply of 2-4 sentences>"
}

Priority rules:
- critical = system down / data loss / security breach / severe financial impact
- high     = major feature broken, significant user impact
- medium   = degraded experience, workaround exists
- low      = question / minor issue / feature request`;
}

// ─── JSON extraction — 3 layers ──────────────────────────────────────────────

function extractJSON(raw: string): unknown {
  if (!raw?.trim()) throw new Error("Empty model output");

  // Layer 1: direct parse
  try {
    return JSON.parse(raw);
  } catch {}

  // Layer 2: strip markdown fences
  const stripped = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
  try {
    return JSON.parse(stripped);
  } catch {}

  // Layer 3: find first {...} block
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(raw.slice(start, end + 1));
    } catch {}
  }

  throw new Error("Could not extract valid JSON from model output");
}

// ─── Validate & normalise parsed object ──────────────────────────────────────

interface RawParsed {
  category?: unknown;
  priority?: unknown;
  sentiment?: unknown;
  summary?: unknown;
  key_fields?: {
    contact_info?: unknown;
    product_mentioned?: unknown;
    deadline_mentioned?: unknown;
    error_code?: unknown;
  };
  suggested_reply?: unknown;
}

function validateAndNormalize(parsed: unknown): Omit<TriageResult, "rawOutput" | "parseError"> {
  const p = parsed as RawParsed;
  const warnings: string[] = [];

  const category: TicketCategory = CATEGORIES.includes(p.category as TicketCategory)
    ? (p.category as TicketCategory)
    : (() => {
        warnings.push(`Invalid category "${p.category}", defaulted to "general"`);
        return "general" as TicketCategory;
      })();

  const priority: TicketPriority = PRIORITIES.includes(p.priority as TicketPriority)
    ? (p.priority as TicketPriority)
    : (() => {
        warnings.push(`Invalid priority "${p.priority}", defaulted to "medium"`);
        return "medium" as TicketPriority;
      })();

  const sentiment: TicketSentiment = SENTIMENTS.includes(p.sentiment as TicketSentiment)
    ? (p.sentiment as TicketSentiment)
    : (() => {
        warnings.push(`Invalid sentiment "${p.sentiment}", defaulted to "neutral"`);
        return "neutral" as TicketSentiment;
      })();

  const key_fields: KeyFields = {
    contact_info: typeof p.key_fields?.contact_info === "string" ? p.key_fields.contact_info : null,
    product_mentioned: typeof p.key_fields?.product_mentioned === "string" ? p.key_fields.product_mentioned : null,
    deadline_mentioned: typeof p.key_fields?.deadline_mentioned === "string" ? p.key_fields.deadline_mentioned : null,
    error_code: typeof p.key_fields?.error_code === "string" ? p.key_fields.error_code : null,
  };

  return {
    category,
    priority,
    sentiment,
    summary: typeof p.summary === "string" ? p.summary.slice(0, 500) : "No summary available.",
    key_fields,
    suggested_reply:
      typeof p.suggested_reply === "string"
        ? p.suggested_reply.slice(0, 1000)
        : "Thank you for reaching out. We will investigate and get back to you shortly.",
    ...(warnings.length > 0 ? { warnings } : {}),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

const FALLBACK: Omit<TriageResult, "rawOutput"> = {
  category: "general",
  priority: "medium",
  sentiment: "neutral",
  summary: "Automatic classification failed — manual review required.",
  key_fields: { contact_info: null, product_mentioned: null, deadline_mentioned: null, error_code: null },
  suggested_reply: "Thank you for your message. Our team will review it and follow up shortly.",
  parseError: null,
  fallback: true,
};

export async function classifyTicket(rawText: string): Promise<TriageResult> {
  const prompt = buildPrompt(rawText.slice(0, 3000));
  let rawOutput = "";

  try {
    rawOutput = await generate(prompt, { temperature: 0.05, max_tokens: 800 });
    const parsed = extractJSON(rawOutput);
    const result = validateAndNormalize(parsed);
    return { ...result, rawOutput, parseError: null };
  } catch (err) {
    const parseError = (err as Error).message;
    return { ...FALLBACK, rawOutput, parseError };
  }
}
