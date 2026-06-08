import { v4 as uuidv4 } from "uuid";
import { getDB } from "./db";
import { chat } from "./ollama";
import type {
  DocumentRow,
  DocumentSummary,
  RetrievalResult,
  RAGResponse,
  OllamaMessage,
  Citation,
} from "../types/index";

// ─── TF-IDF helpers ───────────────────────────────────────────────────────────

type TFVector = Record<string, number>;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function buildTFVector(tokens: string[]): TFVector {
  const tf: TFVector = {};
  const total = tokens.length || 1;
  for (const t of tokens) tf[t] = ((tf[t] ?? 0) + 1) / total;
  return tf;
}

function cosineSimilarity(a: TFVector, b: TFVector): number {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let dot = 0, magA = 0, magB = 0;
  for (const k of keys) {
    const av = a[k] ?? 0;
    const bv = b[k] ?? 0;
    dot += av * bv;
    magA += av * av;
    magB += bv * bv;
  }
  return magA && magB ? dot / (Math.sqrt(magA) * Math.sqrt(magB)) : 0;
}

// ─── Retrieval ────────────────────────────────────────────────────────────────

/**
 * "Not in knowledge base" threshold = cosine similarity < 0.08
 * Rationale: below this score, term overlap is near-zero — the model would
 * hallucinate rather than ground. See decision-memo.md for full reasoning.
 */
const RELEVANCE_THRESHOLD = 0.08;
const TOP_K = 3;

export function retrieveChunks(query: string, topK = TOP_K): RetrievalResult {
  const db = getDB();
  const docs = db.prepare("SELECT * FROM documents").all() as DocumentRow[];

  if (!docs.length) return { chunks: [], belowThreshold: true, topScore: 0 };

  const qVec = buildTFVector(tokenize(query));

  const scored = docs
    .map((doc) => {
      let embedding: TFVector;
      try {
        embedding = JSON.parse(doc.embedding) as TFVector;
      } catch {
        embedding = buildTFVector(tokenize(doc.content));
      }
      return { ...doc, score: cosineSimilarity(qVec, embedding) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  const relevant = scored.filter((d) => d.score >= RELEVANCE_THRESHOLD);
  return {
    chunks: relevant,
    belowThreshold: relevant.length === 0,
    topScore: scored[0]?.score ?? 0,
  };
}

// ─── Prompts ──────────────────────────────────────────────────────────────────

const RAG_SYSTEM = (contextBlock: string) => `\
You are a knowledgeable assistant. Answer questions using ONLY the context documents below.

Rules:
1. Base your answer solely on the provided context.
2. If the answer is not in the context, say exactly: "I don't have information about that in my knowledge base."
3. Cite documents inline as [Doc 1], [Doc 2], etc.
4. Be concise and factual — do not invent details.

=== CONTEXT DOCUMENTS ===
${contextBlock}
=== END CONTEXT ===`;

const NO_CONTEXT_SYSTEM = `\
You are a helpful assistant. No relevant documents were found in the knowledge base for the user's question.
Politely inform the user that you don't have information on that topic in your knowledge base, and suggest they try rephrasing or ask about a different topic.`;

// ─── RAG generation ───────────────────────────────────────────────────────────

export async function answerQuestion(
  question: string,
  sessionHistory: OllamaMessage[]
): Promise<Omit<RAGResponse, "sessionId">> {
  const { chunks, belowThreshold, topScore } = retrieveChunks(question);

  const contextBlock = chunks
    .map((c, i) => `[Doc ${i + 1}] Title: ${c.title}\nSource: ${c.source ?? "uploaded"}\n\n${c.content}`)
    .join("\n\n---\n\n");

  const grounded = !belowThreshold;

  const messages: OllamaMessage[] = [
    {
      role: "system",
      content: grounded ? RAG_SYSTEM(contextBlock) : NO_CONTEXT_SYSTEM,
    },
    ...sessionHistory.slice(-6),
    { role: "user", content: question },
  ];

  const answer = await chat(messages, { temperature: 0.15, max_tokens: 800 });

  const citations: Citation[] = chunks.map((c) => ({
    id: c.id,
    title: c.title,
    source: c.source,
    score: c.score,
  }));

  return { answer, grounded, citations, topScore };
}

// ─── Document ingestion ───────────────────────────────────────────────────────

function chunkText(text: string, chunkSize = 500, overlap = 50): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let i = 0;
  while (i < words.length) {
    chunks.push(words.slice(i, i + chunkSize).join(" "));
    i += chunkSize - overlap;
  }
  return chunks;
}

export function ingestDocument(
  title: string,
  content: string,
  source: string | null = null
): { ids: string[]; chunkCount: number } {
  const db = getDB();
  const chunks = chunkText(content);
  const ids: string[] = [];

  const stmt = db.prepare(`
    INSERT INTO documents (id, title, content, chunk_index, source, embedding)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (let i = 0; i < chunks.length; i++) {
    const id = uuidv4();
    const embedding = JSON.stringify(buildTFVector(tokenize(chunks[i])));
    stmt.run(id, title, chunks[i], i, source, embedding);
    ids.push(id);
  }

  return { ids, chunkCount: chunks.length };
}

export function listDocuments(): DocumentSummary[] {
  const db = getDB();
  const rows = db
    .prepare(
      `SELECT title, source, chunk_index, created_at
       FROM documents
       ORDER BY title, chunk_index`
    )
    .all() as Array<{ title: string; source: string | null; chunk_index: number; created_at: string }>;

  const grouped: Record<string, DocumentSummary> = {};
  for (const r of rows) {
    if (!grouped[r.title]) {
      grouped[r.title] = {
        title: r.title,
        source: r.source,
        chunkCount: 0,
        createdAt: r.created_at,
      };
    }
    grouped[r.title].chunkCount++;
  }

  return Object.values(grouped);
}

export function deleteDocument(title: string): number {
  const db = getDB();
  const result = db.prepare("DELETE FROM documents WHERE title = ?").run(title);
  return result.changes;
}
