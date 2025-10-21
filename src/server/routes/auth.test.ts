import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { loginRoute } from "./auth";
import {
  TESSARO_ORGANIZATION_ID,
  createOrganization,
  deleteOrganization,
  initializeDatabase,
  updateUser,
  type OrganizationRecord,
  type ServiceRecord,
  type SessionRecord,
  type UserRecord,
} from "../database";
import { ensureDefaultAdmin } from "../lib/default-admin";
import {
  deleteAuthSession,
  validateAuthToken,
  SESSION_COOKIE,
} from "../lib/auth-session";

const originalFetch = globalThis.fetch;
const fissionStub = createFissionStub();

function createLoginRequest(body?: unknown) {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
}

function extractSessionToken(response: Response): string | null {
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) {
    return null;
  }

  const match = setCookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  if (!match) {
    return null;
  }

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

async function resetDefaultAdminOrganizations() {
  const admin = await ensureDefaultAdmin();
  await updateUser(admin.id, { organization_ids: [TESSARO_ORGANIZATION_ID] });
}

beforeAll(() => {
  globalThis.fetch = fissionStub.fetch;
});

afterAll(() => {
  globalThis.fetch = originalFetch;
});

beforeEach(async () => {
  fissionStub.reset();
  await initializeDatabase();
  await resetDefaultAdminOrganizations();
});

describe("auth login organization selection", () => {
  it("automatically selects the sole organization when only one is assigned", async () => {
    const response = await loginRoute(createLoginRequest());
    expect(response.status).toBe(200);

    const payload = await response.json();
    expect(payload.organization).not.toBeNull();
    expect(payload.organization.id).toBe(TESSARO_ORGANIZATION_ID);

    const token = extractSessionToken(response);
    expect(token).toBeTruthy();

    if (token) {
      const session = await validateAuthToken(token);
      expect(session).not.toBeNull();
      expect(session?.organization_id).toBe(TESSARO_ORGANIZATION_ID);
      await deleteAuthSession(token);
    }
  });

  it("requires organization selection when multiple organizations are assigned", async () => {
    const admin = await ensureDefaultAdmin();
    const extraOrganization = await createOrganization({
      name: "Second Org",
      plan: "standard",
      status: "active",
    });

    try {
      await updateUser(admin.id, {
        organization_ids: [TESSARO_ORGANIZATION_ID, extraOrganization.id],
      });

      const response = await loginRoute(createLoginRequest());
      expect(response.status).toBe(400);

      const payload = await response.json();
      expect(payload.code).toBe("organization_selection_required");
      expect(Array.isArray(payload.organizations)).toBe(true);
      expect(payload.organizations?.some((org: any) => org.id === extraOrganization.id)).toBe(true);
    } finally {
      await updateUser(admin.id, { organization_ids: [TESSARO_ORGANIZATION_ID] });
      await deleteOrganization(extraOrganization.id);
    }
  });

  it("accepts an organization selection when provided", async () => {
    const admin = await ensureDefaultAdmin();
    const extraOrganization = await createOrganization({
      name: "Selected Org",
      plan: "enterprise",
      status: "active",
    });

    try {
      await updateUser(admin.id, {
        organization_ids: [TESSARO_ORGANIZATION_ID, extraOrganization.id],
      });

      const response = await loginRoute(
        createLoginRequest({ organization_id: extraOrganization.id }),
      );

      expect(response.status).toBe(200);

      const payload = await response.json();
      expect(payload.organization).not.toBeNull();
      expect(payload.organization.id).toBe(extraOrganization.id);

      const token = extractSessionToken(response);
      expect(token).toBeTruthy();

      if (token) {
        const session = await validateAuthToken(token);
        expect(session).not.toBeNull();
        expect(session?.organization_id).toBe(extraOrganization.id);
        await deleteAuthSession(token);
      }
    } finally {
      await updateUser(admin.id, { organization_ids: [TESSARO_ORGANIZATION_ID] });
      await deleteOrganization(extraOrganization.id);
    }
  });
});

type StoredUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_url: string | null;
  organizationIds: string[];
  created_at: string;
  updated_at: string;
};

