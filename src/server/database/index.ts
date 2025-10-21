import { ensureSeedData } from "./seed";

export async function initializeDatabase() {
  await ensureSeedData();
}

export { ensureSeedData } from "./seed";
export {
  ensureTessaroOrganization,
  ensureUserManagementService,
  STAGS_ADMIN_EMAIL,
  TESSARO_ORGANIZATION_ID,
  USER_MANAGEMENT_SERVICE_ID,
} from "./seed";

export {
  listUsers,
  getUserById,
  getUserByEmail,
  createUser,
  updateUser,
  deleteUser,
  countUsers,
  setUserPassword,
} from "./users";
export type { CreateUserInput, UpdateUserInput, UserRecord } from "./users";

export {
  listOrganizations,
  getOrganizationById,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  countOrganizations,
} from "./organizations";
export type {
  CreateOrganizationInput,
  OrganizationRecord,
  UpdateOrganizationInput,
} from "./organizations";

export {
  listServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  countServices,
  listServicesForOrganizations,
} from "./services";
export type { CreateServiceInput, ServiceRecord, UpdateServiceInput } from "./services";

export {
  incrementMetric,
  setMetricTimestamp,
  getMetricTimestamp,
  setMetricNumber,
  getMetricNumber,
} from "./metrics";

export {
  createSession,
  getSession,
  replaceSession,
  deleteSession,
} from "./sessions";
export type { SessionRecord } from "./sessions";
