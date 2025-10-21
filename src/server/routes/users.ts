import {
  setMetricNumber,
  setMetricTimestamp,
  incrementMetric,
  getMetricTimestamp,
  createUser,
  updateUser,
  deleteUser,
  getUserById,
  type UpdateUserInput,
  setUserPassword,
} from "../database";
import type { UserRecord } from "../database";
import {
  AccessError,
  requireUserManagementAccess,
  type UserManagementContext,
  type UserManagementScope,
} from "../lib/access-control";
import {
  errorResponse,
  formatHeaders,
  getParam,
} from "./utils";
import {
  listUsersFromFission,
  readUserFromFission,
} from "../lib/users-service";

const USER_LIST_HITS_KEY = "metrics.users.list_hits";
const USER_LAST_MUTATION_KEY = "metrics.users.last_mutation_at";
const USER_COUNT_KEY = "metrics.users.count";
const USER_LAST_LIST_KEY = "metrics.users.last_list_at";

async function resolveContextOrRespond(request: Request): Promise<UserManagementContext | Response> {
  try {
    return await requireUserManagementAccess(request);
  } catch (error) {
    if (error instanceof AccessError) {
      return errorResponse(error.message, error.status);
    }

    throw error;
  }
}

function userWithinScope(user: UserRecord, scope: UserManagementScope): boolean {
  if (scope.kind === "global") {
    return true;
  }

  const allowed = new Set(scope.organizationIds);
  return user.organizations.some((organization) => allowed.has(organization.id));
}

