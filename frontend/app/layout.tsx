import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme";
import { NavBar } from "@/components/NavBar";

export const metadata: Metadata = {
  title: "SmartOps — Self-Hosted AI Platform",
  description: "Smart Intake Triage + Grounded Knowledge Assistant powered by a self-hosted LLM",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 min-h-screen font-mono antialiased">
        <ThemeProvider>
          <NavBar />
          <main className="pt-[52px] min-h-screen">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
