import React from "react";

// ─── Badge ────────────────────────────────────────────────────────────────────

type BadgeVariant =
  | "priority-critical" | "priority-high" | "priority-medium" | "priority-low"
  | "cat-billing" | "cat-technical" | "cat-feature-request" | "cat-complaint" | "cat-general"
  | "grounded" | "ungrounded";

const BADGE_CLASSES: Record<BadgeVariant, string> = {
  "priority-critical":    "bg-red-500/15 text-red-400 border border-red-500/30",
  "priority-high":        "bg-orange-500/15 text-orange-400 border border-orange-500/30",
  "priority-medium":      "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
  "priority-low":         "bg-green-500/15 text-green-400 border border-green-500/30",
  "cat-billing":          "bg-violet-500/15 text-violet-400 border border-violet-500/30",
  "cat-technical":        "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  "cat-feature-request":  "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30",
  "cat-complaint":        "bg-orange-500/15 text-orange-400 border border-orange-500/30",
  "cat-general":          "bg-zinc-500/15 text-zinc-400 border border-zinc-500/30",
  "grounded":             "bg-green-500/15 text-green-400 border border-green-500/30",
  "ungrounded":           "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
};

export function Badge({ variant, children }: { variant: BadgeVariant; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide uppercase ${BADGE_CLASSES[variant]}`}>
      {children}
    </span>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "danger";
  size?: "sm" | "md";
  loading?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const base = "inline-flex items-center gap-1.5 font-semibold rounded-md transition-all cursor-pointer border focus:outline-none focus:ring-2 focus:ring-accent/50";
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-[13px]" };
  const variants = {
    primary: "bg-accent text-white border-transparent hover:bg-accent-bright disabled:opacity-50 disabled:cursor-not-allowed",
    ghost:   "bg-transparent text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100",
    danger:  "bg-transparent text-red-400 border-red-400/30 hover:bg-red-500/10",
  };
  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="spinner" />}
      {children}
    </button>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export function Card({
  children,
  className = "",
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}
export function Input({ className = "", ...props }: InputProps) {
  return (
    <input
      className={`w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-md px-3 py-2 text-[13px] text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-accent transition-colors font-mono ${className}`}
      {...props}
    />
  );
}

// ─── Textarea — forwardRef so rag/page can attach a ref ───────────────────────

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
}
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = "", ...props }, ref) => (
    <textarea
      ref={ref}
      className={`w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-md px-3 py-2 text-[13px] text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-accent transition-colors font-mono resize-vertical ${className}`}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

// ─── Select ───────────────────────────────────────────────────────────────────

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  className?: string;
}
export function Select({ className = "", children, ...props }: SelectProps) {
  return (
    <select
      className={`bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-md px-3 py-2 text-[13px] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-accent transition-colors font-mono cursor-pointer ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

// ─── Label ────────────────────────────────────────────────────────────────────

export function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5 font-mono ${className}`}>
      {children}
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

export function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <Card className="p-3">
      <div className={`text-2xl font-bold ${color ?? "text-zinc-900 dark:text-zinc-100"}`}>{value}</div>
      <div className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mt-0.5 capitalize">{label}</div>
    </Card>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

export function EmptyState({ icon, title, description, action }: {
  icon: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg">
      <div className="text-4xl">{icon}</div>
      <div>
        <div className="text-sm text-zinc-600 dark:text-zinc-400 font-medium mb-1">{title}</div>
        <div className="text-xs text-zinc-400 dark:text-zinc-600">{description}</div>
      </div>
      {action}
    </div>
  );
}
