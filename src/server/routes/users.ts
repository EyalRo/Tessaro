import {
  countUsers,
  createUser,
  deleteUser,
  getUserById,
  listUsers,
  updateUser,
  setMetricNumber,
  setMetricTimestamp,
  incrementMetric,
  getMetricTimestamp,
  getMetricNumber,
} from "../database";
import type { CreateUserInput, UpdateUserInput } from "../database";
import {
  errorResponse,
  formatHeaders,
  getParam,
  isNonEmptyString,
  normalizeOptionalString,
  readJson,
} from "./utils";

const USER_LIST_HITS_KEY = "metrics.users.list_hits";
const USER_LAST_MUTATION_KEY = "metrics.users.last_mutation_at";
const USER_COUNT_KEY = "metrics.users.count";
const USER_LAST_LIST_KEY = "metrics.users.last_list_at";

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
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }

    seen.add(trimmed);
    ids.push(trimmed);
  }

  return ids;
}

export async function listUsersRoute(_request: Request): Promise<Response> {
  try {
    const [users, listHits, lastMutation, totalCount] = await Promise.all([
      listUsers(),
      incrementMetric(USER_LIST_HITS_KEY),
      getMetricTimestamp(USER_LAST_MUTATION_KEY),
      getMetricNumber(USER_COUNT_KEY),
    ]);

    const listedAt = new Date().toISOString();
    await setMetricTimestamp(USER_LAST_LIST_KEY, listedAt);

    const headers = formatHeaders({
      "x-users-list-hits": String(listHits),
      "x-users-last-list-at": listedAt,
    });

    if (lastMutation) {
      headers.set("x-users-last-mutation-at", lastMutation);
    }

    if (typeof totalCount === "number" && Number.isFinite(totalCount)) {
      headers.set("x-users-total-count", String(totalCount));
    }

    return Response.json(users, { status: 200, headers });
  } catch (error) {
    console.error("Failed to list users", error);
    return errorResponse("Failed to list users");
  }
}

export async function createUserRoute(request: Request): Promise<Response> {
  const payload = await readJson<Record<string, unknown>>(request);

  if (!payload) {
    return errorResponse("Invalid JSON payload", 400);
  }

  const { name, email, role, avatar_url, organization_ids } = payload;

  let parsedOrganizationIds: string[] | undefined;
  try {
    parsedOrganizationIds = parseOrganizationIds(organization_ids);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResponse(message, 400);
  }

  if (!isNonEmptyString(name) || !isNonEmptyString(email) || !isNonEmptyString(role)) {
    return errorResponse("name, email, and role are required", 400);
  }

  const input: CreateUserInput = {
    name: name.trim(),
    email: email.trim(),
    role: role.trim(),
    avatar_url: normalizeOptionalString(avatar_url),
    organization_ids: parsedOrganizationIds,
  };

  try {
    const user = await createUser(input);
    await setMetricTimestamp(USER_LAST_MUTATION_KEY, user.updated_at);
    const total = await countUsers();
    await setMetricNumber(USER_COUNT_KEY, total);

    return Response.json(user, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to create user", error);

    if (message.includes("UNIQUE")) {
      return errorResponse("Email already exists", 409);
    }

    if (message.includes("organizations do not exist")) {
      return errorResponse(message, 400);
    }

    return errorResponse("Failed to create user");
  }
}

export async function readUserRoute(request: Request): Promise<Response> {
  const id = getParam(request, "id");
  if (!id) {
    return errorResponse("Missing user id", 400);
  }

  try {
    const user = await getUserById(id);
    if (!user) {
      return errorResponse("User not found", 404);
    }

    return Response.json(user);
  } catch (error) {
    console.error("Failed to load user", error);
    return errorResponse("Failed to load user");
  }
}

export async function updateUserRoute(request: Request): Promise<Response> {
  const id = getParam(request, "id");
  if (!id) {
    return errorResponse("Missing user id", 400);
  }

  const payload = await readJson<Record<string, unknown>>(request);
  if (!payload) {
    return errorResponse("Invalid JSON payload", 400);
  }

  const updatePayload: UpdateUserInput = {};

  if (Object.prototype.hasOwnProperty.call(payload, "organization_ids")) {
    try {
      updatePayload.organization_ids = parseOrganizationIds(payload.organization_ids);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return errorResponse(message, 400);
    }
  }

  if (isNonEmptyString(payload.name)) {
    updatePayload.name = payload.name.trim();
  }

  if (isNonEmptyString(payload.email)) {
    updatePayload.email = payload.email.trim();
  }

  if (isNonEmptyString(payload.role)) {
    updatePayload.role = payload.role.trim();
  }

  if (Object.prototype.hasOwnProperty.call(payload, "avatar_url")) {
    updatePayload.avatar_url = normalizeOptionalString(payload.avatar_url);
  }

  if (Object.keys(updatePayload).length === 0) {
    return errorResponse("No updatable fields provided", 400);
  }

  try {
    const user = await updateUser(id, updatePayload);
    if (!user) {
      return errorResponse("User not found", 404);
    }

    await setMetricTimestamp(USER_LAST_MUTATION_KEY, user.updated_at);
    return Response.json(user);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to update user", error);

    if (message.includes("UNIQUE")) {
      return errorResponse("Email already exists", 409);
    }

    if (message.includes("organizations do not exist")) {
      return errorResponse(message, 400);
    }

    return errorResponse("Failed to update user");
  }
}

export async function deleteUserRoute(request: Request): Promise<Response> {
  const id = getParam(request, "id");
  if (!id) {
    return errorResponse("Missing user id", 400);
  }

  try {
    const deleted = await deleteUser(id);
    if (!deleted) {
      return errorResponse("User not found", 404);
    }

    const mutationTimestamp = new Date().toISOString();
    await setMetricTimestamp(USER_LAST_MUTATION_KEY, mutationTimestamp);
    const total = await countUsers();
    await setMetricNumber(USER_COUNT_KEY, total);

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Failed to delete user", error);
    return errorResponse("Failed to delete user");
  }
}