export async function createUserRoute(_request: Request): Promise<Response> {
  const context = await resolveContextOrRespond(_request);
  if (context instanceof Response) {
    return context;
  }

  let payload: any;
  try {
    payload = await _request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const role = typeof payload.role === "string" ? payload.role.trim() : "member";
  const avatarUrl = typeof payload.avatar_url === "string" ? payload.avatar_url.trim() : null;
  let organizationIds = Array.isArray(payload.organization_ids)
    ? payload.organization_ids.map((id: unknown) => typeof id === "string" ? id.trim() : "").filter(Boolean)
    : [];

  if (!name || !email) {
    return errorResponse("Name and email are required", 400);
  }

  if (context.scope.kind === "organization") {
    const allowed = new Set(context.scope.organizationIds);
    organizationIds = organizationIds.filter((id) => allowed.has(id));
    if (organizationIds.length === 0) {
      return errorResponse("organization assignment required", 400);
    }
  }

  const createPayload = {
    name,
    email,
    role,
    avatar_url: avatarUrl,
    organization_ids: organizationIds.length > 0 ? organizationIds : undefined,
  };

  try {
    const user = await createUser(createPayload);
    await setMetricTimestamp(USER_LAST_MUTATION_KEY, user.updated_at);
    return Response.json(user, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("already exists")) {
      return errorResponse("User already exists", 409);
    }
    console.error("Failed to create user via Fission", error);
    return errorResponse("Failed to create user");
  }
}

export async function listUsersRoute(request: Request): Promise<Response> {
  const context = await resolveContextOrRespond(request);
  if (context instanceof Response) {
    return context;
  }

  const { scope, sessionOrganizationId } = context;
  const organizationId = scope.kind === "organization" ? sessionOrganizationId : null;

  try {
    const [users, listHits, lastMutation] = await Promise.all([
      listUsersFromFission(organizationId),
      incrementMetric(USER_LIST_HITS_KEY),
      getMetricTimestamp(USER_LAST_MUTATION_KEY),
    ]);

    const listedAt = new Date().toISOString();
    await Promise.all([
      setMetricTimestamp(USER_LAST_LIST_KEY, listedAt),
      setMetricNumber(USER_COUNT_KEY, users.length),
    ]);

    const totalCount = users.length;
    const visibleUsers = users;

    const headers = formatHeaders({
      "x-users-list-hits": String(listHits),
      "x-users-last-list-at": listedAt,
    });

    if (lastMutation) {
      headers.set("x-users-last-mutation-at", lastMutation);
    }

    if (scope.kind === "global") {
      headers.set("x-users-total-count", String(totalCount));
    }

    if (scope.kind === "organization") {
      headers.set("x-users-visible-count", String(visibleUsers.length));
    }

    return Response.json(visibleUsers, { status: 200, headers });
  } catch (error) {
    console.error("Failed to list users", error);
    return errorResponse("Failed to list users");
  }
}

export async function readUserRoute(request: Request): Promise<Response> {
  const id = getParam(request, "id");
  if (!id) {
    return errorResponse("Missing user id", 400);
  }

  const context = await resolveContextOrRespond(request);
  if (context instanceof Response) {
    return context;
  }

  const { scope } = context;

  try {
    const user = await getUserById(id);
    if (!user) {
      return errorResponse("User not found", 404);
    }

    if (!userWithinScope(user, scope)) {
      return errorResponse("User not accessible", 403);
    }

    return Response.json(user);
  } catch (error) {
    console.error("Failed to load user", error);
    return errorResponse("Failed to load user");
  }
}

export async function updateUserRoute(_request: Request): Promise<Response> {
  const context = await resolveContextOrRespond(_request);
  if (context instanceof Response) {
    return context;
  }

  const id = getParam(_request, "id");
  if (!id) {
    return errorResponse("Missing user id", 400);
  }

  let payload: any;
  try {
    payload = await _request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  if (!payload || typeof payload !== "object") {
    return errorResponse("Invalid JSON body", 400);
  }

  const existing = await getUserById(id);
  if (!existing) {
    return errorResponse("User not found", 404);
  }

  if (context.scope.kind === "organization") {
    const allowed = new Set(context.scope.organizationIds);
    const hasAccess = existing.organizations.some((organization) => allowed.has(organization.id));
    if (!hasAccess) {
      return errorResponse("User not accessible", 403);
    }
  }

  const updates: UpdateUserInput = {};
  const errors: string[] = [];

  if ("name" in payload) {
    const name = typeof payload.name === "string" ? payload.name.trim() : "";
    if (!name) {
      errors.push("Name cannot be empty");
    } else {
      updates.name = name;
    }
  }

  if ("email" in payload) {
    const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
    if (!email) {
      errors.push("Email cannot be empty");
    } else {
      updates.email = email;
    }
  }

  if ("role" in payload) {
    const role = typeof payload.role === "string" ? payload.role.trim() : "";
    if (!role) {
      errors.push("Role cannot be empty");
    } else {
      updates.role = role;
      if (context.scope.kind === "organization" && role === "admin") {
        errors.push("Role change not permitted");
      }
    }
  }

  if ("avatar_url" in payload) {
    updates.avatar_url = typeof payload.avatar_url === "string" ? payload.avatar_url.trim() : null;
  }

  if (Array.isArray(payload.organization_ids)) {
    const organizationIds = payload.organization_ids
      .map((value: unknown) => (typeof value === "string" ? value.trim() : ""))
      .filter(Boolean);
    const uniqueOrganizationIds = Array.from(new Set(organizationIds));

    if (context.scope.kind === "organization") {
      const allowed = new Set(context.scope.organizationIds);
      const invalid = uniqueOrganizationIds.filter((organizationId) => !allowed.has(organizationId));
      if (invalid.length > 0) {
        errors.push("Organization assignment not permitted");
      }
    }

    if (uniqueOrganizationIds.length === 0 && context.scope.kind === "organization") {
      errors.push("Organization assignment cannot be empty");
    } else {
      updates.organization_ids = uniqueOrganizationIds;
    }
  }

  const password = typeof payload.password === "string" ? payload.password.trim() : "";
  const shouldUpdatePassword = password.length > 0;

  if (errors.length > 0) {
    return errorResponse(errors.join("; "), 400);
  }

  if (Object.keys(updates).length === 0 && !shouldUpdatePassword) {
    return errorResponse("No changes provided", 400);
  }

  try {
    let updatedUser = existing;

    if (Object.keys(updates).length > 0) {
      const result = await updateUser(id, updates);
      if (!result) {
        return errorResponse("User not found", 404);
      }
      updatedUser = result;
    }

    if (shouldUpdatePassword) {
      await setUserPassword(id, password);
      if (Object.keys(updates).length === 0) {
        updatedUser = updatedUser ?? existing;
      }
    }

    const mutationTimestamp = Object.keys(updates).length > 0
      ? updatedUser.updated_at
      : new Date().toISOString();

    await setMetricTimestamp(USER_LAST_MUTATION_KEY, mutationTimestamp);
    return Response.json(updatedUser, { status: 200 });
  } catch (error) {
    console.error("Failed to update user via Fission", error);
    if (error instanceof Error && /already exists|email already in use/i.test(error.message)) {
      return errorResponse("Email already in use", 409);
    }
    return errorResponse("Failed to update user");
  }
}

export async function deleteUserRoute(_request: Request): Promise<Response> {
  const context = await resolveContextOrRespond(_request);
  if (context instanceof Response) {
    return context;
  }

  const id = getParam(_request, "id");
  if (!id) {
    return errorResponse("Missing user id", 400);
  }

  try {
    const user = await readUserFromFission(id);
    if (!user) {
      return errorResponse("User not found", 404);
    }

    if (context.scope.kind === "organization") {
      const allowed = new Set(context.scope.organizationIds);
      const hasAccess = user.organizations.some((organization) => allowed.has(organization.id));
      if (!hasAccess) {
        return errorResponse("User not accessible", 403);
      }
    }

    const removed = await deleteUser(id);
    if (!removed) {
      return errorResponse("User not found", 404);
    }

    await setMetricTimestamp(USER_LAST_MUTATION_KEY);
    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to delete user", error);
    return errorResponse("Failed to delete user");
  }
}
