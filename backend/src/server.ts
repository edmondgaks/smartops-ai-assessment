import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { initDB } from "./services/db";
import { log } from "./services/logger";
import triageRouter from "./routes/triage";
import modelsRouter from "./routes/models";
import ragRouter from "./routes/rag";

const app = express();
const PORT = Number(process.env.PORT ?? 3001);
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:3000";

app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json({ limit: "10mb" }));

// ─── Global request/response logger ──────────────────────────────────────────
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const { method, originalUrl } = req;

  // Skip noisy health-check polling from logs
  if (originalUrl !== "/health") {
    log.req(method, originalUrl);
  }

  res.on("finish", () => {
    if (originalUrl !== "/health") {
      log.res(method, originalUrl, res.statusCode, Date.now() - start);
    }
  });

  next();
});

// ─── Health ───────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", ts: new Date().toISOString() });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/triage",  triageRouter);
app.use("/api/models",  modelsRouter);
app.use("/api/rag",     ragRouter);

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  log.error("Server", "Unhandled error", err instanceof Error ? err : new Error(String(err)));
  res.status(500).json({ error: "Internal server error" });
});

// ─── Bootstrap ────────────────────────────────────────────────────────────────
initDB();

app.listen(PORT, () => {
  log.success("Server", `Backend listening`, { url: `http://localhost:${PORT}`, frontend: FRONTEND_URL });
  log.info("Server", "Ollama target", { url: process.env.OLLAMA_URL ?? "http://localhost:11434" });
  log.info("Server", "Routes mounted", { routes: ["/api/triage", "/api/models", "/api/rag"] });
});
