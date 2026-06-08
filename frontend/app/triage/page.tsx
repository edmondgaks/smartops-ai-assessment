"use client";
import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { Badge, Button, Card, Input, Label, Select, StatCard, Textarea, EmptyState } from "@/components/ui";
import type { Ticket, TicketCategory, TicketPriority, TriageStats } from "@/types";

const SAMPLES = [
  "Our entire production database is down and we can't process any orders. Error: CONNECTION_TIMEOUT_5432. This is costing us ~$10k/minute. CEO is on the phone. URGENT!",
  "Hi, I've been charged twice for my subscription this month ($29.99 x2). My email is jane@example.com. Please refund one charge.",
  "It would be really nice if you could add dark mode to the mobile app. Also maybe push notifications?",
  "The export to CSV feature is broken. When I click it, nothing happens. Using Chrome 120 on Mac. Started after your latest update.",
  "I'm very frustrated with the new UI. The old design was much better and I can't find anything anymore. Please revert.",
];

interface Filters {
  category: string;
  priority: string;
  search: string;
}

export default function TriagePage() {
  const [tab, setTab] = useState<"submit" | "dashboard">("submit");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Ticket | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<TriageStats | null>(null);
  const [filters, setFilters] = useState<Filters>({ category: "all", priority: "all", search: "" });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.category !== "all") params.set("category", filters.category);
    if (filters.priority !== "all") params.set("priority", filters.priority);
    if (filters.search) params.set("search", filters.search);
    params.set("limit", "50");

    const [t, s] = await Promise.allSettled([
      apiFetch<{ tickets: Ticket[] }>(`/api/triage?${params}`),
      apiFetch<TriageStats>("/api/triage/stats"),
    ]);
    if (t.status === "fulfilled") setTickets(t.value.tickets);
    if (s.status === "fulfilled") setStats(s.value);
  }, [filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleSubmit() {
    if (!input.trim()) return;
    setLoading(true);
    setSubmitError(null);
    setResult(null);
    try {
      const data = await apiFetch<Ticket>("/api/triage", {
        method: "POST",
        body: JSON.stringify({ text: input }),
      });
      setResult(data);
      setInput("");
      void fetchData();
    } catch (e) {
      setSubmitError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteTicket(id: string) {
    await apiFetch(`/api/triage/${id}`, { method: "DELETE" });
    void fetchData();
  }

  const PRIORITY_ORDER: Record<TicketPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[10px] text-accent uppercase tracking-[0.15em] mb-2">Use Case 01</p>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Smart Intake Triage</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-[13px] mt-1 font-sans">
          Structured classification, field extraction, and reply drafting via self-hosted LLM
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
            {t === "dashboard" && stats ? `Dashboard (${stats.total})` : t === "submit" ? "Submit Ticket" : t}
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
            {submitError && (
              <Card className="p-4 border-red-500/30 mb-4 animate-fade-in">
                <p className="text-red-400 text-[12px]">⚠ {submitError}</p>
              </Card>
            )}
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
          {stats && (
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
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-5">
            <Select value={filters.category} onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}>
              {["all","billing","technical","feature-request","complaint","general"].map((v) => (
                <option key={v} value={v}>{v === "all" ? "All Categories" : v}</option>
              ))}
            </Select>
            <Select value={filters.priority} onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}>
              {["all","critical","high","medium","low"].map((v) => (
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
          {tickets.length === 0 ? (
            <EmptyState icon="📥" title="No tickets yet" description='Submit one from the "Submit Ticket" tab.' />
          ) : (
            <div className="flex flex-col gap-2">
              {[...tickets]
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
      {result.fallback && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded px-3 py-2 text-[11px] text-yellow-400 mb-4">
          ⚠ Fallback mode — JSON parse failed. Showing safe defaults.
          {result.parse_error && <div className="mt-1 opacity-70">{result.parse_error}</div>}
        </div>
      )}
      {result.warnings?.map((w, i) => (
        <div key={i} className="text-[11px] text-yellow-400 mb-2">⚑ {w}</div>
      ))}

      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Category", el: <Badge variant={`cat-${result.category}` as Parameters<typeof Badge>[0]["variant"]}>{result.category}</Badge> },
          { label: "Priority", el: <Badge variant={`priority-${result.priority}` as Parameters<typeof Badge>[0]["variant"]}>{result.priority}</Badge> },
          { label: "Sentiment", el: <span className={`text-[12px] font-semibold ${
            result.sentiment === "positive" ? "text-green-500" :
            result.sentiment === "negative" ? "text-red-400" :
            result.sentiment === "mixed" ? "text-yellow-400" : "text-zinc-400"
          }`}>{result.sentiment}</span> },
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

function TicketRow({ ticket, expanded, onToggle, onDelete }: {
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
            {ticket.parse_error && " · ⚠ parse error"}
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
            {Object.entries(ticket.key_fields).filter(([, v]) => v).map(([k, v]) => (
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

          <Button variant="danger" size="sm" onClick={onDelete}>Delete</Button>
        </div>
      )}
    </Card>
  );
}
