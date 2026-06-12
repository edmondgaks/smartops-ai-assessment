"use client";
import { useState, useEffect, useRef } from "react";
import { apiFetch } from "@/lib/api";
import { Badge, Button, Card, Input, Label, Textarea, EmptyState } from "@/components/ui";
import type { ChatMessage, Citation, DocumentSummary } from "@/types";

const SAMPLE_DOCS = [
  {
    title: "Refund Policy",
    content: `Our refund policy allows customers to request a full refund within 30 days of purchase. After 30 days, refunds are evaluated case-by-case. Digital products are refundable within 14 days if not downloaded. To request a refund, contact support@example.com with your order number. Refunds are processed within 5-7 business days. Subscription cancellations take effect at the end of the current billing period.`,
  },
  {
    title: "API Rate Limits",
    content: `Our API enforces the following rate limits: Free tier: 100 requests/hour, 1,000/day. Pro tier: 1,000 requests/hour, 20,000/day. Enterprise: custom limits. Rate limit headers are included in every response: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset. When limits are exceeded, the API returns HTTP 429. Exponential backoff is recommended. Burst limits allow up to 2x the hourly limit for up to 60 seconds.`,
  },
  {
    title: "System Requirements",
    content: `Minimum requirements: Windows 10/11, macOS 12+, or Ubuntu 20.04+. RAM: 4GB minimum, 8GB recommended. Disk: 2GB free. Internet: 5 Mbps minimum. Browsers: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+. Mobile: iOS 14+ and Android 9+. Desktop app requires Node.js 18+ in development mode. GPU acceleration is optional but improves performance significantly.`,
  },
];

