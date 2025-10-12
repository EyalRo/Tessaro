import { SQL, randomUUIDv7 } from "bun";

const sql = new SQL("sqlite://:memory:");

export const TESSARO_ORGANIZATION_ID = "org_tessaro";
const TESSARO_ORGANIZATION_NAME = "Tessaro";
const TESSARO_ORGANIZATION_PLAN = "enterprise";
const TESSARO_ORGANIZATION_STATUS = "active";

export const USER_MANAGEMENT_SERVICE_ID = "svc_user_management";
const USER_MANAGEMENT_SERVICE_NAME = "User Management";
const USER_MANAGEMENT_SERVICE_TYPE = "user_management";
const USER_MANAGEMENT_SERVICE_STATUS = "active";
const USER_MANAGEMENT_SERVICE_DESCRIPTION = "Manage organization users and access";

export type OrganizationRecord = {
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
  description: string | null;
};

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

export type CreateOrganizationInput = {
  name: string;
  plan: string;
  status: string;
};

export type UpdateOrganizationInput = Partial<CreateOrganizationInput>;

export type CreateServiceInput = {
  name: string;
  service_type: string;
  status: string;
  organization_count?: number;
  description?: string | null;
};

export type UpdateServiceInput = Partial<CreateServiceInput>;

export type SessionRecord = {
  token_hash: string;
  user_id: string;
  issued_at: string;
  expires_at: string;
};

const ISO = () => new Date().toISOString();

function toOrganization(row: any): OrganizationRecord {
  return {
    id: row.id,
    name: row.name,
    plan: row.plan,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  } satisfies OrganizationRecord;
}

function toService(row: any): ServiceRecord {
  return {
    id: row.id,
    name: row.name,
    service_type: row.service_type,
    status: row.status,
    organization_count: Number(row.organization_count ?? 0),
    created_at: row.created_at,
    updated_at: row.updated_at,
    description: row.description ?? null,
  } satisfies ServiceRecord;
}

function toUser(row: any, organizations: OrganizationRecord[] = []): UserRecord {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    avatar_url: row.avatar_url ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    organizations,
  } satisfies UserRecord;
}

function uniqueValues(values: string[] | undefined): string[] | undefined {
  if (!values) {
    return undefined;
  }

  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    result.push(trimmed);
  }

  return result;
}

function getAffected(result: any): number {
  if (!result) {
    return 0;
  }

  if (typeof result.affectedRows === "number") {
    return result.affectedRows;
  }

  if (typeof result.changes === "number") {
    return result.changes;
  }

  return 0;
}

async function ensureOrganizationsExist(executor: SQL, ids: string[]) {
  if (ids.length === 0) {
    return;
  }

  const missing: string[] = [];
  for (const organizationId of ids) {
    const [row] = await executor`
      SELECT id
      FROM organizations
      WHERE id = ${organizationId}
      LIMIT 1;
    `;

    if (!row) {
      missing.push(organizationId);
    }
  }

  if (missing.length > 0) {
    throw new Error(`organizations do not exist: ${missing.join(", ")}`);
  }
}

async function seedTessaroOrganization(executor: SQL = sql): Promise<OrganizationRecord> {
  const now = ISO();

  await executor`
    INSERT OR IGNORE INTO organizations (id, name, plan, status, created_at, updated_at)
    VALUES (
      ${TESSARO_ORGANIZATION_ID},
      ${TESSARO_ORGANIZATION_NAME},
      ${TESSARO_ORGANIZATION_PLAN},
      ${TESSARO_ORGANIZATION_STATUS},
      ${now},
      ${now}
    );
  `;

  await executor`
    UPDATE organizations
    SET
      name = ${TESSARO_ORGANIZATION_NAME},
      plan = ${TESSARO_ORGANIZATION_PLAN},
      status = ${TESSARO_ORGANIZATION_STATUS},
      updated_at = CASE
        WHEN name != ${TESSARO_ORGANIZATION_NAME}
          OR plan != ${TESSARO_ORGANIZATION_PLAN}
          OR status != ${TESSARO_ORGANIZATION_STATUS}
        THEN ${now}
        ELSE updated_at
      END
    WHERE id = ${TESSARO_ORGANIZATION_ID};
  `;

  const [row] = await executor`
    SELECT id, name, plan, status, created_at, updated_at
    FROM organizations
    WHERE id = ${TESSARO_ORGANIZATION_ID}
    LIMIT 1;
  `;

  if (!row) {
    throw new Error("failed to seed Tessaro organization");
  }

  return toOrganization(row);
}

