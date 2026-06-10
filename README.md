
# SmartOPS Self-Hosted LLM Platform — Full Stack Technical Assessment

Two AI features powered by a **fully self-hosted** open-source LLM (Llama 3.2 via Ollama).
No cloud APIs. No cost per inference.

---

## Quick Start — Windows

### Prerequisites

| Tool | Version | Download |
|------|---------|----------|
| Node.js | 20 LTS | https://nodejs.org |
| Ollama | latest | https://ollama.com/download |

Install both, then open **PowerShell** (not cmd) in the project folder.

---

### Option A — PowerShell (recommended)

```powershell
# 1. Allow local scripts to run (one-time)
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned

# 2. Install everything + pull the model (~2 GB, one-time download)
.\scripts\setup.ps1

# 3. Start all services (opens 2 extra PowerShell windows)
.\scripts\start.ps1
```

Opens http://localhost:3000 automatically.

---

### Option B — Batch file (if you prefer cmd.exe)

```bat
scripts\start.bat
```

> Make sure Ollama is already installed and `ollama` is in your PATH.

---

### Option C — Docker Desktop (zero Node.js required)

Install [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/), then:

```powershell
docker-compose up -d
```

Wait ~60 s for the model to download on first run:

```powershell
docker-compose logs -f ollama-pull
```

Then open http://localhost:3000.

---

### Option D — Manual (full control)

Open **three** PowerShell terminals:

**Terminal 1 — Ollama**
```powershell
ollama serve
# In a second tab/window:
ollama pull llama3.2
```

**Terminal 2 — Backend**
```powershell
cd backend
npm install
npm run dev        # → http://localhost:3001
```

**Terminal 3 — Frontend**
```powershell
cd frontend
npm install
npm run dev        # → http://localhost:3000
```

---

**Alternative models** (trade speed vs quality):

```powershell
ollama pull llama3.2:1b    # 1B params — fastest, lowest RAM (~1.5 GB)
ollama pull llama3.2       # 3B params — default, balanced (2.0 GB)
ollama pull qwen2.5        # 3B — good multilingual support
ollama pull phi3           # 3.8B — strong reasoning, Microsoft
```

---

## Architecture

```
Browser
   │ HTTP :3000
   ▼
Next.js 14 Frontend
   │ REST :3001
   ▼
Node.js + Express Backend
   ├── /api/triage   ──► Triage Service (structured JSON generation)
   ├── /api/rag      ──► RAG Service (TF-IDF retrieval + grounded Q&A)
   └── /api/models   ──► Health check
          │ HTTP :11434
          ▼
   Ollama (llama3.2 — Q4_K_M GGUF, local inference)
          │
   SQLite (WAL mode)
   tickets · documents · chat_messages
```

### Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| LLM | Llama 3.2 (3B) via Ollama | Free, CPU-friendly, strong JSON following |
| Backend | Node.js 20 + Express | Lightweight, ESM modules |
| Frontend | Next.js 14 (App Router) | File-based routing, production-ready |
| Database | SQLite + better-sqlite3 | Zero setup, WAL for concurrency |
| Retrieval | TF-IDF cosine similarity | No external service, explainable |

---

## Use Case 1 — Smart Intake Triage

**UI:** http://localhost:3000/triage

Submit unstructured support text → structured JSON with:

```json
{
  "category": "billing",
  "priority": "high",
  "sentiment": "negative",
  "summary": "User double-charged for subscription this month.",
  "key_fields": {
    "contact_info": "jane@example.com",
    "product_mentioned": "subscription",
    "deadline_mentioned": null,
    "error_code": null
  },
  "suggested_reply": "Hi Jane, I'm sorry about the duplicate charge…"
}
```

**JSON error recovery:** 3 layers — direct parse → strip markdown fences → extract `{...}` substring → safe fallback (never crashes the app).

---

## Use Case 2 — Grounded Knowledge Assistant

**UI:** http://localhost:3000/rag

1. Add documents (paste text or upload `.txt` files), or click **Load Sample KB**
2. Ask questions — answers cite which document they came from
3. When nothing relevant is found (cosine score < 0.08), the model explicitly says so instead of hallucinating

---

## API Reference

### Triage
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/triage` | Submit + classify a ticket |
| GET | `/api/triage` | List tickets (`?category=billing&priority=high&search=...`) |
| GET | `/api/triage/stats` | Dashboard stats |
| DELETE | `/api/triage/:id` | Delete ticket |

### RAG
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/rag/chat` | Ask a question |
| GET | `/api/rag/documents` | List documents |
| POST | `/api/rag/documents` | Add document (`{title, content}`) |
| POST | `/api/rag/documents/upload` | Upload `.txt` file |
| DELETE | `/api/rag/documents/:title` | Remove document |



## Project Structure

```
smartops-assessment/
├── backend/
│   ├── server.js              # Express entrypoint
│   ├── routes/
│   │   ├── triage.js          # Triage CRUD
│   │   ├── rag.js             # RAG chat + document management
│   │   └── models.js          # Health check
│   ├── services/
│   │   ├── db.js              # SQLite init + schema
│   │   ├── ollama.js          # Ollama HTTP client
│   │   ├── triage.js          # Prompt + 3-layer JSON recovery
│   │   └── rag.js             # TF-IDF retrieval + RAG generation
│   └── package.json
├── frontend/
│   ├── app/
│   │   ├── layout.js          # Root layout + nav
│   │   ├── page.js            # Home / landing
│   │   ├── triage/page.js     # Triage dashboard UI
│   │   └── rag/page.js        # Knowledge chat UI
│   ├── app/globals.css        # Design system (CSS variables)
│   └── package.json
├── scripts/
│   ├── setup.ps1              # Windows: one-time install
│   ├── start.ps1              # Windows: start all services
│   └── start.bat              # Windows: cmd.exe alternative
├── docs/
│   └── decision-memo.md       # Engineering decisions (1-page)
├── docker-compose.yml
└── README.md
```

---

## Performance (Windows, CPU only)

| CPU | Model | Typical latency |
|-----|-------|----------------|
| Intel i5/i7 (8–16 GB RAM) | llama3.2:3b | 15–30 s |
| Intel i5/i7 (8–16 GB RAM) | llama3.2:1b | 6–12 s |
| Ryzen 7/9 (16–32 GB RAM) | llama3.2:3b | 10–20 s |
| NVIDIA GPU (any) | llama3.2:3b | 1–3 s (auto offload) |

