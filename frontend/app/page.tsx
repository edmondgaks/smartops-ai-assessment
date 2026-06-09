"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card } from "@/components/ui";
import type { ModelHealth } from "@/types";

const features = [
  {
    num: "01",
    title: "Smart Intake Triage",
    description:
      "Submit unstructured support tickets or feedback. The model classifies category and priority, extracts key fields, and drafts a reply — all as validated JSON shown in a filterable dashboard.",
    href: "/triage",
    tags: ["Structured Generation", "JSON Schema", "Error Recovery"],
    accent: "border-accent/60 hover:border-accent",
    accentText: "text-accent-bright",
  },
  {
    num: "02",
    title: "Knowledge Assistant",
    description:
      "Upload documents, then ask questions. Answers are grounded in your knowledge base with inline citations. Clearly signals when information is not available.",
    href: "/rag",
    tags: ["RAG", "TF-IDF Retrieval", "Citations"],
    accent: "border-cyan-500/40 hover:border-cyan-400",
    accentText: "text-cyan-400",
  },
];

const arch = [
  { label: "Model", value: "Llama 3.2 via Ollama" },
  { label: "Backend", value: "Node.js + Express (TypeScript)" },
  { label: "Frontend", value: "Next.js 14 + Tailwind" },
  { label: "Database", value: "SQLite WAL mode" },
  { label: "Retrieval", value: "TF-IDF cosine similarity" },
  { label: "Cost", value: "$0.00 / request" },
];

export default function HomePage() {
  const [health, setHealth] = useState<ModelHealth | null>(null);

  useEffect(() => {
    apiFetch<ModelHealth>("/api/models/health")
      .then(setHealth)
      .catch(() => setHealth({ ok: false, error: "Backend unreachable" }));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      {/* Hero */}
      <div className="mb-14">
        <p className="text-[11px] text-accent uppercase tracking-[0.15em] mb-4">
          Senior Full Stack Developer — Technical Assessment
        </p>
        <h1 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight text-zinc-900 dark:text-zinc-100 mb-5">
          Self-Hosted LLM
          <br />
          <span className="text-accent-bright">Applied AI Platform</span>
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-base max-w-xl leading-relaxed font-sans">
          Two production-ready AI features powered by a locally-running open-source model.
          No cloud APIs. No costs. Full control.
        </p>
      </div>

      {/* Model status */}
      <Card className="inline-flex items-center gap-4 px-4 py-3 mb-12">
        <div>
          <div className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1">Model Status</div>
          <div className={`text-[13px] font-medium ${health?.ok ? "text-green-500" : health ? "text-red-400" : "text-zinc-400"}`}>
            {health === null
              ? "Checking Ollama…"
              : health.ok
              ? `✓ Online · ${health.activeModel}`
              : `✗ ${health.error}`}
          </div>
          {health?.ok && !health.modelAvailable && (
            <div className="text-[11px] text-yellow-400 mt-1">
              Run: <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">ollama pull llama3.2</code>
            </div>
          )}
        </div>
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
          health === null ? "bg-zinc-400 animate-pulse" :
          health.ok ? "bg-green-500" : "bg-red-500"
        }`} />
      </Card>

      {/* Feature cards */}
      <div className="grid md:grid-cols-2 gap-5 mb-14">
        {features.map((f) => (
          <Link key={f.href} href={f.href} className="no-underline group">
            <Card className={`p-6 h-full border-2 transition-all duration-200 group-hover:-translate-y-0.5 ${f.accent}`}>
              <div className="text-5xl font-bold text-zinc-200 dark:text-zinc-800 leading-none mb-3">{f.num}</div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">{f.title}</h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-[13px] leading-relaxed mb-4 font-sans">{f.description}</p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {f.tags.map((t) => (
                  <span key={t} className="text-[10px] px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-zinc-500 dark:text-zinc-400 tracking-wide">
                    {t}
                  </span>
                ))}
              </div>
              <div className={`text-xs font-semibold ${f.accentText}`}>Open →</div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Architecture */}
      <Card className="p-6 max-w-2xl">
        <div className="text-[10px] text-zinc-400 uppercase tracking-widest mb-4">Architecture</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {arch.map(({ label, value }) => (
            <div key={label}>
              <div className="text-[10px] text-zinc-400 uppercase tracking-wide mb-0.5">{label}</div>
              <div className="text-[13px] text-zinc-700 dark:text-zinc-300">{value}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