async function seedUserManagementService(executor: SQL = sql): Promise<ServiceRecord> {
  const now = ISO();

  await executor`
    INSERT OR IGNORE INTO services (id, name, service_type, status, organization_count, description, created_at, updated_at)
    VALUES (
      ${USER_MANAGEMENT_SERVICE_ID},
      ${USER_MANAGEMENT_SERVICE_NAME},
      ${USER_MANAGEMENT_SERVICE_TYPE},
      ${USER_MANAGEMENT_SERVICE_STATUS},
      1,
      ${USER_MANAGEMENT_SERVICE_DESCRIPTION},
      ${now},
      ${now}
    );
  `;

  await executor`
    UPDATE services
    SET
      name = ${USER_MANAGEMENT_SERVICE_NAME},
      service_type = ${USER_MANAGEMENT_SERVICE_TYPE},
      status = ${USER_MANAGEMENT_SERVICE_STATUS},
      description = ${USER_MANAGEMENT_SERVICE_DESCRIPTION},
      organization_count = CASE
        WHEN organization_count < 1 THEN 1
        ELSE organization_count
      END,
      updated_at = CASE
        WHEN name != ${USER_MANAGEMENT_SERVICE_NAME}
          OR service_type != ${USER_MANAGEMENT_SERVICE_TYPE}
          OR status != ${USER_MANAGEMENT_SERVICE_STATUS}
          OR organization_count < 1
        THEN ${now}
        ELSE updated_at
      END
    WHERE id = ${USER_MANAGEMENT_SERVICE_ID};
  `;

  const [row] = await executor`
    SELECT id, name, service_type, status, organization_count, description, created_at, updated_at
    FROM services
    WHERE id = ${USER_MANAGEMENT_SERVICE_ID}
    LIMIT 1;
  `;

  if (!row) {
    throw new Error("failed to seed user management service");
  }

  return toService(row);
}

async function seedOrganizationServiceLink(
  executor: SQL = sql,
  organizationId: string = TESSARO_ORGANIZATION_ID,
  serviceId: string = USER_MANAGEMENT_SERVICE_ID,
) {
  await executor`
    INSERT OR IGNORE INTO organization_services (organization_id, service_id)
    VALUES (${organizationId}, ${serviceId});
  `;
}

async function seedDefaultRecords() {
  await seedTessaroOrganization();
  await seedUserManagementService();
  await seedOrganizationServiceLink();
}

export async function initializeDatabase() {
  await sql`
    PRAGMA foreign_keys = ON;
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL,
      avatar_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      plan TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      service_type TEXT NOT NULL,
      status TEXT NOT NULL,
      organization_count INTEGER DEFAULT 0,
      description TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS user_organizations (
      user_id TEXT NOT NULL,
      organization_id TEXT NOT NULL,
      PRIMARY KEY (user_id, organization_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS organization_services (
      organization_id TEXT NOT NULL,
      service_id TEXT NOT NULL,
      PRIMARY KEY (organization_id, service_id),
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      issued_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS metrics (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `;

  await seedDefaultRecords();
}

