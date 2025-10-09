import { Hono } from "./lib/hono.ts";
import type { Context } from "./lib/hono.ts";
import {
  countUsers,
  createUser,
  deleteUser,
  getUserById,
  listUsers,
  updateUser,
} from "./storage/denodb.ts";
import { getValue, incrementCounter, setValue } from "./storage/kv.ts";

const app = new Hono();

const USER_LIST_HITS_KEY: Deno.KvKey = ["metrics", "users", "list_hits"];
const USER_LAST_MUTATION_KEY: Deno.KvKey = [
  "metrics",
  "users",
  "last_mutation_at",
];
const USER_COUNT_KEY: Deno.KvKey = ["metrics", "users", "count"];
const USER_LAST_LIST_KEY: Deno.KvKey = [
  "metrics",
  "users",
  "last_list_at",
];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

async function readJsonBody<T>(context: Context): Promise<T | null> {
  try {
    return await context.req.json<T>();
  } catch (error) {
    console.error("Failed to parse JSON body", error);
    return null;
  }
}

function normalizeOptionalString(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function buildHeaders(init?: HeadersInit) {
  return new Headers(init);
}

function parseOrganizationIds(value: unknown): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new Error("organization_ids must be an array of strings");
  }

  const seen = new Set<string>();
  const ids: string[] = [];

  for (const item of value) {
    if (typeof item !== "string") {
      throw new Error("organization_ids must be an array of strings");
    }

    const trimmed = item.trim();
    if (trimmed.length === 0) {
      continue;
    }

    if (seen.has(trimmed)) {
      continue;
    }

    seen.add(trimmed);
    ids.push(trimmed);
  }

  return ids;
}

app.get("/", async (context: Context) => {
  try {
    const users = await listUsers();
    const listHits = await incrementCounter(USER_LIST_HITS_KEY);
    const listedAt = new Date().toISOString();
    await setValue(USER_LAST_LIST_KEY, listedAt);
    const lastMutation = await getValue<string>(USER_LAST_MUTATION_KEY);
    const totalCount = await getValue<number>(USER_COUNT_KEY);

    const headers = buildHeaders({
      "x-users-list-hits": String(listHits),
      "x-users-last-list-at": listedAt,
    });

    if (lastMutation) {
      headers.set("x-users-last-mutation-at", lastMutation);
    }

    if (typeof totalCount === "number") {
      headers.set("x-users-total-count", String(totalCount));
    }

    return context.json(users, 200, { headers });
  } catch (error) {
    console.error("Failed to list users", error);
    return context.json({ message: "Failed to list users" }, 500);
  }
});

app.post("/", async (context: Context) => {
  const payload = await readJsonBody<unknown>(context);

  if (!payload || typeof payload !== "object") {
    return context.json({ message: "Invalid JSON payload" }, 400);
  }

  const { name, email, role, avatar_url, organization_ids } = payload as Record<
    string,
    unknown
  >;

  let parsedOrganizationIds: string[] | undefined;
  try {
    parsedOrganizationIds = parseOrganizationIds(organization_ids);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return context.json({ message }, 400);
  }

  if (
    !isNonEmptyString(name) || !isNonEmptyString(email) ||
    !isNonEmptyString(role)
  ) {
    return context.json({
      message: "name, email, and role are required",
    }, 400);
  }

  try {
    const user = await createUser({
      name: name.trim(),
      email: email.trim(),
      role: role.trim(),
      avatar_url: normalizeOptionalString(avatar_url),
      organization_ids: parsedOrganizationIds,
    });

    await setValue(USER_LAST_MUTATION_KEY, user.updated_at);
    const total = await countUsers();
    await setValue(USER_COUNT_KEY, total);

    return context.json(user, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to create user", error);

    if (message.includes("UNIQUE")) {
      return context.json({ message: "Email already exists" }, 409);
    }

    if (message.includes("organizations do not exist")) {
      return context.json({ message }, 400);
    }

    return context.json({ message: "Failed to create user" }, 500);
  }
});

app.get("/:id", async (context: Context) => {
  const id = context.req.param("id");

  if (!id) {
    return context.json({ message: "Missing user id" }, 400);
  }

  try {
    const user = await getUserById(id);

    if (!user) {
      return context.json({ message: "User not found" }, 404);
    }

    return context.json(user);
  } catch (error) {
    console.error("Failed to read user", error);
    return context.json({ message: "Failed to load user" }, 500);
  }
});

app.patch("/:id", async (context: Context) => {
  const id = context.req.param("id");

  if (!id) {
    return context.json({ message: "Missing user id" }, 400);
  }

  const payload = await readJsonBody<unknown>(context);

  if (!payload || typeof payload !== "object") {
    return context.json({ message: "Invalid JSON payload" }, 400);
  }

  const { name, email, role, avatar_url, organization_ids } = payload as Record<
    string,
    unknown
  >;
  const updatePayload: {
    name?: string;
    email?: string;
    role?: string;
    avatar_url?: string | null;
    organization_ids?: string[];
  } = {};

  let parsedOrganizationIds: string[] | undefined;
  if ((payload as Record<string, unknown>).hasOwnProperty("organization_ids")) {
    try {
      parsedOrganizationIds = parseOrganizationIds(organization_ids);
      updatePayload.organization_ids = parsedOrganizationIds;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return context.json({ message }, 400);
    }
  }

  if (isNonEmptyString(name)) {
    updatePayload.name = name.trim();
  }

  if (isNonEmptyString(email)) {
    updatePayload.email = email.trim();
  }

  if (isNonEmptyString(role)) {
    updatePayload.role = role.trim();
  }

  if ("avatar_url" in (payload as Record<string, unknown>)) {
    updatePayload.avatar_url = normalizeOptionalString(avatar_url);
  }

  if (Object.keys(updatePayload).length === 0) {
    return context.json({ message: "No updatable fields provided" }, 400);
  }

  try {
    const user = await updateUser(id, updatePayload);

    if (!user) {
      return context.json({ message: "User not found" }, 404);
    }

    await setValue(USER_LAST_MUTATION_KEY, user.updated_at);
    return context.json(user);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to update user", error);

    if (message.includes("UNIQUE")) {
      return context.json({ message: "Email already exists" }, 409);
    }

    if (message.includes("organizations do not exist")) {
      return context.json({ message }, 400);
    }

    return context.json({ message: "Failed to update user" }, 500);
  }
});

app.delete("/:id", async (context: Context) => {
  const id = context.req.param("id");

  if (!id) {
    return context.json({ message: "Missing user id" }, 400);
  }

  try {
    const deleted = await deleteUser(id);

    if (!deleted) {
      return context.json({ message: "User not found" }, 404);
    }

    const mutationTimestamp = new Date().toISOString();
    await setValue(USER_LAST_MUTATION_KEY, mutationTimestamp);
    const total = await countUsers();
    await setValue(USER_COUNT_KEY, total);

    return context.text("", 204);
  } catch (error) {
    console.error("Failed to delete user", error);
    return context.json({ message: "Failed to delete user" }, 500);
  }
});

export default app;
