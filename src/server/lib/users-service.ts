import type { UserRecord } from "../database";
import { fissionJson, FissionRequestError } from "./fission-client";

const DEFAULT_USERS_PATH = "/tessaro/users";

function getUsersPath(query?: Record<string, string>): string {
  const rawPath = Bun.env.FISSION_USERS_PATH;
  const trimmed = typeof rawPath === "string" ? rawPath.trim() : "";
  const base = trimmed.length > 0 ? trimmed : DEFAULT_USERS_PATH;
  const prefix = base.startsWith("/") ? base : `/${base}`;
  if (!query || Object.keys(query).length === 0) {
    return prefix;
  }
  const search = new URLSearchParams(query);
  return `${prefix}?${search.toString()}`;
}

function buildUsersPath(id?: string, query?: Record<string, string>): string {
  const base = getUsersPath(query);
  if (!id) {
    return base;
  }
  const [path, search = ""] = base.split("?");
  const safeId = encodeURIComponent(id);
  return search ? `${path}/${safeId}?${search}` : `${path}/${safeId}`;
}

function normalizeOrganizationId(rawId?: string | null): string | null {
  if (typeof rawId !== "string") {
    return null;
  }
  const trimmed = rawId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function listUsersFromFission(organizationId?: string | null): Promise<UserRecord[]> {
  const query: Record<string, string> = {};
  const normalizedOrganizationId = normalizeOrganizationId(organizationId);
  if (normalizedOrganizationId) {
    query.organization_id = normalizedOrganizationId;
  }
  return fissionJson<UserRecord[]>("GET", getUsersPath(query));
}

export async function readUserFromFission(id: string): Promise<UserRecord | null> {
  try {
    return await fissionJson<UserRecord>("GET", buildUsersPath(id));
  } catch (error) {
    if (error instanceof FissionRequestError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function countUsersFromFission(organizationId?: string | null): Promise<number> {
  const query: Record<string, string> = { summary: "count" };
  const normalizedOrganizationId = normalizeOrganizationId(organizationId);
  if (normalizedOrganizationId) {
    query.organization_id = normalizedOrganizationId;
  }

  const result = await fissionJson<unknown>("GET", getUsersPath(query));

  if (Array.isArray(result)) {
    return result.length;
  }

  if (result && typeof result === "object" && "count" in result) {
    const rawValue = (result as { count: unknown }).count;
    if (typeof rawValue === "number") {
      return Number.isFinite(rawValue) ? rawValue : 0;
    }
    const parsed = Number(rawValue);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  const users = await listUsersFromFission(normalizedOrganizationId);
  return users.length;
}
