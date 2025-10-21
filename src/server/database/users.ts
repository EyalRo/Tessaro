import { fissionRequest } from "./client";
import type { OrganizationRecord } from "./organizations";

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

export async function listUsers(): Promise<UserRecord[]> {
  const { data } = await fissionRequest<UserRecord[]>("/tessaro/users");
  return data ?? [];
}

export async function getUserById(id: string): Promise<UserRecord | null> {
  const { status, data } = await fissionRequest<UserRecord>(
    `/tessaro/users/${encodeURIComponent(id)}`,
    {
      method: "GET",
      acceptStatuses: [404],
    },
  );

  return status === 404 ? null : data;
}

export async function getUserByEmail(email: string): Promise<UserRecord | null> {
  const result = await fissionRequest<UserRecord | UserRecord[]>(
    `/tessaro/users?email=${encodeURIComponent(email)}`,
    { method: "GET", acceptStatuses: [404] },
  );

  if (result.status === 404) {
    return null;
  }

  const { data } = result;
  if (!data) {
    return null;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return null;
    }
    const match = data.find((user) => user.email.toLowerCase() === email.toLowerCase());
    return match ?? null;
  }

  return data;
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

export async function updateUser(
  id: string,
  input: UpdateUserInput,
): Promise<UserRecord | null> {
  const { status, data } = await fissionRequest<UserRecord>(
    `/tessaro/users/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify(input),
      acceptStatuses: [404],
    },
  );

  return status === 404 ? null : data;
}

export async function deleteUser(id: string): Promise<boolean> {
  const { status } = await fissionRequest<null>(
    `/tessaro/users/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      acceptStatuses: [404],
    },
  );
  return status === 200 || status === 202 || status === 204;
}

export async function countUsers(): Promise<number> {
  const { data } = await fissionRequest<{ count: number }>("/tessaro/users?summary=count");
  return Number(data?.count ?? 0);
}

async function upsertUserCredential(userId: string, password: string) {
  if (!userId || typeof userId !== "string") {
    throw new Error(`Cannot upsert credential; invalid user id: ${String(userId)}`);
  }
  await fissionRequest("/tessaro/user-credentials", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, password }),
  });
}

export async function setUserPassword(userId: string, password: string) {
  await upsertUserCredential(userId, password);
}
