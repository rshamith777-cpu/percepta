import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import type { DatabaseSync } from 'node:sqlite';

let db: DatabaseSync | null = null;

function loadDatabaseSync(): typeof DatabaseSync {
  const require = createRequire(import.meta.url);
  return (require('node:sqlite') as typeof import('node:sqlite')).DatabaseSync;
}

function resolveDbPath(): string {
  const url = (process.env.DATABASE_URL ?? 'file:./dev.db').trim();
  if (url.startsWith('file:')) {
    const p = url.slice('file:'.length);
    return path.isAbsolute(p) ? p : path.join(/*turbopackIgnore: true*/ process.cwd(), p);
  }
  return path.isAbsolute(url) ? url : path.join(/*turbopackIgnore: true*/ process.cwd(), url);
}

export function getSqliteDb(): DatabaseSync {
  if (db) return db;
  const dbPath = resolveDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const DatabaseSyncCtor = loadDatabaseSync();
  db = new DatabaseSyncCtor(dbPath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  migrate(db);
  return db;
}

export function closeSqliteDb(): void {
  if (db) { try { db.close(); } catch { /* ignore */ } db = null; }
}

function migrate(database: DatabaseSync) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);
  const applied = new Set(
    database.prepare('SELECT id FROM schema_migrations').all().map((r) => String((r as { id: string }).id)),
  );
  const migrations: Array<{ id: string; sql: string }> = [
    {
      id: '001_maintenance_records',
      sql: `
        CREATE TABLE IF NOT EXISTS maintenance_records (
          id TEXT PRIMARY KEY,
          idempotency_key TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          status TEXT NOT NULL,
          diagnosis_blocked INTEGER NOT NULL DEFAULT 0,
          problem_description TEXT NOT NULL,
          payload_json TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_maintenance_updated ON maintenance_records(updated_at DESC);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_maintenance_idempotency ON maintenance_records(idempotency_key) WHERE idempotency_key IS NOT NULL;
        CREATE TABLE IF NOT EXISTS maintenance_audit (
          id TEXT PRIMARY KEY,
          record_id TEXT NOT NULL,
          at TEXT NOT NULL,
          event_json TEXT NOT NULL,
          FOREIGN KEY(record_id) REFERENCES maintenance_records(id) ON DELETE CASCADE
        );
      `,
    },
    {
      id: '002_users_sessions',
      sql: `
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'technician',
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          created_at TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          revoked_at TEXT,
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `,
    },
  ];
  for (const m of migrations) {
    if (applied.has(m.id)) continue;
    database.exec('BEGIN');
    try {
      database.exec(m.sql);
      database.prepare('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)').run(m.id, new Date().toISOString());
      database.exec('COMMIT');
    } catch (e) {
      database.exec('ROLLBACK');
      throw e;
    }
  }
}
