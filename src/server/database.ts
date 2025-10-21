const FISSION_BASE_URL = Bun.env.FISSION_BASE_URL ?? "http://fission.dino.home";
const DEFAULT_ACCEPT = "application/json";

type FissionRequestOptions = RequestInit & {
  acceptStatuses?: number[];
};

type WithMaybeNull<T> = T | null;

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  accept: DEFAULT_ACCEPT,
};

export const TESSARO_ORGANIZATION_ID = "org_tessaro";
const TESSARO_ORGANIZATION_NAME = "Tessaro";
const TESSARO_ORGANIZATION_PLAN = "enterprise";
const TESSARO_ORGANIZATION_STATUS = "active";

export const USER_MANAGEMENT_SERVICE_ID = "svc_user_management";
const USER_MANAGEMENT_SERVICE_NAME = "User Management";
const USER_MANAGEMENT_SERVICE_TYPE = "user_management";
const USER_MANAGEMENT_SERVICE_STATUS = "active";
const USER_MANAGEMENT_SERVICE_DESCRIPTION = "Manage organization users and access";

export const STAGS_ADMIN_EMAIL = "stags@isdino.com";
const STAGS_ADMIN_NAME = "Stags";
const STAGS_ADMIN_PASSWORD = "stags@isdino.com";

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
  id?: string;
  name: string;
  plan: string;
  status: string;
};

export type UpdateOrganizationInput = Partial<CreateOrganizationInput>;

export type CreateServiceInput = {
  id?: string;
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
  organization_id: string | null;
  issued_at: string;
  expires_at: string;
};

type MetricNumberResponse = {
  value: number;
};

type MetricTimestampResponse = {
  value: string | null;
};

function buildFissionUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const target = new URL("/tessaro", FISSION_BASE_URL);
  target.searchParams.set("__path", normalizedPath);
  return target.toString();
}

