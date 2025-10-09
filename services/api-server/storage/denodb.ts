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
  organizations: OrganizationRecord[];
};

export type CreateUserInput = {
  name: string;
  email: string;
  role: string;
  avatar_url?: string | null;
  organization_ids?: string[];
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

export type OrganizationRecord = {
  id: string;
  name: string;
  plan: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type CreateOrganizationInput = {
  name: string;
  plan: string;
  status: string;
};

export type UpdateOrganizationInput = Partial<CreateOrganizationInput>;

type RawOrganizationRow = {
  id: string;
  name: string;
  plan: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type ServiceRecord = {
  id: string;
  name: string;
  service_type: string;
  status: string;
  organization_count: number;
  created_at: string;
  updated_at: string;
};

export type CreateServiceInput = {
  name: string;
  service_type: string;
  status: string;
  organization_count?: number;
};

export type UpdateServiceInput = Partial<CreateServiceInput>;

type RawServiceRow = {
  id: string;
  name: string;
  service_type: string;
  status: string;
  organization_count: number;
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

function toUserRecord(
  row: RawUserRow,
  organizations: OrganizationRecord[] = [],
): UserRecord {
  return {
    ...row,
    avatar_url: row.avatar_url ?? null,
    organizations,
  };
}

function toOrganizationRecord(row: RawOrganizationRow): OrganizationRecord {
  return { ...row };
}

function toServiceRecord(row: RawServiceRow): ServiceRecord {
  return {
    ...row,
    organization_count: Number.isFinite(row.organization_count)
      ? Number(row.organization_count)
      : 0,
  };
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    if (seen.has(value)) {
      continue;
    }

    seen.add(value);
    result.push(value);
  }

  return result;
}

function normalizeOrganizationIdsInput(
  ids: string[] | undefined,
): string[] {
  if (!ids || ids.length === 0) {
    return [];
  }

  const trimmed = ids
    .filter((value) => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  return uniqueStrings(trimmed);
}

function loadOrganizationsForUsers(
  db: DatabaseSync,
  userIds: string[],
): Map<string, OrganizationRecord[]> {
  const organizationMap = new Map<string, OrganizationRecord[]>();

  if (userIds.length === 0) {
    return organizationMap;
  }

  const placeholders = userIds.map(() => "?").join(", ");
  const statement = db.prepare(
    `SELECT
      uo.user_id as user_id,
      o.id as id,
      o.name as name,
      o.plan as plan,
      o.status as status,
      o.created_at as created_at,
      o.updated_at as updated_at
    FROM user_organizations uo
    INNER JOIN organizations o ON o.id = uo.organization_id
    WHERE uo.user_id IN (${placeholders})
    ORDER BY o.name ASC`,
  );

  const rows = statement.all(...(userIds as never[])) as Array<
    { user_id: string } & RawOrganizationRow
  >;

  for (const row of rows) {
    const organization = toOrganizationRecord(row);
    const bucket = organizationMap.get(row.user_id);

    if (bucket) {
      bucket.push(organization);
    } else {
      organizationMap.set(row.user_id, [organization]);
    }
  }

  return organizationMap;
}

async function ensureInitialized() {
  if (!initPromise) {
    initPromise = (async () => {
      const sqlitePath = Deno.env.get("SQLITE_PATH") ?? DEFAULT_SQLITE_PATH;
      const normalizedPath = normalizeSqlitePath(sqlitePath);
      await ensureDirectoryExists(normalizedPath);

      database = new DatabaseSync(sqlitePath);
      database.exec("PRAGMA foreign_keys = ON;");
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
      database.exec(`
        CREATE TABLE IF NOT EXISTS organizations (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          plan TEXT NOT NULL,
          status TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
      database.exec(
        "CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations (name);",
      );
      database.exec(`
        CREATE TABLE IF NOT EXISTS services (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          service_type TEXT NOT NULL,
          status TEXT NOT NULL,
          organization_count INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
      database.exec(
        "CREATE INDEX IF NOT EXISTS idx_services_name ON services (name);",
      );
      database.exec(`
        CREATE TABLE IF NOT EXISTS user_organizations (
          user_id TEXT NOT NULL,
          organization_id TEXT NOT NULL,
          PRIMARY KEY (user_id, organization_id),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
        );
      `);
      database.exec(
        "CREATE INDEX IF NOT EXISTS idx_user_organizations_org ON user_organizations (organization_id);",
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
  const users = rows.map((row) => toUserRecord(row, []));

  if (users.length === 0) {
    return users;
  }

  const organizationMap = loadOrganizationsForUsers(
    db,
    users.map((user) => user.id),
  );

  for (const user of users) {
    user.organizations = organizationMap.get(user.id) ?? [];
  }

  return users;
}

export async function getUserById(id: string): Promise<UserRecord | null> {
  await ensureInitialized();
  const db = getDatabase();
  const statement = db.prepare(
    "SELECT id, name, email, role, avatar_url, created_at, updated_at FROM users WHERE id = ?",
  );
  const row = statement.get(id) as RawUserRow | undefined;
  if (!row) {
    return null;
  }

  const organizationMap = loadOrganizationsForUsers(db, [id]);
  const organizations = organizationMap.get(id) ?? [];
  return toUserRecord(row, organizations);
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

  if (payload.organization_ids) {
    user.organizations = await replaceUserOrganizations(
      id,
      payload.organization_ids,
    );
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

  if (fields.length === 0 && payload.organization_ids === undefined) {
    return await getUserById(id);
  }

  let statementChanges = 0;

  if (fields.length > 0) {
    const updatedAt = new Date().toISOString();
    fields.push("updated_at = ?");
    values.push(updatedAt);
    values.push(id);

    const statement = db.prepare(
      `UPDATE users SET ${fields.join(", ")} WHERE id = ?`,
    );
    const result = statement.run(...(values as never[]));
    statementChanges = Number(result.changes ?? 0);
  }

  if (payload.organization_ids !== undefined) {
    await replaceUserOrganizations(id, payload.organization_ids ?? []);
  }

  if (fields.length > 0 && statementChanges === 0) {
    return null;
  }

  return await getUserById(id);
}

export async function deleteUser(id: string): Promise<boolean> {
  await ensureInitialized();
  const db = getDatabase();
  const deleteAssociations = db.prepare(
    "DELETE FROM user_organizations WHERE user_id = ?",
  );
  deleteAssociations.run(id as never);
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

export async function listOrganizations(): Promise<OrganizationRecord[]> {
  await ensureInitialized();
  const db = getDatabase();
  const statement = db.prepare(
    "SELECT id, name, plan, status, created_at, updated_at FROM organizations ORDER BY created_at ASC",
  );
  const rows = statement.all() as RawOrganizationRow[];
  return rows.map(toOrganizationRecord);
}

export async function getOrganizationById(
  id: string,
): Promise<OrganizationRecord | null> {
  await ensureInitialized();
  const db = getDatabase();
  const statement = db.prepare(
    "SELECT id, name, plan, status, created_at, updated_at FROM organizations WHERE id = ?",
  );
  const row = statement.get(id) as RawOrganizationRow | undefined;
  return row ? toOrganizationRecord(row) : null;
}

export async function createOrganization(
  payload: CreateOrganizationInput,
): Promise<OrganizationRecord> {
  await ensureInitialized();
  const db = getDatabase();
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  const statement = db.prepare(
    `INSERT INTO organizations (id, name, plan, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  statement.run(
    id,
    payload.name,
    payload.plan,
    payload.status,
    timestamp,
    timestamp,
  );

  const organization = await getOrganizationById(id);
  if (!organization) {
    throw new Error("Failed to load organization after creation");
  }

  return organization;
}

export async function updateOrganization(
  id: string,
  payload: UpdateOrganizationInput,
): Promise<OrganizationRecord | null> {
  await ensureInitialized();
  const db = getDatabase();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (payload.name !== undefined) {
    fields.push("name = ?");
    values.push(payload.name);
  }

  if (payload.plan !== undefined) {
    fields.push("plan = ?");
    values.push(payload.plan);
  }

  if (payload.status !== undefined) {
    fields.push("status = ?");
    values.push(payload.status);
  }

  if (fields.length === 0) {
    return await getOrganizationById(id);
  }

  const updatedAt = new Date().toISOString();
  fields.push("updated_at = ?");
  values.push(updatedAt);
  values.push(id);

  const statement = db.prepare(
    `UPDATE organizations SET ${fields.join(", ")} WHERE id = ?`,
  );
  const result = statement.run(...(values as never[]));
  if (!result.changes) {
    return null;
  }

  return await getOrganizationById(id);
}

export async function deleteOrganization(id: string): Promise<boolean> {
  await ensureInitialized();
  const db = getDatabase();
  const statement = db.prepare(
    "DELETE FROM organizations WHERE id = ?",
  );
  const result = statement.run(id as never);
  return Boolean(result.changes);
}

export async function countOrganizations(): Promise<number> {
  await ensureInitialized();
  const db = getDatabase();
  const statement = db.prepare(
    "SELECT COUNT(*) as value FROM organizations",
  );
  const row = statement.get() as { value: number } | undefined;
  if (!row) {
    return 0;
  }

  const value = row.value;
  return typeof value === "number" ? value : Number(value ?? 0);
}

export async function getOrganizationsByIds(
  ids: string[],
): Promise<OrganizationRecord[]> {
  await ensureInitialized();

  if (ids.length === 0) {
    return [];
  }

  const db = getDatabase();
  const placeholders = ids.map(() => "?").join(", ");
  const statement = db.prepare(
    `SELECT id, name, plan, status, created_at, updated_at FROM organizations WHERE id IN (${placeholders})`,
  );
  const rows = statement.all(...(ids as never[])) as RawOrganizationRow[];
  return rows.map(toOrganizationRecord);
}

export async function replaceUserOrganizations(
  userId: string,
  organizationIds: string[],
): Promise<OrganizationRecord[]> {
  await ensureInitialized();
  const db = getDatabase();
  const normalizedIds = normalizeOrganizationIdsInput(organizationIds);
  const organizations = await getOrganizationsByIds(normalizedIds);

  if (normalizedIds.length !== organizations.length) {
    throw new Error("One or more organizations do not exist");
  }

  db.exec("BEGIN TRANSACTION");
  try {
    const deleteStatement = db.prepare(
      "DELETE FROM user_organizations WHERE user_id = ?",
    );
    deleteStatement.run(userId as never);

    if (normalizedIds.length > 0) {
      const insertStatement = db.prepare(
        "INSERT INTO user_organizations (user_id, organization_id) VALUES (?, ?)",
      );
      for (const organizationId of normalizedIds) {
        insertStatement.run(userId as never, organizationId as never);
      }
    }

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  const organizationMap = loadOrganizationsForUsers(db, [userId]);
  return organizationMap.get(userId) ?? [];
}

export async function listServices(): Promise<ServiceRecord[]> {
  await ensureInitialized();
  const db = getDatabase();
  const statement = db.prepare(
    "SELECT id, name, service_type, status, organization_count, created_at, updated_at FROM services ORDER BY created_at ASC",
  );
  const rows = statement.all() as RawServiceRow[];
  return rows.map(toServiceRecord);
}

export async function getServiceById(
  id: string,
): Promise<ServiceRecord | null> {
  await ensureInitialized();
  const db = getDatabase();
  const statement = db.prepare(
    "SELECT id, name, service_type, status, organization_count, created_at, updated_at FROM services WHERE id = ?",
  );
  const row = statement.get(id) as RawServiceRow | undefined;
  return row ? toServiceRecord(row) : null;
}

export async function createService(
  payload: CreateServiceInput,
): Promise<ServiceRecord> {
  await ensureInitialized();
  const db = getDatabase();
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const organizationCount = Number.isFinite(payload.organization_count)
    ? Number(payload.organization_count)
    : 0;

  const statement = db.prepare(
    `INSERT INTO services (id, name, service_type, status, organization_count, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  statement.run(
    id,
    payload.name,
    payload.service_type,
    payload.status,
    organizationCount,
    timestamp,
    timestamp,
  );

  const service = await getServiceById(id);
  if (!service) {
    throw new Error("Failed to load service after creation");
  }

  return service;
}

export async function updateService(
  id: string,
  payload: UpdateServiceInput,
): Promise<ServiceRecord | null> {
  await ensureInitialized();
  const db = getDatabase();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (payload.name !== undefined) {
    fields.push("name = ?");
    values.push(payload.name);
  }

  if (payload.service_type !== undefined) {
    fields.push("service_type = ?");
    values.push(payload.service_type);
  }

  if (payload.status !== undefined) {
    fields.push("status = ?");
    values.push(payload.status);
  }

  if (payload.organization_count !== undefined) {
    fields.push("organization_count = ?");
    values.push(Number(payload.organization_count));
  }

  if (fields.length === 0) {
    return await getServiceById(id);
  }

  const updatedAt = new Date().toISOString();
  fields.push("updated_at = ?");
  values.push(updatedAt);
  values.push(id);

  const statement = db.prepare(
    `UPDATE services SET ${fields.join(", ")} WHERE id = ?`,
  );
  const result = statement.run(...(values as never[]));
  if (!result.changes) {
    return null;
  }

  return await getServiceById(id);
}

export async function deleteService(id: string): Promise<boolean> {
  await ensureInitialized();
  const db = getDatabase();
  const statement = db.prepare(
    "DELETE FROM services WHERE id = ?",
  );
  const result = statement.run(id as never);
  return Boolean(result.changes);
}

export async function countServices(): Promise<number> {
  await ensureInitialized();
  const db = getDatabase();
  const statement = db.prepare(
    "SELECT COUNT(*) as value FROM services",
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
