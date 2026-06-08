import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(__dirname, "../../data/assessment.db");

let db: Database.Database;

export function getDB(): Database.Database {
  if (!db) throw new Error("Database not initialized. Call initDB() first.");
  return db;
}

export function initDB(): Database.Database {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS tickets (
      id            TEXT PRIMARY KEY,
      raw_input     TEXT NOT NULL,
      category      TEXT NOT NULL DEFAULT 'general',
      priority      TEXT NOT NULL DEFAULT 'medium',
      sentiment     TEXT NOT NULL DEFAULT 'neutral',
      summary       TEXT,
      key_fields    TEXT NOT NULL DEFAULT '{}',
      suggested_reply TEXT,
      model_raw_output TEXT,
      parse_error   TEXT,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_tickets_category   ON tickets(category);
    CREATE INDEX IF NOT EXISTS idx_tickets_priority   ON tickets(priority);
    CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at);

    CREATE TABLE IF NOT EXISTS documents (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      content     TEXT NOT NULL,
      chunk_index INTEGER NOT NULL DEFAULT 0,
      source      TEXT,
      embedding   TEXT NOT NULL DEFAULT '{}',
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_documents_title ON documents(title);

    CREATE TABLE IF NOT EXISTS chat_messages (
      id          TEXT PRIMARY KEY,
      session_id  TEXT NOT NULL,
      role        TEXT NOT NULL CHECK(role IN ('user','assistant')),
      content     TEXT NOT NULL,
      citations   TEXT NOT NULL DEFAULT '[]',
      grounded    INTEGER NOT NULL DEFAULT 1,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_chat_session ON chat_messages(session_id);
  `);

  console.log(`✅ Database ready at ${DB_PATH}`);
  return db;
}
