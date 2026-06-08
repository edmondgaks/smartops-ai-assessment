"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { apiFetch } from "@/lib/api";
import type { ModelHealth } from "@/types";

export function NavBar() {
  const pathname = usePathname();
  const [health, setHealth] = useState<ModelHealth | null>(null);

  useEffect(() => {
    apiFetch<ModelHealth>("/api/models/health")
      .then(setHealth)
      .catch(() => setHealth({ ok: false, error: "Backend unreachable" }));
  }, []);

  const links = [
    { href: "/", label: "Home" },
    { href: "/triage", label: "Triage" },
    { href: "/rag", label: "Knowledge Base" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-[52px] flex items-center gap-6 px-6 bg-white/90 dark:bg-zinc-950/90 backdrop-blur border-b border-zinc-200 dark:border-zinc-800">
      {/* Brand */}
      <Link href="/" className="flex items-center gap-2 text-accent-bright font-bold text-[13px] tracking-widest uppercase no-underline">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <rect x="0" y="0" width="7" height="7" rx="1" opacity="0.9" />
          <rect x="9" y="0" width="7" height="7" rx="1" opacity="0.4" />
          <rect x="0" y="9" width="7" height="7" rx="1" opacity="0.4" />
          <rect x="9" y="9" width="7" height="7" rx="1" opacity="0.9" />
        </svg>
        SmartOPS
      </Link>

      {/* Nav links */}
      <div className="flex gap-1">
        {links.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors no-underline
                ${active
                  ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {/* Spacer */}
      <div className="ml-auto flex items-center gap-3">
        {/* Model status indicator */}
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 dark:text-zinc-500">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              health === null ? "bg-zinc-400 animate-pulse" :
              health.ok ? "bg-green-500" : "bg-red-500"
            }`}
          />
          {health === null ? "Checking…" : health.ok ? health.activeModel : "Ollama offline"}
        </div>

        <ThemeToggle />
      </div>
    </nav>
  );
}