async function parseJson<T>(response: Response): Promise<T | null> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    if (response.status === 204) {
      return null;
    }
    const text = await response.text();
    if (!text) {
      return null;
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      return null;
    }
  }

  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function fissionRequest<T>(path: string, options: FissionRequestOptions = {}) {
  const { acceptStatuses = [], headers, ...init } = options;
  const requestHeaders = new Headers(headers ?? {});

  if (!requestHeaders.has("accept")) {
    requestHeaders.set("accept", DEFAULT_ACCEPT);
  }

  const hasBody = init.body !== undefined && init.body !== null;
  if (hasBody && !requestHeaders.has("content-type")) {
    requestHeaders.set("content-type", JSON_HEADERS["content-type"]);
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  requestHeaders.set("x-tessaro-path", normalizedPath);

  const response = await fetch(buildFissionUrl(path), {
    ...init,
    headers: requestHeaders,
  });

  if (!response.ok && !acceptStatuses.includes(response.status)) {
    const body = await parseJson<{ message?: string }>(response);
    const error = new Error(body?.message ?? `Fission request failed with status ${response.status}`) as Error & {
      status?: number;
      body?: unknown;
    };
    error.status = response.status;
    error.body = body;
    throw error;
  }

  const data = await parseJson<T>(response);
  return {
    status: response.status,
    data: data as WithMaybeNull<T>,
  };
}

export async function initializeDatabase() {
  await ensureSeedData();
}

async function ensureSeedData() {
  await Promise.all([
    ensureTessaroOrganization(),
    ensureUserManagementService(),
  ]);
  await ensureStagsAdminUser();
}

export async function listUsers(): Promise<UserRecord[]> {
  const { data } = await fissionRequest<UserRecord[]>("/tessaro/users");
  return data ?? [];
}

export async function getUserById(id: string): Promise<UserRecord | null> {
  const { status, data } = await fissionRequest<UserRecord>(`/tessaro/users/${encodeURIComponent(id)}`, {
    method: "GET",
    acceptStatuses: [404],
  });

  return status === 404 ? null : data;
}

export async function getUserByEmail(email: string): Promise<UserRecord | null> {
  const { status, data } = await fissionRequest<UserRecord>(
    `/tessaro/users?email=${encodeURIComponent(email)}`,
    { method: "GET", acceptStatuses: [404] },
  );

  return status === 404 ? null : data;
}

export async function createUser(input: CreateUserInput): Promise<UserRecord> {
  const { data } = await fissionRequest<UserRecord>("/tessaro/users", {
    method: "POST",
    body: JSON.stringify(input),
  });

  if (!data) {
    throw new Error("Fission createUser returned no data");
  }

  return data;
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<UserRecord | null> {
  const { status, data } = await fissionRequest<UserRecord>(`/tessaro/users/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
    acceptStatuses: [404],
  });

  return status === 404 ? null : data;
}

export async function deleteUser(id: string): Promise<boolean> {
  const { status } = await fissionRequest<null>(`/tessaro/users/${encodeURIComponent(id)}`, {
    method: "DELETE",
    acceptStatuses: [404],
  });
  return status === 200 || status === 202 || status === 204;
}

export async function countUsers(): Promise<number> {
  const { data } = await fissionRequest<{ count: number }>("/tessaro/users?summary=count");
  return Number(data?.count ?? 0);
}

export async function listOrganizations(): Promise<OrganizationRecord[]> {
  const { data } = await fissionRequest<OrganizationRecord[]>("/tessaro/organizations");
  return data ?? [];
}

export async function getOrganizationById(id: string): Promise<OrganizationRecord | null> {
  const { status, data } = await fissionRequest<OrganizationRecord>(
    `/tessaro/organizations/${encodeURIComponent(id)}`,
    { method: "GET", acceptStatuses: [404] },
  );
  return status === 404 ? null : data;
}

export async function createOrganization(input: CreateOrganizationInput): Promise<OrganizationRecord> {
  const { data } = await fissionRequest<OrganizationRecord>("/tessaro/organizations", {
    method: "POST",
    body: JSON.stringify(input),
  });

  if (!data) {
    throw new Error("Fission createOrganization returned no data");
  }

  return data;
}

export async function updateOrganization(id: string, input: UpdateOrganizationInput): Promise<OrganizationRecord | null> {
  const { status, data } = await fissionRequest<OrganizationRecord>(
    `/tessaro/organizations/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
      acceptStatuses: [404],
    },
  );

  return status === 404 ? null : data;
}

export async function deleteOrganization(id: string): Promise<boolean> {
  const { status } = await fissionRequest<null>(`/tessaro/organizations/${encodeURIComponent(id)}`, {
    method: "DELETE",
    acceptStatuses: [404],
  });

  return status === 200 || status === 202 || status === 204;
}

export async function countOrganizations(): Promise<number> {
  const { data } = await fissionRequest<{ count: number }>("/tessaro/organizations?summary=count");
  return Number(data?.count ?? 0);
}

export async function listServices(): Promise<ServiceRecord[]> {
  const { data } = await fissionRequest<ServiceRecord[]>("/tessaro/services");
  return data ?? [];
}

export async function getServiceById(id: string): Promise<ServiceRecord | null> {
  const { status, data } = await fissionRequest<ServiceRecord>(
    `/tessaro/services/${encodeURIComponent(id)}`,
    { method: "GET", acceptStatuses: [404] },
  );
  return status === 404 ? null : data;
}

export async function createService(input: CreateServiceInput): Promise<ServiceRecord> {
  const { data } = await fissionRequest<ServiceRecord>("/tessaro/services", {
    method: "POST",
    body: JSON.stringify(input),
  });

  if (!data) {
    throw new Error("Fission createService returned no data");
  }

  return data;
}

export async function updateService(id: string, input: UpdateServiceInput): Promise<ServiceRecord | null> {
  const { status, data } = await fissionRequest<ServiceRecord>(
    `/tessaro/services/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify(input), acceptStatuses: [404] },
  );
  return status === 404 ? null : data;
}

export async function deleteService(id: string): Promise<boolean> {
  const { status } = await fissionRequest<null>(`/tessaro/services/${encodeURIComponent(id)}`, {
    method: "DELETE",
    acceptStatuses: [404],
  });
  return status === 200 || status === 202 || status === 204;
}

export async function countServices(): Promise<number> {
  const { data } = await fissionRequest<{ count: number }>("/tessaro/services?summary=count");
  return Number(data?.count ?? 0);
}

export async function listServicesForOrganizations(organizationIds: string[]): Promise<ServiceRecord[]> {
  if (!organizationIds.length) {
    return [];
  }

  const { data } = await fissionRequest<ServiceRecord[]>("/tessaro/services/query", {
    method: "POST",
    body: JSON.stringify({ organization_ids: organizationIds }),
  });

  return data ?? [];
}

export async function incrementMetric(key: string): Promise<number> {
  const { data } = await fissionRequest<MetricNumberResponse>("/tessaro/metrics/increment", {
    method: "POST",
    body: JSON.stringify({ key }),
  });

  return Number(data?.value ?? 0);
}

export async function setMetricTimestamp(key: string, timestamp?: string) {
  await fissionRequest("/tessaro/metrics/timestamp", {
    method: "POST",
    body: JSON.stringify({ key, value: timestamp ?? null }),
  });
}

export async function getMetricTimestamp(key: string): Promise<string | null> {
  const { status, data } = await fissionRequest<MetricTimestampResponse>(
    `/tessaro/metrics/timestamp?key=${encodeURIComponent(key)}`,
    {
      method: "GET",
      acceptStatuses: [404],
    },
  );

  if (status === 404) {
    return null;
  }

  return data?.value ?? null;
}

export async function setMetricNumber(key: string, value: number) {
  await fissionRequest("/tessaro/metrics/number", {
    method: "POST",
    body: JSON.stringify({ key, value }),
  });
}

export async function getMetricNumber(key: string): Promise<number | null> {
  const { status, data } = await fissionRequest<MetricNumberResponse>(
    `/tessaro/metrics/number?key=${encodeURIComponent(key)}`,
    {
      method: "GET",
      acceptStatuses: [404],
    },
  );

  if (status === 404) {
    return null;
  }

  if (!data) {
    return null;
  }

  return Number(data.value);
}

export async function createSession(record: SessionRecord) {
  await fissionRequest("/tessaro/sessions", {
    method: "POST",
    body: JSON.stringify(record),
  });
}

export async function getSession(tokenHash: string): Promise<SessionRecord | null> {
  const { status, data } = await fissionRequest<SessionRecord>(
    `/tessaro/sessions/${encodeURIComponent(tokenHash)}`,
    { method: "GET", acceptStatuses: [404] },
  );

  return status === 404 ? null : data;
}

export async function replaceSession(record: SessionRecord) {
  await fissionRequest(`/tessaro/sessions/${encodeURIComponent(record.token_hash)}`, {
    method: "PUT",
    body: JSON.stringify(record),
  });
}

export async function deleteSession(tokenHash: string) {
  await fissionRequest(`/tessaro/sessions/${encodeURIComponent(tokenHash)}`, {
    method: "DELETE",
    acceptStatuses: [404],
  });
}

export async function ensureTessaroOrganization(): Promise<OrganizationRecord> {
  const existing = await getOrganizationById(TESSARO_ORGANIZATION_ID);
  if (existing) {
    return existing;
  }

  return createOrganization({
    id: TESSARO_ORGANIZATION_ID,
    name: TESSARO_ORGANIZATION_NAME,
    plan: TESSARO_ORGANIZATION_PLAN,
    status: TESSARO_ORGANIZATION_STATUS,
  });
}

export async function ensureUserManagementService(): Promise<ServiceRecord> {
  const existing = await getServiceById(USER_MANAGEMENT_SERVICE_ID);
  if (existing) {
    return existing;
  }

  return createService({
    id: USER_MANAGEMENT_SERVICE_ID,
    name: USER_MANAGEMENT_SERVICE_NAME,
    service_type: USER_MANAGEMENT_SERVICE_TYPE,
    status: USER_MANAGEMENT_SERVICE_STATUS,
    organization_count: 1,
    description: USER_MANAGEMENT_SERVICE_DESCRIPTION,
  });
}

async function ensureStagsAdminUser(): Promise<UserRecord> {
  const organizations = [TESSARO_ORGANIZATION_ID];
  const existing = await getUserByEmail(STAGS_ADMIN_EMAIL);

  if (existing) {
    const needsUpdate =
      existing.role !== "admin" ||
      existing.name !== STAGS_ADMIN_NAME ||
      organizations.some((orgId) => !existing.organizations.some((org) => org.id === orgId));

    if (needsUpdate) {
      const updated = await updateUser(existing.id, {
        name: STAGS_ADMIN_NAME,
        role: "admin",
        organization_ids: organizations,
      });
      if (updated) {
        await upsertUserCredential(updated.id, STAGS_ADMIN_PASSWORD);
        return updated;
      }
    }

    await upsertUserCredential(existing.id, STAGS_ADMIN_PASSWORD);
    return existing;
  }

  const created = await createUser({
    name: STAGS_ADMIN_NAME,
    email: STAGS_ADMIN_EMAIL,
    role: "admin",
    avatar_url: null,
    organization_ids: organizations,
  });

  await upsertUserCredential(created.id, STAGS_ADMIN_PASSWORD);
  return created;
}

async function upsertUserCredential(userId: string, password: string) {
  await fissionRequest("/tessaro/user-credentials", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, password }),
  });
}
