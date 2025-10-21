import { ensureTessaroOrganization, ensureUserManagementService, TESSARO_ORGANIZATION_ID } from "../database/seed";
import { createUser, getUserByEmail } from "../database/users";
import type { CreateUserInput, UserRecord } from "../database/users";

export const DEFAULT_ADMIN_EMAIL = "admin@tessaro.local";
export const DEFAULT_ADMIN_USER: CreateUserInput = {
  name: "Tessaro Administrator",
  email: DEFAULT_ADMIN_EMAIL,
  role: "organization_admin",
  avatar_url: null,
  organization_ids: [TESSARO_ORGANIZATION_ID],
};

export async function ensureDefaultAdmin(): Promise<UserRecord> {
  await Promise.all([ensureTessaroOrganization(), ensureUserManagementService()]);

  const existing = await getUserByEmail(DEFAULT_ADMIN_EMAIL);
  if (existing) {
    return existing;
  }

  return createUser(DEFAULT_ADMIN_USER);
}
