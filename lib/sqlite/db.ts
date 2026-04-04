import path from 'path';
import { mkdir } from 'fs/promises';
import BetterSqlite3 from 'better-sqlite3';
import { initializeSchema } from './schema';

type SqliteBinding = string | number | bigint | Buffer | Uint8Array | null;

export type SqliteRunResult = {
  changes: number;
  lastID: number;
};

export interface SqliteDb {
  all<T = unknown[]>(sql: string, ...params: SqliteBinding[]): Promise<T>;
  get<T = unknown>(sql: string, ...params: SqliteBinding[]): Promise<T | undefined>;
  run(sql: string, ...params: SqliteBinding[]): Promise<SqliteRunResult>;
  exec(sql: string): Promise<void>;
}

class BetterSqliteDbAdapter implements SqliteDb {
  constructor(private readonly db: BetterSqlite3.Database) {}

  async all<T = unknown[]>(sql: string, ...params: SqliteBinding[]): Promise<T> {
    return this.db.prepare(sql).all(...params) as T;
  }

  async get<T = unknown>(sql: string, ...params: SqliteBinding[]): Promise<T | undefined> {
    return this.db.prepare(sql).get(...params) as T | undefined;
  }

  async run(sql: string, ...params: SqliteBinding[]): Promise<SqliteRunResult> {
    const result = this.db.prepare(sql).run(...params);
    return {
      changes: result.changes,
      lastID: Number(result.lastInsertRowid),
    };
  }

  async exec(sql: string): Promise<void> {
    this.db.exec(sql);
  }
}

let dbPromise: Promise<SqliteDb> | null = null;

function getSqliteDbPath(): string {
  return process.env.SQLITE_DB_PATH || path.join(process.cwd(), '.data', 'langbridge.sqlite');
}

export async function getSqliteDb(): Promise<SqliteDb> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const dbPath = getSqliteDbPath();
      await mkdir(path.dirname(dbPath), { recursive: true });

      const rawDb = new BetterSqlite3(dbPath);
      rawDb.pragma('foreign_keys = ON');
      const db = new BetterSqliteDbAdapter(rawDb);

      await initializeSchema(db);
      return db;
    })();
  }

  return dbPromise;
}
