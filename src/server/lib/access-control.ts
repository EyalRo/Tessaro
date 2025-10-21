import { getAuthenticatedSession } from "./auth-session";
import {
  getServiceById,
  getUserById,
  USER_MANAGEMENT_SERVICE_ID,
  type UserRecord,
} from "../database";

export class AccessError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "AccessError";
    this.status = status;
  }
}

export type UserManagementScope =
  | { kind: "global" }
  | { kind: "organization"; organizationIds: string[] };

export type UserManagementContext = {
  actor: UserRecord;
  scope: UserManagementScope;
  sessionOrganizationId: string | null;
};

export async function requireUserManagementAccess(request: Request): Promise<UserManagementContext> {
  const session = await getAuthenticatedSession(request);
  if (!session) {
    throw new AccessError(401, "Not authenticated");
  }

  const actor = await getUserById(session.user_id);
  if (!actor) {
    throw new AccessError(401, "User not found");
  }

  const service = await getServiceById(USER_MANAGEMENT_SERVICE_ID);
  if (!service || service.status !== "active") {
    throw new AccessError(503, "User management service unavailable");
  }

  const selectedOrganizationId = session.organization_id ?? null;

  if (actor.role === "admin") {
    if (selectedOrganizationId) {
      return {
        actor,
        scope: { kind: "organization", organizationIds: [selectedOrganizationId] },
        sessionOrganizationId: selectedOrganizationId,
      } satisfies UserManagementContext;
    }

    return {
      actor,
      scope: { kind: "global" },
      sessionOrganizationId: null,
    } satisfies UserManagementContext;
  }

  if (actor.role === "organization_admin") {
    if (!selectedOrganizationId) {
      throw new AccessError(403, "Organization selection required");
    }

    const organizationIds = Array.from(new Set(actor.organizations.map((org) => org.id))).filter(Boolean);
    if (organizationIds.length === 0) {
      throw new AccessError(403, "Organization assignment required");
    }

    if (!organizationIds.includes(selectedOrganizationId)) {
      throw new AccessError(403, "Organization selection invalid");
    }

    return {
      actor,
      scope: { kind: "organization", organizationIds: [selectedOrganizationId] },
      sessionOrganizationId: selectedOrganizationId,
    } satisfies UserManagementContext;
  }

  throw new AccessError(403, "Insufficient permissions");
}
