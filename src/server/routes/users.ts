import {
  setMetricNumber,
  setMetricTimestamp,
  incrementMetric,
  getMetricTimestamp,
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
const USER_MUTATION_DISABLED_MESSAGE = "User management mutations are temporarily unavailable.";

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
  return errorResponse(USER_MUTATION_DISABLED_MESSAGE, 503);
}

export async function listUsersRoute(request: Request): Promise<Response> {
  const context = await resolveContextOrRespond(request);
  if (context instanceof Response) {
    return context;
  }

  const { scope } = context;

  try {
    const [users, listHits, lastMutation] = await Promise.all([
      listUsersFromFission(),
      incrementMetric(USER_LIST_HITS_KEY),
      getMetricTimestamp(USER_LAST_MUTATION_KEY),
    ]);

    const listedAt = new Date().toISOString();
    await Promise.all([
      setMetricTimestamp(USER_LAST_LIST_KEY, listedAt),
      setMetricNumber(USER_COUNT_KEY, users.length),
    ]);

    const totalCount = users.length;
    let visibleUsers = users;
    if (scope.kind === "organization") {
      const allowed = new Set(scope.organizationIds);
      visibleUsers = users.filter((user) =>
        user.organizations.some((organization) => allowed.has(organization.id)),
      );
    }

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
    const user = await readUserFromFission(id);
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
  return errorResponse(USER_MUTATION_DISABLED_MESSAGE, 503);
}

export async function deleteUserRoute(_request: Request): Promise<Response> {
  return errorResponse(USER_MUTATION_DISABLED_MESSAGE, 503);
}
