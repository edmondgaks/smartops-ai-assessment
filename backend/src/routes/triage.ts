import { Router, Request, Response } from "express";
import { log } from "../services/logger";
import { v4 as uuidv4 } from "uuid";
import { classifyTicket } from "../services/triage";
import { getDB } from "../services/db";
import type { TicketRow } from "../types/index";

const router = Router();

// POST /api/triage — classify a new ticket
router.post("/", async (req: Request, res: Response) => {
  const { text } = req.body as { text?: string };
  if (!text || typeof text !== "string" || text.trim().length < 5) {
    log.warn("TriageRoute", "Invalid ticket payload", { textLength: text?.length });
    res.status(400).json({ error: "text is required (min 5 chars)" });
    return;
  }

  try {
    log.info("TriageRoute", "Classifying ticket", { textLength: text.trim().length });
    const result = await classifyTicket(text.trim());
    const id = uuidv4();
    const db = getDB();

    db.prepare(`
      INSERT INTO tickets
        (id, raw_input, category, priority, sentiment, summary,
         key_fields, suggested_reply, model_raw_output, parse_error)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      text.trim(),
      result.category,
      result.priority,
      result.sentiment,
      result.summary,
      JSON.stringify(result.key_fields),
      result.suggested_reply,
      result.rawOutput,
      result.parseError
    );

    log.success("TriageRoute", "Ticket classified & saved", { id, category: result.category, priority: result.priority });
    res.json({ id, ...result, createdAt: new Date().toISOString() });
  } catch (err) {
    log.error("TriageRoute", "Classification failed", err);
    res.status(500).json({ error: "Classification failed", details: (err as Error).message });
  }
});

// GET /api/triage — list tickets with filters
router.get("/", (req: Request, res: Response) => {
  const { category, priority, sentiment, search, limit = "50", offset = "0" } = req.query as Record<string, string>;
  const db = getDB();

  let query = "SELECT * FROM tickets WHERE 1=1";
  const params: unknown[] = [];

  if (category && category !== "all") { query += " AND category = ?"; params.push(category); }
  if (priority && priority !== "all") { query += " AND priority = ?"; params.push(priority); }
  if (sentiment && sentiment !== "all") { query += " AND sentiment = ?"; params.push(sentiment); }
  if (search) {
    query += " AND (raw_input LIKE ? OR summary LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }

  query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  params.push(Number(limit), Number(offset));

  const tickets = (db.prepare(query).all(...params) as TicketRow[]).map((t) => ({
    ...t,
    key_fields: JSON.parse(t.key_fields || "{}"),
  }));

  const total = (db.prepare("SELECT COUNT(*) as count FROM tickets").get() as { count: number }).count;
  log.info("TriageRoute", "Listed tickets", { count: tickets.length, total, filters: { category, priority, sentiment, search } });
  res.json({ tickets, total });
});

// GET /api/triage/stats
router.get("/stats", (_req: Request, res: Response) => {
  const db = getDB();

  const byCategory = db.prepare("SELECT category, COUNT(*) as count FROM tickets GROUP BY category").all();
  const byPriority = db.prepare("SELECT priority, COUNT(*) as count FROM tickets GROUP BY priority").all();
  const bySentiment = db.prepare("SELECT sentiment, COUNT(*) as count FROM tickets GROUP BY sentiment").all();
  const recentActivity = db.prepare(`
    SELECT date(created_at) as date, COUNT(*) as count
    FROM tickets
    WHERE created_at >= datetime('now', '-7 days')
    GROUP BY date(created_at) ORDER BY date ASC
  `).all();
  const total = (db.prepare("SELECT COUNT(*) as count FROM tickets").get() as { count: number }).count;
  const fallbackCount = (db.prepare("SELECT COUNT(*) as count FROM tickets WHERE parse_error IS NOT NULL").get() as { count: number }).count;

  res.json({ total, byCategory, byPriority, bySentiment, recentActivity, fallbackCount });
});

// GET /api/triage/:id
router.get("/:id", (req: Request, res: Response) => {
  const db = getDB();
  const ticket = db.prepare("SELECT * FROM tickets WHERE id = ?").get(req.params.id) as TicketRow | undefined;
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
  res.json({ ...ticket, key_fields: JSON.parse(ticket.key_fields || "{}") });
});

// DELETE /api/triage/:id
router.delete("/:id", (req: Request, res: Response) => {
  const db = getDB();
  const { changes } = db.prepare("DELETE FROM tickets WHERE id = ?").run(req.params.id);
  if (!changes) { 
    log.warn("TriageRoute", "Delete failed - ticket not found", { id: req.params.id });
    res.status(404).json({ error: "Ticket not found" }); 
    return; 
  }
  log.info("TriageRoute", "Ticket deleted", { id: req.params.id });
  res.json({ success: true });
});

export default router;
