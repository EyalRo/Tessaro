import type { ApiHandler } from "../router";
import { ensureDefaultAdmin } from "../lib/default-admin";
import {
  createAuthSession,
  deleteAuthSession,
  createSessionCookie,
  expireSessionCookie,
  getAuthenticatedSession,
  readSessionToken,
} from "../lib/auth-session";
import { getUserById } from "../database/users";
import type { OrganizationRecord } from "../database/organizations";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
};

type LoginPayload = {
  organization_id?: string | null;
};

function toOrganizationPayload(organization: OrganizationRecord) {
  return {
    id: organization.id,
    name: organization.name,
    plan: organization.plan,
    status: organization.status,
  };
}

export const loginRoute: ApiHandler = async (request) => {
  if (request.method !== "POST") {
    return new Response(null, { status: 405 });
  }

  let payload: LoginPayload = {};
  try {
    // Consume body even if we do not require specific payload fields.
    if (request.headers.get("content-type")?.includes("application/json")) {
      payload = await request.json().catch(() => ({}));
    }
  } catch (error) {
    console.error("Failed to parse auth login body", error);
  }

  const user = await ensureDefaultAdmin();

  const organizations = user.organizations ?? [];
  const hasMultipleOrganizations = organizations.length > 1;
  const requestedOrganizationId = typeof payload.organization_id === "string"
    ? payload.organization_id.trim()
    : null;

  let selectedOrganizationId: string | null = null;
  if (organizations.length === 1) {
    selectedOrganizationId = organizations[0].id;
  } else if (hasMultipleOrganizations) {
    if (!requestedOrganizationId) {
      return Response.json(
        {
          code: "organization_selection_required",
          message: "Select an organization to continue.",
          organizations: organizations.map(toOrganizationPayload),
        },
        { status: 400, headers: jsonHeaders },
      );
    }

    const allowed = new Set(organizations.map((organization) => organization.id));
    if (!allowed.has(requestedOrganizationId)) {
      return Response.json(
        {
          code: "organization_selection_invalid",
          message: "The selected organization is not available for this account.",
        },
        { status: 403, headers: jsonHeaders },
      );
    }

    selectedOrganizationId = requestedOrganizationId;
  }

  const session = await createAuthSession(user.id, { organizationId: selectedOrganizationId });
  const selectedOrganization = selectedOrganizationId
    ? organizations.find((organization) => organization.id === selectedOrganizationId) ?? null
    : null;

  const response = Response.json(
    {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      organization: selectedOrganization ? toOrganizationPayload(selectedOrganization) : null,
      expires_at: session.expires_at,
    },
    { status: 200, headers: jsonHeaders },
  );

  response.headers.append("set-cookie", createSessionCookie(session.token, session.expires_at));
  return response;
};

export const logoutRoute: ApiHandler = async (request) => {
  if (request.method !== "POST") {
    return new Response(null, { status: 405 });
  }

  const token = readSessionToken(request.headers.get("cookie"));
  if (token) {
    await deleteAuthSession(token).catch((error) => {
      console.error("Failed to delete auth session", error);
    });
  }

  const response = Response.json({ success: true }, { status: 200, headers: jsonHeaders });
  response.headers.append("set-cookie", expireSessionCookie());
  return response;
};

export const sessionRoute: ApiHandler = async (request) => {
  if (request.method !== "GET") {
    return new Response(null, { status: 405 });
  }

  const authSession = await getAuthenticatedSession(request);
  if (!authSession) {
    return Response.json(
      { message: "Not authenticated" },
      { status: 401, headers: jsonHeaders },
    );
  }

  const user = await getUserById(authSession.user_id);
  if (!user) {
    return Response.json(
      { message: "User not found" },
      { status: 404, headers: jsonHeaders },
    );
  }

  const organization = authSession.organization_id
    ? user.organizations.find((entry) => entry.id === authSession.organization_id) ?? null
    : null;

  return Response.json(
    {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      organization: organization ? toOrganizationPayload(organization) : null,
      expires_at: authSession.expires_at,
      organization_id: authSession.organization_id,
    },
    { status: 200, headers: jsonHeaders },
  );
};
