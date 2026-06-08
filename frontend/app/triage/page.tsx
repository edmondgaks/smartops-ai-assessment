"use client";
import { useState, useCallback } from "react";
import {
  Badge,
  Button,
  Card,
  Input,
  Label,
  Select,
  StatCard,
  Textarea,
  EmptyState,
} from "@/components/ui/index";

// ─── Types ────────────────────────────────────────────────────────────────────

type TicketCategory = "billing" | "technical" | "feature-request" | "complaint" | "general";
type TicketPriority = "critical" | "high" | "medium" | "low";
type TicketSentiment = "positive" | "negative" | "neutral" | "mixed";

interface Ticket {
  id: string;
  summary: string;
  priority: TicketPriority;
  category: TicketCategory;
  sentiment: TicketSentiment;
  created_at: string;
  raw_input: string;
  key_fields: Record<string, string | null>;
  suggested_reply: string;
  fallback?: boolean;
  parse_error?: string;
  warnings?: string[];
  rawOutput?: string;
}

interface TriageStats {
  total: number;
  byPriority: { priority: TicketPriority; count: number }[];
  fallbackCount: number;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const SAMPLES = [
  "Our entire production database is down and we can't process any orders. Error: CONNECTION_TIMEOUT_5432. This is costing us ~$10k/minute. CEO is on the phone. URGENT!",
  "Hi, I've been charged twice for my subscription this month ($29.99 x2). My email is jane@example.com. Please refund one charge.",
  "It would be really nice if you could add dark mode to the mobile app. Also maybe push notifications?",
  "The export to CSV feature is broken. When I click it, nothing happens. Using Chrome 120 on Mac. Started after your latest update.",
  "I'm very frustrated with the new UI. The old design was much better and I can't find anything anymore. Please revert.",
];

const MOCK_TICKETS: Ticket[] = [
  {
    id: "t1",
    summary: "Production DB down — CONNECTION_TIMEOUT_5432",
    priority: "critical",
    category: "technical",
    sentiment: "negative",
    created_at: new Date(Date.now() - 120_000).toISOString(),
    raw_input: SAMPLES[0],
    key_fields: { error_code: "CONNECTION_TIMEOUT_5432", impact: "~$10k/min", contact: null, affected_feature: "database" },
    suggested_reply: "We're treating this as P0. Our on-call engineer is investigating immediately. We'll update you within 15 minutes.",
  },
  {
    id: "t2",
    summary: "Double charge for subscription — $29.99 × 2",
    priority: "high",
    category: "billing",
    sentiment: "negative",
    created_at: new Date(Date.now() - 3_600_000).toISOString(),
    raw_input: SAMPLES[1],
    key_fields: { amount: "$29.99 × 2", email: "jane@example.com", error_code: null, affected_feature: "billing" },
    suggested_reply: "I'm sorry about the duplicate charge. I've initiated a refund of $29.99 which should appear within 3–5 business days.",
  },
  {
    id: "t3",
    summary: "Feature requests: dark mode + push notifications",
    priority: "low",
    category: "feature-request",
    sentiment: "positive",
    created_at: new Date(Date.now() - 7_200_000).toISOString(),
    raw_input: SAMPLES[2],
    key_fields: { feature: "dark mode, push notifications", platform: "mobile", email: null, affected_feature: null },
    suggested_reply: "Thanks for the suggestions! Both are on our roadmap. I've added your vote — we'll let you know when they ship.",
  },
  {
    id: "t4",
    summary: "CSV export broken on Chrome 120 / Mac",
    priority: "medium",
    category: "technical",
    sentiment: "negative",
    created_at: new Date(Date.now() - 14_400_000).toISOString(),
    raw_input: SAMPLES[3],
    key_fields: { browser: "Chrome 120", os: "Mac", affected_feature: "CSV export", error_code: null },
    suggested_reply: "We've reproduced this on Chrome 120 and our team is working on a fix. I'll follow up as soon as it's resolved.",
  },
  {
    id: "t5",
    summary: "Frustration with new UI — wants old design back",
    priority: "medium",
    category: "complaint",
    sentiment: "negative",
    created_at: new Date(Date.now() - 86_400_000).toISOString(),
    raw_input: SAMPLES[4],
    key_fields: { affected_feature: "UI/UX", email: null, error_code: null, platform: null },
    suggested_reply: "I'm sorry the new UI feels disorienting. Here's a quick overview of where things moved, and I'm happy to walk you through it.",
  },
];

// ─── Classifier (mock, no API) ────────────────────────────────────────────────

function mockClassify(text: string): Ticket {
  let priority: TicketPriority = "medium";
  let category: TicketCategory = "general";
  let sentiment: TicketSentiment = "neutral";

  if (/urgent|down|outage|critical|costing/i.test(text)) priority = "critical";
  else if (/broken|error|not working|failed|issue/i.test(text)) priority = "high";
  else if (/would be nice|feature|add|suggest/i.test(text)) priority = "low";

  if (/charg|bill|refund|payment|invoice|subscri/i.test(text)) category = "billing";
  else if (/error|broken|bug|crash|not work|timeout|export/i.test(text)) category = "technical";
  else if (/feature|dark mode|notification/i.test(text)) category = "feature-request";
  else if (/frustrat|angry|terrible|hate|worst/i.test(text)) category = "complaint";

  if (/frustrat|angry|urgent|broken|costing/i.test(text)) sentiment = "negative";
  else if (/nice|thanks|love|great/i.test(text)) sentiment = "positive";

  const replies: Record<string, string> = {
    billing: "We've reviewed your billing record and will process the adjustment within 3–5 business days.",
    technical: "Our engineering team has been notified and is investigating. We'll keep you updated.",
    critical: "This is our highest priority right now. The on-call team is engaged and will update you every 15 minutes.",
    "feature-request": "Thanks for the suggestion! We've logged it and our product team will review it.",
    complaint: "I'm sorry you had this experience. Let me connect you with someone who can help right away.",
    general: "Thank you for reaching out. A member of our team will follow up shortly.",
  };

  return {
    id: "t" + Date.now(),
    summary: text.slice(0, 80) + (text.length > 80 ? "…" : ""),
    priority,
    category,
    sentiment,
    created_at: new Date().toISOString(),
    raw_input: text,
    key_fields: {
      error_code: (/error[:\s]+([A-Z_0-9]+)/i.exec(text) ?? [])[1] ?? null,
      email: (/[\w.-]+@[\w.-]+\.[a-z]{2,}/i.exec(text) ?? [])[0] ?? null,
      browser: (/chrome|firefox|safari|edge/i.exec(text) ?? [])[0] ?? null,
      affected_feature: null,
    },
    suggested_reply: replies[category] ?? replies.general,
  };
}

// ─── Stats helper ─────────────────────────────────────────────────────────────

function computeStats(tickets: Ticket[]): TriageStats {
  const counts: Record<string, number> = {};
  tickets.forEach((t) => { counts[t.priority] = (counts[t.priority] ?? 0) + 1; });
  return {
    total: tickets.length,
    byPriority: (["critical", "high", "medium", "low"] as TicketPriority[]).map((p) => ({
      priority: p,
      count: counts[p] ?? 0,
    })),
    fallbackCount: tickets.filter((t) => t.fallback).length,
  };
}

// ─── Filters ──────────────────────────────────────────────────────────────────

interface Filters {
  category: string;
  priority: string;
  search: string;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TriagePage() {
  const [tab, setTab] = useState<"submit" | "dashboard">("submit");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Ticket | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>(MOCK_TICKETS);
  const [filters, setFilters] = useState<Filters>({ category: "all", priority: "all", search: "" });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const stats = computeStats(tickets);

  const filteredTickets = useCallback(() => {
    return tickets.filter((t) => {
      if (filters.category !== "all" && t.category !== filters.category) return false;
      if (filters.priority !== "all" && t.priority !== filters.priority) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!t.summary.toLowerCase().includes(q) && !t.raw_input.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [tickets, filters]);

  function handleSubmit() {
    if (!input.trim()) return;
    setLoading(true);
    setResult(null);
    setTimeout(() => {
      const ticket = mockClassify(input);
      setResult(ticket);
      setTickets((prev) => [ticket, ...prev]);
      setInput("");
      setLoading(false);
    }, 800);
  }

  function deleteTicket(id: string) {
    setTickets((prev) => prev.filter((t) => t.id !== id));
  }

  const PRIORITY_ORDER: Record<TicketPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[10px] text-accent uppercase tracking-[0.15em] mb-2">Use Case 01</p>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Smart Intake Triage</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-[13px] mt-1 font-sans">
          Structured classification, field extraction, and reply drafting
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 mb-6">
        {(["submit", "dashboard"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-[13px] font-semibold border-b-2 transition-colors capitalize ${
              tab === t
                ? "border-accent text-zinc-900 dark:text-zinc-100"
                : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            }`}
          >
            {t === "dashboard" ? `Dashboard (${stats.total})` : "Submit Ticket"}
          </button>
        ))}
      </div>

      {tab === "submit" ? (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Input */}
          <div>
            <Label>Ticket / Feedback Text</Label>
            <Textarea
              rows={8}
              placeholder="Paste a support ticket, customer email, or feedback here…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="mb-3"
            />
            <Button
              onClick={handleSubmit}
              loading={loading}
              disabled={!input.trim()}
              className="w-full justify-center mb-6"
            >
              → Classify Ticket
            </Button>

            <Label>Sample Tickets</Label>
            <div className="flex flex-col gap-1.5">
              {SAMPLES.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setInput(s)}
                  className="text-left text-[11px] text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md px-3 py-2 transition-colors"
                >
                  {s.slice(0, 90)}…
                </button>
              ))}
            </div>
          </div>

          {/* Result */}
          <div>
            {result ? (
              <ResultCard result={result} />
            ) : (
              <div className="h-full min-h-[200px] flex items-center justify-center border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-400 text-[12px]">
                Results will appear here
              </div>
            )}
          </div>
        </div>
      ) : (
        <div>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
            <StatCard label="Total" value={stats.total} />
            {stats.byPriority.map((p) => (
              <StatCard
                key={p.priority}
                label={p.priority}
                value={p.count}
                color={
                  p.priority === "critical" ? "text-red-500" :
                  p.priority === "high" ? "text-orange-400" :
                  p.priority === "medium" ? "text-yellow-400" : "text-green-500"
                }
              />
            ))}
            {stats.fallbackCount > 0 && (
              <StatCard label="Parse Errors" value={stats.fallbackCount} color="text-yellow-400" />
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-5">
            <Select value={filters.category} onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}>
              {["all", "billing", "technical", "feature-request", "complaint", "general"].map((v) => (
                <option key={v} value={v}>{v === "all" ? "All Categories" : v}</option>
              ))}
            </Select>
            <Select value={filters.priority} onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}>
              {["all", "critical", "high", "medium", "low"].map((v) => (
                <option key={v} value={v}>{v === "all" ? "All Priorities" : v}</option>
              ))}
            </Select>
            <Input
              placeholder="Search tickets…"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              className="flex-1 min-w-[180px]"
            />
          </div>

          {/* Ticket list */}
          {filteredTickets().length === 0 ? (
            <EmptyState icon="📥" title="No tickets yet" description='Submit one from the "Submit Ticket" tab.' />
          ) : (
            <div className="flex flex-col gap-2">
              {[...filteredTickets()]
                .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9))
                .map((t) => (
                  <TicketRow
                    key={t.id}
                    ticket={t}
                    expanded={expandedId === t.id}
                    onToggle={() => setExpandedId(expandedId === t.id ? null : t.id)}
                    onDelete={() => deleteTicket(t.id)}
                  />
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Result card ──────────────────────────────────────────────────────────────

function ResultCard({ result }: { result: Ticket }) {
  const [showRaw, setShowRaw] = useState(false);

  return (
    <Card className="p-5 animate-fade-in">
      {result.warnings?.map((w, i) => (
        <div key={i} className="text-[11px] text-yellow-400 mb-2">⚑ {w}</div>
      ))}

      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          {
            label: "Category",
            el: <Badge variant={`cat-${result.category}` as Parameters<typeof Badge>[0]["variant"]}>{result.category}</Badge>,
          },
          {
            label: "Priority",
            el: <Badge variant={`priority-${result.priority}` as Parameters<typeof Badge>[0]["variant"]}>{result.priority}</Badge>,
          },
          {
            label: "Sentiment",
            el: (
              <span className={`text-[12px] font-semibold ${
                result.sentiment === "positive" ? "text-green-500" :
                result.sentiment === "negative" ? "text-red-400" :
                result.sentiment === "mixed" ? "text-yellow-400" : "text-zinc-400"
              }`}>
                {result.sentiment}
              </span>
            ),
          },
        ].map(({ label, el }) => (
          <div key={label}>
            <Label>{label}</Label>
            {el}
          </div>
        ))}
      </div>

      <div className="mb-4">
        <Label>Summary</Label>
        <p className="text-[13px] text-zinc-500 dark:text-zinc-400 font-sans leading-relaxed">{result.summary}</p>
      </div>

      <div className="mb-4">
        <Label>Extracted Fields</Label>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(result.key_fields).map(([k, v]) => (
            <div key={k} className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-2">
              <div className="text-[10px] text-zinc-400 mb-0.5">{k.replace(/_/g, " ")}</div>
              <div className={`text-[12px] ${v ? "text-zinc-800 dark:text-zinc-200" : "text-zinc-400"}`}>{v ?? "null"}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <Label>Suggested Reply</Label>
        <div className="text-[13px] text-zinc-500 dark:text-zinc-400 font-sans leading-relaxed border-l-2 border-accent pl-3">
          {result.suggested_reply}
        </div>
      </div>

      <Button variant="ghost" size="sm" onClick={() => setShowRaw(!showRaw)}>
        {showRaw ? "Hide" : "Show"} raw output
      </Button>
      {showRaw && (
        <pre className="mt-2 p-3 bg-zinc-950 rounded text-[10px] text-zinc-400 overflow-auto max-h-36 whitespace-pre-wrap break-all">
          {result.rawOutput ?? "(empty)"}
        </pre>
      )}
    </Card>
  );
}

// ─── Ticket row ───────────────────────────────────────────────────────────────

function TicketRow({
  ticket,
  expanded,
  onToggle,
  onDelete,
}: {
  ticket: Ticket;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="overflow-hidden animate-fade-in">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          <div className="text-[12px] text-zinc-800 dark:text-zinc-200 truncate">
            {ticket.summary || ticket.raw_input.slice(0, 100)}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">
            {new Date(ticket.created_at).toLocaleString()}
          </div>
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          <Badge variant={`priority-${ticket.priority}` as Parameters<typeof Badge>[0]["variant"]}>{ticket.priority}</Badge>
          <Badge variant={`cat-${ticket.category}` as Parameters<typeof Badge>[0]["variant"]}>{ticket.category}</Badge>
        </div>
        <span className="text-zinc-400 text-xs">{expanded ? "▲" : "▼"}</span>
      </div>

      {expanded && (
        <div className="border-t border-zinc-200 dark:border-zinc-800 px-4 py-4 animate-fade-in">
          <div className="mb-3">
            <Label>Original Input</Label>
            <pre className="text-[11px] text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950 p-3 rounded whitespace-pre-wrap font-mono leading-relaxed">
              {ticket.raw_input}
            </pre>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            {Object.entries(ticket.key_fields)
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="text-[12px]">
                  <span className="text-zinc-400">{k.replace(/_/g, " ")}: </span>
                  <span className="text-zinc-700 dark:text-zinc-300">{v}</span>
                </div>
              ))}
          </div>

          {ticket.suggested_reply && (
            <div className="mb-4">
              <Label>Suggested Reply</Label>
              <div className="text-[12px] text-zinc-500 dark:text-zinc-400 font-sans leading-relaxed border-l-2 border-accent pl-3">
                {ticket.suggested_reply}
              </div>
            </div>
          )}

          <Button variant="danger" size="sm" onClick={onDelete}>
            Delete
          </Button>
        </div>
      )}
    </Card>
  );
}