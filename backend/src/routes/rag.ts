import { Router, Request, Response } from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { answerQuestion, ingestDocument, listDocuments, deleteDocument } from "../services/rag";
import { getDB } from "../services/db";
import type { ChatMessageRow, OllamaMessage } from "../types/index";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// POST /api/rag/chat
router.post("/chat", async (req: Request, res: Response) => {
  const { question, sessionId } = req.body as { question?: string; sessionId?: string };
  if (!question || typeof question !== "string") {
    res.status(400).json({ error: "question is required" });
    return;
  }

  const sid = sessionId ?? uuidv4();
  const db = getDB();

  const history = (
    db.prepare(
      "SELECT role, content FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC LIMIT 10"
    ).all(sid) as Array<{ role: string; content: string }>
  ).map((m): OllamaMessage => ({ role: m.role as "user" | "assistant", content: m.content }));

  try {
    const { answer, grounded, citations, topScore } = await answerQuestion(question, history);

    db.prepare(
      "INSERT INTO chat_messages (id, session_id, role, content, grounded) VALUES (?, ?, ?, ?, ?)"
    ).run(uuidv4(), sid, "user", question, 1);

    db.prepare(
      "INSERT INTO chat_messages (id, session_id, role, content, citations, grounded) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(uuidv4(), sid, "assistant", answer, JSON.stringify(citations), grounded ? 1 : 0);

    res.json({ answer, grounded, citations, topScore, sessionId: sid });
  } catch (err) {
    console.error("RAG error:", err);
    res.status(500).json({ error: "Failed to generate answer", details: (err as Error).message });
  }
});

// GET /api/rag/history/:sessionId
router.get("/history/:sessionId", (req: Request, res: Response) => {
  const db = getDB();
  const messages = (
    db.prepare(
      "SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC"
    ).all(req.params.sessionId) as ChatMessageRow[]
  ).map((m) => ({ ...m, citations: JSON.parse(m.citations || "[]") }));

  res.json(messages);
});

// POST /api/rag/documents
router.post("/documents", (req: Request, res: Response) => {
  const { title, content, source } = req.body as { title?: string; content?: string; source?: string };
  if (!title || !content) {
    res.status(400).json({ error: "title and content are required" });
    return;
  }
  try {
    const result = ingestDocument(title, content, source ?? null);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/rag/documents/upload
router.post("/documents/upload", upload.single("file"), (req: Request, res: Response) => {
  if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }
  const title = (req.body as { title?: string }).title ?? req.file.originalname;
  const content = req.file.buffer.toString("utf-8");
  if (content.trim().length < 10) {
    res.status(400).json({ error: "File appears empty or unreadable" });
    return;
  }
  try {
    const result = ingestDocument(title, content, req.file.originalname);
    res.json({ success: true, title, ...result });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/rag/documents
router.get("/documents", (_req: Request, res: Response) => {
  res.json(listDocuments());
});

// DELETE /api/rag/documents/:title
router.delete("/documents/:title", (req: Request, res: Response) => {
  const deleted = deleteDocument(decodeURIComponent(req.params.title));
  res.json({ success: true, deletedChunks: deleted });
});

export default router;
