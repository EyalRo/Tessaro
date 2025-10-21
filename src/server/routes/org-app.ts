import type { ApiHandler } from "../router";
import { getAuthenticatedSession } from "../lib/auth-session";
import { listServicesForOrganizations, type ServiceRecord } from "../database/services";
import { getUserById } from "../database/users";
import type { UserRecord } from "../database/users";

type OrganizationSummary = {
  id: string;
  name: string;
  plan: string;
  status: string;
  isAdmin: boolean;
  services: Array<{
    id: string;
    name: string;
    serviceType: string;
    status: string;
    description: string | null;
  }>;
};

type ContextResponse = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    isPlatformAdmin: boolean;
  };
  organization: OrganizationSummary | null;
};

function mapServiceRecord(service: ServiceRecord) {
  return {
    id: service.id,
    name: service.name,
    serviceType: service.service_type,
    status: service.status,
    description: service.description ?? null,
  };
}

async function buildOrganizationSummary(
  user: UserRecord,
  organizationId: string | null,
): Promise<OrganizationSummary | null> {
  if (!organizationId) {
    return null;
  }

  const organization = user.organizations.find((entry) => entry.id === organizationId);
  if (!organization) {
    return null;
  }

  const isPlatformAdmin = user.role === "admin";
  const isOrganizationAdmin = user.role === "organization_admin" || isPlatformAdmin;

  const services = await listServicesForOrganizations([organization.id]);

  return {
    id: organization.id,
    name: organization.name,
    plan: organization.plan,
    status: organization.status,
    isAdmin: isOrganizationAdmin,
    services: services.map(mapServiceRecord),
  } satisfies OrganizationSummary;
}

async function buildContextPayload(
  user: UserRecord,
  organizationId: string | null,
): Promise<ContextResponse> {
  const isPlatformAdmin = user.role === "admin";
  const organization = await buildOrganizationSummary(user, organizationId);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isPlatformAdmin,
    },
    organization,
  } satisfies ContextResponse;
}

export const organizationContextRoute: ApiHandler = async (request) => {
  const session = await getAuthenticatedSession(request);
  if (!session) {
    return Response.json({ message: "Not authenticated" }, { status: 401 });
  }

  const user = await getUserById(session.user_id);
  if (!user) {
    return Response.json({ message: "User not found" }, { status: 404 });
  }

  const organizationIdFromSession = session.organization_id ?? null;
  if (user.organizations.length === 0) {
    return Response.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isPlatformAdmin: user.role === "admin",
        },
        organization: null,
      } satisfies ContextResponse,
      { status: 200 },
    );
  }

  const effectiveOrganizationId = organizationIdFromSession
    ?? (user.organizations.length === 1 ? user.organizations[0].id : null);
  const payload = await buildContextPayload(user, effectiveOrganizationId);

  return Response.json(payload, { status: 200 });
};