type StoredService = ServiceRecord & {
  organizationIds: string[];
};

function createFissionStub() {
  const organizations = new Map<string, OrganizationRecord>();
  const services = new Map<string, StoredService>();
  const users = new Map<string, StoredUser>();
  const userCredentials = new Map<string, string>();
  const metricNumbers = new Map<string, number>();
  const metricTimestamps = new Map<string, string | null>();
  const sessions = new Map<string, SessionRecord>();

  function now() {
    return new Date().toISOString();
  }

  function hydrateUser(stored: StoredUser): UserRecord {
    const organizationRecords = stored.organizationIds
      .map((id) => organizations.get(id))
      .filter((org): org is OrganizationRecord => Boolean(org));

    return {
      id: stored.id,
      name: stored.name,
      email: stored.email,
      role: stored.role,
      avatar_url: stored.avatar_url,
      created_at: stored.created_at,
      updated_at: stored.updated_at,
      organizations: organizationRecords,
    };
  }

  function jsonResponse(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  function noContent(status = 204) {
    return new Response(null, { status });
  }

  function notFound(message = "Not found") {
    return jsonResponse({ message }, 404);
  }

  function readBody(init?: RequestInit): any {
    if (!init?.body) {
      return {};
    }

    if (typeof init.body === "string") {
      return init.body ? JSON.parse(init.body) : {};
    }

    if (init.body instanceof Uint8Array) {
      const text = new TextDecoder().decode(init.body);
      return text ? JSON.parse(text) : {};
    }

    return init.body as any;
  }

  function sanitizeOrganizationIds(input: unknown): string[] {
    if (!Array.isArray(input)) {
      return [];
    }

    return input
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter((value) => value.length > 0 && organizations.has(value));
  }

  function listUsersResponse() {
    return Array.from(users.values()).map((stored) => hydrateUser(stored));
  }

  function listServicesResponse() {
    return Array.from(services.values()).map((service) => ({
      id: service.id,
      name: service.name,
      service_type: service.service_type,
      status: service.status,
      organization_count: service.organization_count,
      created_at: service.created_at,
      updated_at: service.updated_at,
      description: service.description,
    }));
  }

  async function fetchHandler(input: RequestInfo, init?: RequestInit): Promise<Response> {
    const request = input instanceof Request ? input : null;
    const url = new URL(request?.url ?? (typeof input === "string" ? input : input.toString()));
    const method = (init?.method ?? request?.method ?? "GET").toUpperCase();

    let effectiveUrl = url;
    const overridePath = url.searchParams.get("__path");
    if (overridePath) {
      const normalized = overridePath.startsWith("/")
        ? overridePath
        : `/${overridePath.replace(/^\/+/, "")}`;
      effectiveUrl = new URL(normalized, "http://tessaro.local");
    }

    const path = effectiveUrl.pathname;
    const searchParams = effectiveUrl.searchParams;

    if (path === "/tessaro/organizations" && method === "GET") {
      if (searchParams.get("summary") === "count") {
        return jsonResponse({ count: organizations.size });
      }

      return jsonResponse(Array.from(organizations.values()));
    }

    if (path === "/tessaro/organizations" && method === "POST") {
      const payload = readBody(init);
      const id = typeof payload.id === "string" && payload.id.trim().length > 0
        ? payload.id.trim()
        : crypto.randomUUID();
      const existing = organizations.get(id);
      const record: OrganizationRecord = {
        id,
        name: payload.name ?? existing?.name ?? "",
        plan: payload.plan ?? existing?.plan ?? "",
        status: payload.status ?? existing?.status ?? "",
        created_at: existing?.created_at ?? now(),
        updated_at: now(),
      };
      organizations.set(id, record);
      return jsonResponse(record, existing ? 200 : 201);
    }

    if (path.startsWith("/tessaro/organizations/")) {
      const id = decodeURIComponent(path.replace("/tessaro/organizations/", ""));
      const existing = organizations.get(id);

      if (method === "GET") {
        return existing ? jsonResponse(existing) : notFound();
      }

      if (method === "PATCH" || method === "PUT") {
        if (!existing) {
          return notFound();
        }

        const payload = readBody(init);
        const updated: OrganizationRecord = {
          ...existing,
          name: payload.name ?? existing.name,
          plan: payload.plan ?? existing.plan,
          status: payload.status ?? existing.status,
          updated_at: now(),
        };
        organizations.set(id, updated);
        return jsonResponse(updated);
      }

      if (method === "DELETE") {
        organizations.delete(id);
        for (const stored of users.values()) {
          stored.organizationIds = stored.organizationIds.filter((orgId) => orgId !== id);
        }
        return noContent();
      }
    }

    if (path === "/tessaro/services" && method === "GET") {
      if (searchParams.get("summary") === "count") {
        return jsonResponse({ count: services.size });
      }

      return jsonResponse(listServicesResponse());
    }

    if (path === "/tessaro/services" && method === "POST") {
      const payload = readBody(init);
      const id = typeof payload.id === "string" && payload.id.trim().length > 0
        ? payload.id.trim()
        : crypto.randomUUID();
      const existing = services.get(id);
      const timestamp = now();
      const organizationIds = Array.isArray(payload.organization_ids)
        ? sanitizeOrganizationIds(payload.organization_ids)
        : existing?.organizationIds ?? [TESSARO_ORGANIZATION_ID];
      const record: StoredService = {
        id,
        name: payload.name ?? existing?.name ?? "",
        service_type: payload.service_type ?? existing?.service_type ?? "",
        status: payload.status ?? existing?.status ?? "",
        organization_count: Number(payload.organization_count ?? existing?.organization_count ?? organizationIds.length),
        description: payload.description ?? existing?.description ?? null,
        created_at: existing?.created_at ?? timestamp,
        updated_at: timestamp,
        organizationIds,
      };
      services.set(id, record);
      return jsonResponse(record, existing ? 200 : 201);
    }

    if (path === "/tessaro/services/query" && method === "POST") {
      const payload = readBody(init);
      const organizationIds = sanitizeOrganizationIds(payload.organization_ids);
      const filtered = listServicesResponse().filter((service) => {
        const stored = services.get(service.id);
        if (!stored) {
          return false;
        }
        return stored.organizationIds.some((id) => organizationIds.includes(id));
      });
      return jsonResponse(filtered);
    }

    if (path.startsWith("/tessaro/services/")) {
      const id = decodeURIComponent(path.replace("/tessaro/services/", ""));
      const existing = services.get(id);

      if (method === "GET") {
        if (!existing) {
          return notFound();
        }
        return jsonResponse({
          id: existing.id,
          name: existing.name,
          service_type: existing.service_type,
          status: existing.status,
          organization_count: existing.organization_count,
          description: existing.description,
          created_at: existing.created_at,
          updated_at: existing.updated_at,
        });
      }

      if (method === "PATCH" || method === "PUT") {
        if (!existing) {
          return notFound();
        }
        const payload = readBody(init);
        const updated: StoredService = {
          ...existing,
          name: payload.name ?? existing.name,
          service_type: payload.service_type ?? existing.service_type,
          status: payload.status ?? existing.status,
          organization_count: Number(payload.organization_count ?? existing.organization_count),
          description: payload.description ?? existing.description,
          updated_at: now(),
        };
        services.set(id, updated);
        return jsonResponse({
          id: updated.id,
          name: updated.name,
          service_type: updated.service_type,
          status: updated.status,
          organization_count: updated.organization_count,
          description: updated.description,
          created_at: updated.created_at,
          updated_at: updated.updated_at,
        });
      }

      if (method === "DELETE") {
        services.delete(id);
        return noContent();
      }
    }

    if (path === "/tessaro/users" && method === "GET") {
      if (searchParams.get("summary") === "count") {
        return jsonResponse({ count: users.size });
      }

      const email = searchParams.get("email");
      if (email) {
        const user = Array.from(users.values()).find((entry) => entry.email === email);
        return user ? jsonResponse(hydrateUser(user)) : notFound("User not found");
      }

      return jsonResponse(listUsersResponse());
    }

    if (path === "/tessaro/users" && method === "POST") {
      const payload = readBody(init);
      const id = typeof payload.id === "string" && payload.id.trim().length > 0
        ? payload.id.trim()
        : crypto.randomUUID();
      const timestamp = now();
      const organizationIds = sanitizeOrganizationIds(payload.organization_ids);
      const stored: StoredUser = {
        id,
        name: payload.name ?? "",
        email: payload.email ?? "",
        role: payload.role ?? "member",
        avatar_url: payload.avatar_url ?? null,
        organizationIds,
        created_at: timestamp,
        updated_at: timestamp,
      };
      users.set(id, stored);
      return jsonResponse(hydrateUser(stored), 201);
    }

    if (path.startsWith("/tessaro/users/")) {
      const id = decodeURIComponent(path.replace("/tessaro/users/", ""));
      const existing = users.get(id);

      if (method === "GET") {
        return existing ? jsonResponse(hydrateUser(existing)) : notFound("User not found");
      }

      if (method === "PATCH" || method === "PUT") {
        if (!existing) {
          return notFound("User not found");
        }
        const payload = readBody(init);
        const organizationIds = payload.organization_ids
          ? sanitizeOrganizationIds(payload.organization_ids)
          : existing.organizationIds;
        const updated: StoredUser = {
          ...existing,
          name: payload.name ?? existing.name,
          email: payload.email ?? existing.email,
          role: payload.role ?? existing.role,
          avatar_url: payload.avatar_url ?? existing.avatar_url,
          organizationIds,
          updated_at: now(),
        };
        users.set(id, updated);
        return jsonResponse(hydrateUser(updated));
      }

      if (method === "DELETE") {
        users.delete(id);
        return noContent();
      }
    }

    if (path === "/tessaro/user-credentials" && method === "POST") {
      const payload = readBody(init);
      if (typeof payload.user_id === "string") {
        userCredentials.set(payload.user_id, String(payload.password ?? ""));
      }
      return noContent();
    }

    if (path === "/tessaro/metrics/increment" && method === "POST") {
      const payload = readBody(init);
      const key = String(payload.key ?? "");
      const current = metricNumbers.get(key) ?? 0;
      const next = current + 1;
      metricNumbers.set(key, next);
      return jsonResponse({ value: next });
    }

    if (path === "/tessaro/metrics/number") {
      if (method === "POST") {
        const payload = readBody(init);
        const key = String(payload.key ?? "");
        metricNumbers.set(key, Number(payload.value ?? 0));
        return noContent();
      }

      if (method === "GET") {
        const key = searchParams.get("key");
        if (!key || !metricNumbers.has(key)) {
          return notFound();
        }
        return jsonResponse({ value: metricNumbers.get(key) ?? 0 });
      }
    }

    if (path === "/tessaro/metrics/timestamp") {
      if (method === "POST") {
        const payload = readBody(init);
        const key = String(payload.key ?? "");
        metricTimestamps.set(key, payload.value ?? null);
        return noContent();
      }

      if (method === "GET") {
        const key = searchParams.get("key");
        if (!key || !metricTimestamps.has(key)) {
          return notFound();
        }
        return jsonResponse({ value: metricTimestamps.get(key) ?? null });
      }
    }

    if (path === "/tessaro/sessions" && method === "POST") {
      const payload = readBody(init) as SessionRecord;
      sessions.set(payload.token_hash, payload);
      return noContent(201);
    }

    if (path.startsWith("/tessaro/sessions/")) {
      const tokenHash = decodeURIComponent(path.replace("/tessaro/sessions/", ""));
      const existing = sessions.get(tokenHash);

      if (method === "GET") {
        return existing ? jsonResponse(existing) : notFound();
      }

      if (method === "PUT") {
        const payload = readBody(init) as SessionRecord;
        sessions.set(tokenHash, payload);
        return noContent();
      }

      if (method === "DELETE") {
        sessions.delete(tokenHash);
        return noContent();
      }
    }

    return notFound();
  }

  function reset() {
    organizations.clear();
    services.clear();

    users.clear();
    userCredentials.clear();
    metricNumbers.clear();
    metricTimestamps.clear();
    sessions.clear();
  }

  return {
    fetch: fetchHandler,
    reset,
  };
}
