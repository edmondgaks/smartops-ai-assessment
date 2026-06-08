import express, { Request, Response, NextFunction } from "express";
import cors from "cors";


const app = express();
const PORT = Number(process.env.PORT ?? 3001);
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:3000";

app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json({ limit: "10mb" }));

app.get("/health", (_req, res) => res.json({ status: "ok", ts: new Date().toISOString() }));





app.listen(PORT, () => {
  console.log(`\n✅ Backend → http://localhost:${PORT}`);
});
