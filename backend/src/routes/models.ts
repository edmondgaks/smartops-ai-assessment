import { Router, Request, Response } from "express";
import { checkHealth } from "../services/ollama";

const router = Router();

router.get("/health", async (_req: Request, res: Response) => {
  const health = await checkHealth();
  res.status(health.ok ? 200 : 503).json(health);
});

export default router;