export default function RAGPage() {
  const [sessionId] = useState(() => crypto.randomUUID());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [showDocs, setShowDocs] = useState(false);
  const [docForm, setDocForm] = useState({ title: "", content: "" });
  const [docLoading, setDocLoading] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { void fetchDocs(); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function fetchDocs() {
    const docs = await apiFetch<DocumentSummary[]>("/api/rag/documents");
    setDocuments(docs);
  }

  async function seedDocs() {
    setSeedLoading(true);
    for (const doc of SAMPLE_DOCS) {
      await apiFetch("/api/rag/documents", {
        method: "POST",
        body: JSON.stringify(doc),
      });
    }
    await fetchDocs();
    setSeedLoading(false);
  }

  async function sendMessage() {
    if (!input.trim() || loading) return;
    const question = input.trim();
    setInput("");
    setLoading(true);
    setMessages((m) => [...m, { id: Date.now(), role: "user", content: question }]);

    try {
      const data = await apiFetch<{
        answer: string;
        grounded: boolean;
        citations: Citation[];
        topScore: number;
        sessionId: string;
      }>("/api/rag/chat", {
        method: "POST",
        body: JSON.stringify({ question, sessionId }),
      });

      setMessages((m) => [
        ...m,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: data.answer,
          citations: data.citations,
          grounded: data.grounded,
          topScore: data.topScore,
        },
      ]);
    } catch (e) {
      setMessages((m) => [...m, { id: Date.now() + 1, role: "error", content: (e as Error).message }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  async function addDoc() {
    if (!docForm.title || !docForm.content) return;
    setDocLoading(true);
    await apiFetch("/api/rag/documents", {
      method: "POST",
      body: JSON.stringify(docForm),
    });
    setDocForm({ title: "", content: "" });
    await fetchDocs();
    setDocLoading(false);
  }

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocLoading(true);
    const form = new FormData();
    form.append("file", file);
    form.append("title", file.name);
    await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/api/rag/documents/upload`, {
      method: "POST",
      body: form,
    });
    await fetchDocs();
    setDocLoading(false);
    e.target.value = "";
  }

  async function deleteDoc(title: string) {
    await apiFetch(`/api/rag/documents/${encodeURIComponent(title)}`, { method: "DELETE" });
    await fetchDocs();
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col" style={{ height: "calc(100vh - 52px)" }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-5 flex-shrink-0">
        <div>
          <p className="text-[10px] text-cyan-500 uppercase tracking-[0.15em] mb-1">Use Case 02</p>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Knowledge Assistant</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-[13px] mt-1 font-sans">
            RAG-powered Q&A grounded in your documents · citations included
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setShowDocs(!showDocs)}>
          {showDocs ? "← Hide Docs" : "Manage Docs →"}
        </Button>
      </div>

      <div className="flex gap-5 flex-1 min-h-0">
        {/* Chat */}
        <div className="flex flex-col flex-1 min-h-0">
          {/* Messages */}
          <Card className="flex-1 overflow-auto p-4 flex flex-col gap-4 min-h-0">
            {messages.length === 0 ? (
              <ChatEmptyState docCount={documents.length} onSeed={seedDocs} seedLoading={seedLoading} />
            ) : (
              messages.map((m) => <MessageBubble key={m.id} message={m} />)
            )}
            {loading && <TypingIndicator />}
            <div ref={endRef} />
          </Card>

          {/* Input */}
          <div className="mt-3 flex gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 flex-shrink-0">
            <Textarea
              ref={inputRef}
              rows={2}
              placeholder={documents.length === 0 ? "Add documents first…" : "Ask a question about your documents…"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }}
              disabled={documents.length === 0}
              className="border-none bg-transparent focus:ring-0 resize-none py-1"
            />
            <Button
              onClick={sendMessage}
              loading={loading}
              disabled={!input.trim() || documents.length === 0}
              className="self-end flex-shrink-0"
            >
              Send
            </Button>
          </div>
        </div>

        {/* Document panel */}
        {showDocs && (
          <Card className="w-72 flex-shrink-0 flex flex-col overflow-auto p-4 gap-4">
            <div className="text-[10px] text-zinc-400 uppercase tracking-widest">
              Knowledge Base · {documents.length} doc{documents.length !== 1 ? "s" : ""}
            </div>

            {/* Doc list */}
            <div className="flex flex-col gap-1.5">
              {documents.length === 0 ? (
                <p className="text-[12px] text-zinc-400 text-center py-3">No documents yet</p>
              ) : (
                documents.map((d) => (
                  <div key={d.title} className="flex items-start justify-between bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] text-zinc-800 dark:text-zinc-200 truncate">{d.title}</div>
                      <div className="text-[10px] text-zinc-400">{d.chunkCount} chunk{d.chunkCount !== 1 ? "s" : ""}</div>
                    </div>
                    <button onClick={() => deleteDoc(d.title)} className="text-zinc-400 hover:text-red-400 ml-2 text-sm transition-colors">×</button>
                  </div>
                ))
              )}
            </div>

            {/* Add document form */}
            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4">
              <Label>Add Document</Label>
              <Input
                placeholder="Title"
                value={docForm.title}
                onChange={(e) => setDocForm((d) => ({ ...d, title: e.target.value }))}
                className="mb-2"
              />
              <Textarea
                rows={4}
                placeholder="Document content…"
                value={docForm.content}
                onChange={(e) => setDocForm((d) => ({ ...d, content: e.target.value }))}
                className="mb-2"
              />
              <Button
                onClick={addDoc}
                loading={docLoading}
                disabled={!docForm.title || !docForm.content}
                className="w-full justify-center mb-3"
              >
                Add Document
              </Button>

              <div className="text-[10px] text-zinc-400 text-center mb-2">or upload a .txt file</div>
              <label className="flex items-center justify-center gap-2 w-full px-3 py-1.5 text-[12px] font-semibold text-zinc-400 border border-zinc-200 dark:border-zinc-700 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors">
                Upload File
                <input type="file" accept=".txt,.md" onChange={uploadFile} className="hidden" />
              </label>

              <div className="border-t border-zinc-200 dark:border-zinc-800 mt-3 pt-3">
                <Button variant="ghost" size="sm" onClick={seedDocs} loading={seedLoading} className="w-full justify-center text-[11px]">
                  ↓ Load Sample KB (3 docs)
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── Chat empty state ─────────────────────────────────────────────────────────

function ChatEmptyState({ docCount, onSeed, seedLoading }: { docCount: number; onSeed: () => void; seedLoading: boolean }) {
  return (
    <EmptyState
      icon="📚"
      title={docCount === 0 ? "No documents in knowledge base" : "Start asking questions!"}
      description={
        docCount === 0
          ? "Open the doc panel and upload documents or load sample data."
          : `${docCount} document${docCount !== 1 ? "s" : ""} loaded. Ask anything.`
      }
      action={
        docCount === 0 ? (
          <Button variant="ghost" size="sm" onClick={onSeed} loading={seedLoading}>
            Load Sample Knowledge Base
          </Button>
        ) : (
          <div className="text-[11px] text-zinc-400 space-y-1">
            <div>&quot;What is your refund policy?&quot;</div>
            <div>&quot;What are the API rate limits?&quot;</div>
          </div>
        )
      }
    />
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === "error") {
    return (
      <div className="px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-[12px] text-red-400 animate-fade-in">
        {message.content}
      </div>
    );
  }

  const isUser = message.role === "user";

  return (
    <div className={`flex flex-col animate-fade-in ${isUser ? "items-end" : "items-start"}`}>
      <div className="text-[10px] text-zinc-400 mb-1 uppercase tracking-wider">
        {isUser ? "You" : "Assistant"}
      </div>

      <div className={`max-w-[85%] px-4 py-3 rounded-xl text-[13px] leading-relaxed font-sans whitespace-pre-wrap ${
        isUser
          ? "bg-accent/20 border border-accent/40 text-zinc-900 dark:text-zinc-100 rounded-br-sm"
          : "bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-bl-sm"
      }`}>
        {message.content}
      </div>

      {/* Citations */}
      {message.citations && message.citations.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1.5 max-w-[85%]">
          {message.citations.map((c, i) => (
            <span
              key={c.id}
              title={`Relevance: ${c.score.toFixed(3)}`}
              className="text-[10px] px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/30 rounded text-cyan-400 cursor-default"
            >
              [{i + 1}] {c.title}
            </span>
          ))}
        </div>
      )}

      {/* Not grounded warning */}
      {!isUser && message.grounded === false && (
        <div className="text-[10px] text-yellow-400 mt-1 flex items-center gap-1">
          ⚠ No relevant documents found — answer not grounded in knowledge base
        </div>
      )}
    </div>
  );
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 text-zinc-400 text-[12px]">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      Thinking…
    </div>
  );
}
