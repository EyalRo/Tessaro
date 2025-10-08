import { DatabaseSync } from "node:sqlite";
import { dirname } from "std/path";
import { ensureDir } from "std/fs";

const DEFAULT_SQLITE_PATH = "./data/admin.sqlite";

export type UserRecord = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateUserInput = {
  name: string;
  email: string;
  role: string;
  avatar_url?: string | null;
};

export type UpdateUserInput = Partial<CreateUserInput>;

type RawUserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

let database: DatabaseSync | null = null;
let initPromise: Promise<void> | null = null;

function normalizeSqlitePath(path: string): string {
  if (path.startsWith("file://")) {
    return new URL(path).pathname;
  }

  return path;
}

function isInMemoryPath(path: string): boolean {
  return path === ":memory:" ||
    path.startsWith("file:") && path.includes("memory");
}

async function ensureDirectoryExists(path: string) {
  if (!path || path === "." || isInMemoryPath(path)) {
    return;
  }

  if (path.includes("://")) {
    return;
  }

  const dir = dirname(path);
  if (!dir || dir === ".") {
    return;
  }

  await ensureDir(dir);
}

function toUserRecord(row: RawUserRow): UserRecord {
  return {
    ...row,
    avatar_url: row.avatar_url ?? null,
  };
}

async function ensureInitialized() {
  if (!initPromise) {
    initPromise = (async () => {
      const sqlitePath = Deno.env.get("SQLITE_PATH") ?? DEFAULT_SQLITE_PATH;
      const normalizedPath = normalizeSqlitePath(sqlitePath);
      await ensureDirectoryExists(normalizedPath);

      database = new DatabaseSync(sqlitePath);
      database.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          role TEXT NOT NULL,
          avatar_url TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
      database.exec(
        "CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);",
      );
    })().catch((error) => {
      initPromise = null;
      throw error;
    });
  }

  await initPromise;
}

function getDatabase(): DatabaseSync {
  if (!database) {
    throw new Error("Database has not been initialized");
  }

  return database;
}

export async function listUsers(): Promise<UserRecord[]> {
  await ensureInitialized();
  const db = getDatabase();
  const statement = db.prepare(
    "SELECT id, name, email, role, avatar_url, created_at, updated_at FROM users ORDER BY created_at ASC",
  );
  const rows = statement.all() as RawUserRow[];
  return rows.map(toUserRecord);
}

export async function getUserById(id: string): Promise<UserRecord | null> {
  await ensureInitialized();
  const db = getDatabase();
  const statement = db.prepare(
    "SELECT id, name, email, role, avatar_url, created_at, updated_at FROM users WHERE id = ?",
  );
  const row = statement.get(id) as RawUserRow | undefined;
  return row ? toUserRecord(row) : null;
}

export async function createUser(
  payload: CreateUserInput,
): Promise<UserRecord> {
  await ensureInitialized();
  const db = getDatabase();
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  const statement = db.prepare(
    `INSERT INTO users (id, name, email, role, avatar_url, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  statement.run(
    id,
    payload.name,
    payload.email,
    payload.role,
    payload.avatar_url ?? null,
    timestamp,
    timestamp,
  );

  const user = await getUserById(id);
  if (!user) {
    throw new Error("Failed to load user after creation");
  }

  return user;
}

export async function updateUser(
  id: string,
  payload: UpdateUserInput,
): Promise<UserRecord | null> {
  await ensureInitialized();
  const db = getDatabase();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (payload.name !== undefined) {
    fields.push("name = ?");
    values.push(payload.name);
  }

  if (payload.email !== undefined) {
    fields.push("email = ?");
    values.push(payload.email);
  }

  if (payload.role !== undefined) {
    fields.push("role = ?");
    values.push(payload.role);
  }

  if (payload.avatar_url !== undefined) {
    fields.push("avatar_url = ?");
    values.push(payload.avatar_url ?? null);
  }

  if (fields.length === 0) {
    return await getUserById(id);
  }

  const updatedAt = new Date().toISOString();
  fields.push("updated_at = ?");
  values.push(updatedAt);
  values.push(id);

  const statement = db.prepare(
    `UPDATE users SET ${fields.join(", ")} WHERE id = ?`,
  );
  const result = statement.run(...(values as never[]));
  if (!result.changes) {
    return null;
  }

  return await getUserById(id);
}

export async function deleteUser(id: string): Promise<boolean> {
  await ensureInitialized();
  const db = getDatabase();
  const statement = db.prepare("DELETE FROM users WHERE id = ?");
  const result = statement.run(id as never);
  return Boolean(result.changes);
}

export async function countUsers(): Promise<number> {
  await ensureInitialized();
  const db = getDatabase();
  const statement = db.prepare(
    "SELECT COUNT(*) as value FROM users",
  );
  const row = statement.get() as { value: number } | undefined;
  if (!row) {
    return 0;
  }

  const value = row.value;
  return typeof value === "number" ? value : Number(value ?? 0);
}

export async function closeDatabase() {
  if (database) {
    database.close();
    database = null;
  }

  initPromise = null;
}