export async function listUsers(): Promise<UserRecord[]> {
  const rows = await sql`
    SELECT
      u.id AS user_id,
      u.name AS user_name,
      u.email,
      u.role,
      u.avatar_url,
      u.created_at AS user_created_at,
      u.updated_at AS user_updated_at,
      o.id AS org_id,
      o.name AS org_name,
      o.plan AS org_plan,
      o.status AS org_status,
      o.created_at AS org_created_at,
      o.updated_at AS org_updated_at
    FROM users u
    LEFT JOIN user_organizations uo ON uo.user_id = u.id
    LEFT JOIN organizations o ON o.id = uo.organization_id
    ORDER BY u.created_at DESC;
  `;

  const map = new Map<string, UserRecord>();

  for (const row of rows) {
    const organization = row.org_id
      ? toOrganization({
          id: row.org_id,
          name: row.org_name,
          plan: row.org_plan,
          status: row.org_status,
          created_at: row.org_created_at,
          updated_at: row.org_updated_at,
        })
      : undefined;

    const userId = row.user_id;
    const existing = map.get(userId);

    if (!existing) {
      map.set(
        userId,
        toUser(
          {
            id: userId,
            name: row.user_name,
            email: row.email,
            role: row.role,
            avatar_url: row.avatar_url,
            created_at: row.user_created_at,
            updated_at: row.user_updated_at,
          },
          organization ? [organization] : [],
        ),
      );
      continue;
    }

    if (organization) {
      existing.organizations.push(organization);
    }
  }

  return Array.from(map.values());
}

export async function getUserById(id: string): Promise<UserRecord | null> {
  const [userRow] = await sql`
    SELECT id, name, email, role, avatar_url, created_at, updated_at
    FROM users
    WHERE id = ${id}
    LIMIT 1;
  `;

  if (!userRow) {
    return null;
  }

  const organizations = await sql`
    SELECT o.id, o.name, o.plan, o.status, o.created_at, o.updated_at
    FROM organizations o
    INNER JOIN user_organizations uo ON uo.organization_id = o.id
    WHERE uo.user_id = ${id}
    ORDER BY o.name;
  `;

  return toUser(userRow, organizations.map(toOrganization));
}

export async function getUserByEmail(email: string): Promise<UserRecord | null> {
  const [userRow] = await sql`
    SELECT id, name, email, role, avatar_url, created_at, updated_at
    FROM users
    WHERE email = ${email}
    LIMIT 1;
  `;

  if (!userRow) {
    return null;
  }

  return getUserById(userRow.id);
}

