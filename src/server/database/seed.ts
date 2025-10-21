import {
  createOrganization,
  getOrganizationById,
  type CreateOrganizationInput,
  type OrganizationRecord,
} from "./organizations";
import {
  createService,
  getServiceById,
  updateService,
  type CreateServiceInput,
  type ServiceRecord,
} from "./services";
import {
  createUser,
  getUserByEmail,
  setUserPassword,
  updateUser,
  type UserRecord,
} from "./users";

export const TESSARO_ORGANIZATION_ID = "org_tessaro";
const TESSARO_ORGANIZATION_NAME = "Tessaro";
const TESSARO_ORGANIZATION_PLAN = "enterprise";
const TESSARO_ORGANIZATION_STATUS = "active";

export const USER_MANAGEMENT_SERVICE_ID = "svc_user_management";
const USER_MANAGEMENT_SERVICE_NAME = "User Management";
const USER_MANAGEMENT_SERVICE_TYPE = "user_management";
const USER_MANAGEMENT_SERVICE_STATUS = "active";
const USER_MANAGEMENT_SERVICE_DESCRIPTION = "Manage organization users and access";

export const STAGS_ADMIN_EMAIL = "stags@isdino.com";
const STAGS_ADMIN_NAME = "Stags";
const STAGS_ADMIN_PASSWORD = "stags@isdino.com";

export async function ensureSeedData() {
  await ensureTessaroOrganization();
  await ensureUserManagementService();
  await ensureStagsAdminUser();
}

export async function ensureTessaroOrganization(): Promise<OrganizationRecord> {
  const existing = await getOrganizationById(TESSARO_ORGANIZATION_ID);
  if (existing) {
    return existing;
  }

  const input: CreateOrganizationInput = {
    id: TESSARO_ORGANIZATION_ID,
    name: TESSARO_ORGANIZATION_NAME,
    plan: TESSARO_ORGANIZATION_PLAN,
    status: TESSARO_ORGANIZATION_STATUS,
  };
  return createOrganization(input);
}

export async function ensureUserManagementService(): Promise<ServiceRecord> {
  const existing = await getServiceById(USER_MANAGEMENT_SERVICE_ID);
  if (existing) {
    await updateService(USER_MANAGEMENT_SERVICE_ID, {
      name: USER_MANAGEMENT_SERVICE_NAME,
      service_type: USER_MANAGEMENT_SERVICE_TYPE,
      status: USER_MANAGEMENT_SERVICE_STATUS,
      description: USER_MANAGEMENT_SERVICE_DESCRIPTION,
      organization_ids: [TESSARO_ORGANIZATION_ID],
      organization_count: 1,
    } satisfies CreateServiceInput);
    return (await getServiceById(USER_MANAGEMENT_SERVICE_ID))!;
  }

  const input: CreateServiceInput = {
    id: USER_MANAGEMENT_SERVICE_ID,
    name: USER_MANAGEMENT_SERVICE_NAME,
    service_type: USER_MANAGEMENT_SERVICE_TYPE,
    status: USER_MANAGEMENT_SERVICE_STATUS,
    organization_count: 1,
    description: USER_MANAGEMENT_SERVICE_DESCRIPTION,
    organization_ids: [TESSARO_ORGANIZATION_ID],
  };
  return createService(input);
}

async function ensureStagsAdminUser(): Promise<UserRecord> {
  const organizations = [TESSARO_ORGANIZATION_ID];
  const existing = await getUserByEmail(STAGS_ADMIN_EMAIL);

  if (existing) {
    const needsUpdate =
      existing.role !== "admin" ||
      existing.name !== STAGS_ADMIN_NAME ||
      organizations.some((orgId) => !existing.organizations.some((org) => org.id === orgId));

    if (needsUpdate) {
      const updated = await updateUser(existing.id, {
        name: STAGS_ADMIN_NAME,
        role: "admin",
        organization_ids: organizations,
      });
      if (updated) {
        await setUserPassword(updated.id, STAGS_ADMIN_PASSWORD);
        return updated;
      }
    }

    await setUserPassword(existing.id, STAGS_ADMIN_PASSWORD);
    return existing;
  }

  const created = await createUser({
    name: STAGS_ADMIN_NAME,
    email: STAGS_ADMIN_EMAIL,
    role: "admin",
    avatar_url: null,
    organization_ids: organizations,
  });

  await setUserPassword(created.id, STAGS_ADMIN_PASSWORD);
  return created;
}
