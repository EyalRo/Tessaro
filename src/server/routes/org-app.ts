import type { ApiHandler } from "../router";
import { getAuthenticatedSession } from "../lib/auth-session";
import {
  getUserById,
  listServicesForOrganizations,
  type ServiceRecord,
  type UserRecord,
} from "../database";

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
  organizations: OrganizationSummary[];
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

async function buildContextPayload(user: UserRecord): Promise<ContextResponse> {
  const isPlatformAdmin = user.role === "admin";
  const isOrganizationAdmin = user.role === "organization_admin" || isPlatformAdmin;

  const organizations = await Promise.all(
    user.organizations.map(async (organization) => {
      const services = await listServicesForOrganizations([organization.id]);

      return {
        id: organization.id,
        name: organization.name,
        plan: organization.plan,
        status: organization.status,
        isAdmin: isOrganizationAdmin,
        services: services.map(mapServiceRecord),
      } satisfies OrganizationSummary;
    }),
  );

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isPlatformAdmin,
    },
    organizations,
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
        organizations: [],
      } satisfies ContextResponse,
      { status: 200 },
    );
  }

  const payload = await buildContextPayload(user);
  return Response.json(payload, { status: 200 });
};