export async function createUser(input: CreateUserInput): Promise<UserRecord> {
  const id = randomUUIDv7();
  const now = ISO();
  const organizationIds = uniqueValues(input.organization_ids) ?? [];

  await sql.begin(async (tx) => {
    await ensureOrganizationsExist(tx, organizationIds);

    await tx`
      INSERT INTO users (id, name, email, role, avatar_url, created_at, updated_at)
      VALUES (${id}, ${input.name}, ${input.email}, ${input.role}, ${input.avatar_url ?? null}, ${now}, ${now});
    `;

    if (organizationIds.length > 0) {
      for (const organizationId of organizationIds) {
        await tx`
          INSERT OR IGNORE INTO user_organizations (user_id, organization_id)
          VALUES (${id}, ${organizationId});
        `;
      }
    }
  });

  return (await getUserById(id))!;
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<UserRecord | null> {
  const existing = await getUserById(id);
  if (!existing) {
    return null;
  }

  const organizationIds = uniqueValues(input.organization_ids);
  const now = ISO();
  const avatar = input.avatar_url ?? existing.avatar_url;

  await sql.begin(async (tx) => {
    await tx`
      UPDATE users
      SET name = ${input.name ?? existing.name},
          email = ${input.email ?? existing.email},
          role = ${input.role ?? existing.role},
          avatar_url = ${avatar},
          updated_at = ${now}
      WHERE id = ${id};
    `;

    if (organizationIds) {
      await ensureOrganizationsExist(tx, organizationIds);

      await tx`
        DELETE FROM user_organizations WHERE user_id = ${id};
      `;

      for (const organizationId of organizationIds) {
        await tx`
          INSERT OR IGNORE INTO user_organizations (user_id, organization_id)
          VALUES (${id}, ${organizationId});
        `;
      }
    }
  });

  return getUserById(id);
}

export async function deleteUser(id: string): Promise<boolean> {
  const result = await sql`
    DELETE FROM users WHERE id = ${id};
  `;
  return getAffected(result) > 0;
}

export async function countUsers(): Promise<number> {
  const [row] = await sql`
    SELECT COUNT(*) AS count FROM users;
  `;
  return Number(row?.count ?? 0);
}

export async function countOrganizations(): Promise<number> {
  const [row] = await sql`
    SELECT COUNT(*) AS count FROM organizations;
  `;
  return Number(row?.count ?? 0);
}

export async function countServices(): Promise<number> {
  const [row] = await sql`
    SELECT COUNT(*) AS count FROM services;
  `;
  return Number(row?.count ?? 0);
}

export async function listOrganizations(): Promise<OrganizationRecord[]> {
  const rows = await sql`
    SELECT id, name, plan, status, created_at, updated_at
    FROM organizations
    ORDER BY created_at DESC;
  `;
  return rows.map(toOrganization);
}

export async function getOrganizationById(id: string): Promise<OrganizationRecord | null> {
  const [row] = await sql`
    SELECT id, name, plan, status, created_at, updated_at
    FROM organizations
    WHERE id = ${id}
    LIMIT 1;
  `;
  return row ? toOrganization(row) : null;
}

export async function createOrganization(input: CreateOrganizationInput): Promise<OrganizationRecord> {
  const id = randomUUIDv7();
  const now = ISO();

  await sql`
    INSERT INTO organizations (id, name, plan, status, created_at, updated_at)
    VALUES (${id}, ${input.name}, ${input.plan}, ${input.status}, ${now}, ${now});
  `;

  return (await getOrganizationById(id))!;
}

export async function updateOrganization(id: string, input: UpdateOrganizationInput): Promise<OrganizationRecord | null> {
  const existing = await getOrganizationById(id);
  if (!existing) {
    return null;
  }

  const now = ISO();

  await sql`
    UPDATE organizations
    SET name = ${input.name ?? existing.name},
        plan = ${input.plan ?? existing.plan},
        status = ${input.status ?? existing.status},
        updated_at = ${now}
    WHERE id = ${id};
  `;

  return getOrganizationById(id);
}

export async function deleteOrganization(id: string): Promise<boolean> {
  const result = await sql`
    DELETE FROM organizations WHERE id = ${id};
  `;
  return getAffected(result) > 0;
}

export async function listServices(): Promise<ServiceRecord[]> {
  const rows = await sql`
    SELECT id, name, service_type, status, organization_count, description, created_at, updated_at
    FROM services
    ORDER BY created_at DESC;
  `;
  return rows.map(toService);
}

export async function listServicesForOrganizations(organizationIds: string[]): Promise<ServiceRecord[]> {
  const unique = Array.from(new Set(organizationIds.filter((id) => typeof id === "string" && id.trim().length > 0)));
  if (unique.length === 0) {
    return [];
  }

  const serviceMap = new Map<string, ServiceRecord>();

  for (const organizationId of unique) {
    const rows = await sql`
      SELECT s.id, s.name, s.service_type, s.status, s.organization_count, s.description, s.created_at, s.updated_at
      FROM services s
      INNER JOIN organization_services os ON os.service_id = s.id
      WHERE os.organization_id = ${organizationId}
      ORDER BY s.name;
    `;

    for (const row of rows) {
      const service = toService(row);
      if (!serviceMap.has(service.id)) {
        serviceMap.set(service.id, service);
      }
    }
  }

  return Array.from(serviceMap.values());
}

export async function getServiceById(id: string): Promise<ServiceRecord | null> {
  const [row] = await sql`
    SELECT id, name, service_type, status, organization_count, description, created_at, updated_at
    FROM services
    WHERE id = ${id}
    LIMIT 1;
  `;
  return row ? toService(row) : null;
}

export async function createService(input: CreateServiceInput): Promise<ServiceRecord> {
  const id = randomUUIDv7();
  const now = ISO();
  const count = input.organization_count ?? 0;
  const description = input.description ?? null;

  await sql`
    INSERT INTO services (id, name, service_type, status, organization_count, description, created_at, updated_at)
    VALUES (${id}, ${input.name}, ${input.service_type}, ${input.status}, ${count}, ${description}, ${now}, ${now});
  `;

  return (await getServiceById(id))!;
}

export async function updateService(id: string, input: UpdateServiceInput): Promise<ServiceRecord | null> {
  const existing = await getServiceById(id);
  if (!existing) {
    return null;
  }

  const now = ISO();

  await sql`
    UPDATE services
    SET name = ${input.name ?? existing.name},
        service_type = ${input.service_type ?? existing.service_type},
        status = ${input.status ?? existing.status},
        organization_count = ${input.organization_count ?? existing.organization_count},
        description = ${input.description ?? existing.description},
        updated_at = ${now}
    WHERE id = ${id};
  `;

  return getServiceById(id);
}

export async function deleteService(id: string): Promise<boolean> {
  const result = await sql`
    DELETE FROM services WHERE id = ${id};
  `;
  return getAffected(result) > 0;
}

async function setMetric(key: string, value: string) {
  await sql`
    INSERT INTO metrics (key, value)
    VALUES (${key}, ${value})
    ON CONFLICT(key) DO UPDATE SET value = excluded.value;
  `;
}

async function getMetric(key: string): Promise<string | null> {
  const [row] = await sql`
    SELECT value FROM metrics WHERE key = ${key} LIMIT 1;
  `;
  return row?.value ?? null;
}

export async function incrementMetric(key: string): Promise<number> {
  const current = Number(await getMetric(key)) || 0;
  const next = current + 1;
  await setMetric(key, String(next));
  return next;
}

export async function setMetricTimestamp(key: string, timestamp?: string) {
  await setMetric(key, timestamp ?? ISO());
}

export async function getMetricTimestamp(key: string): Promise<string | null> {
  return getMetric(key);
}

export async function setMetricNumber(key: string, value: number) {
  await setMetric(key, String(value));
}

export async function getMetricNumber(key: string): Promise<number | null> {
  const value = await getMetric(key);
  return value ? Number(value) : null;
}

export async function createSession(record: SessionRecord) {
  await sql`
    INSERT INTO sessions (token_hash, user_id, issued_at, expires_at)
    VALUES (${record.token_hash}, ${record.user_id}, ${record.issued_at}, ${record.expires_at});
  `;
}

export async function getSession(tokenHash: string): Promise<SessionRecord | null> {
  const [row] = await sql`
    SELECT token_hash, user_id, issued_at, expires_at
    FROM sessions
    WHERE token_hash = ${tokenHash}
    LIMIT 1;
  `;
  return row ?? null;
}

export async function replaceSession(record: SessionRecord) {
  await sql`
    INSERT INTO sessions (token_hash, user_id, issued_at, expires_at)
    VALUES (${record.token_hash}, ${record.user_id}, ${record.issued_at}, ${record.expires_at})
    ON CONFLICT(token_hash) DO UPDATE SET
      issued_at = excluded.issued_at,
      expires_at = excluded.expires_at,
      user_id = excluded.user_id;
  `;
}

export async function deleteSession(tokenHash: string) {
  await sql`
    DELETE FROM sessions WHERE token_hash = ${tokenHash};
  `;
}

export { sql as database };

export async function ensureTessaroOrganization() {
  return seedTessaroOrganization();
}

export async function ensureUserManagementService() {
  return seedUserManagementService();
}
