import type { UserRecord } from "../database";
import { fissionJson, FissionRequestError } from "./fission-client";

const DEFAULT_USERS_PATH = "/tessaro/users";

function getUsersPath(): string {
  const rawPath = Bun.env.FISSION_USERS_PATH;
  const trimmed = typeof rawPath === "string" ? rawPath.trim() : "";
  const base = trimmed.length > 0 ? trimmed : DEFAULT_USERS_PATH;
  return base.startsWith("/") ? base : `/${base}`;
}

function buildUsersPath(id?: string): string {
  if (!id) {
    return getUsersPath();
  }
  const safeId = encodeURIComponent(id);
  const base = getUsersPath();
  return `${base}/${safeId}`;
}

export async function listUsersFromFission(): Promise<UserRecord[]> {
  return fissionJson<UserRecord[]>("GET", getUsersPath());
}

export async function readUserFromFission(id: string): Promise<UserRecord | null> {
  try {
    const users = await listUsersFromFission();
    return users.find((user) => user.id === id) ?? null;
  } catch (error) {
    if (error instanceof FissionRequestError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function countUsersFromFission(): Promise<number> {
  const base = getUsersPath();
  const separator = base.includes("?") ? "&" : "?";
  const path = `${base}${separator}summary=count`;

  const result = await fissionJson<unknown>("GET", path);

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

  const users = await listUsersFromFission();
  return users.length;
}
