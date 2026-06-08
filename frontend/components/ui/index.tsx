import React from "react";

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
