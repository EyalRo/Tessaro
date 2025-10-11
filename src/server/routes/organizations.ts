import {
  countOrganizations,
  createOrganization,
  deleteOrganization,
  getOrganizationById,
  listOrganizations,
  updateOrganization,
  incrementMetric,
  setMetricNumber,
  setMetricTimestamp,
  getMetricTimestamp,
  getMetricNumber,
} from "../database";
import type { CreateOrganizationInput, UpdateOrganizationInput } from "../database";
import {
  errorResponse,
  formatHeaders,
  getParam,
  isNonEmptyString,
  readJson,
} from "./utils";

const ORGANIZATION_LIST_HITS_KEY = "metrics.organizations.list_hits";
const ORGANIZATION_LAST_MUTATION_KEY = "metrics.organizations.last_mutation_at";
const ORGANIZATION_COUNT_KEY = "metrics.organizations.count";
const ORGANIZATION_LAST_LIST_KEY = "metrics.organizations.last_list_at";

export async function listOrganizationsRoute(_request: Request): Promise<Response> {
  try {
    const [organizations, listHits, lastMutation, totalCount] = await Promise.all([
      listOrganizations(),
      incrementMetric(ORGANIZATION_LIST_HITS_KEY),
      getMetricTimestamp(ORGANIZATION_LAST_MUTATION_KEY),
      getMetricNumber(ORGANIZATION_COUNT_KEY),
    ]);

    const listedAt = new Date().toISOString();
    await setMetricTimestamp(ORGANIZATION_LAST_LIST_KEY, listedAt);

    const headers = formatHeaders({
      "x-organizations-list-hits": String(listHits),
      "x-organizations-last-list-at": listedAt,
    });

    if (lastMutation) {
      headers.set("x-organizations-last-mutation-at", lastMutation);
    }

    if (typeof totalCount === "number" && Number.isFinite(totalCount)) {
      headers.set("x-organizations-total-count", String(totalCount));
    }

    return Response.json(organizations, { status: 200, headers });
  } catch (error) {
    console.error("Failed to list organizations", error);
    return errorResponse("Failed to list organizations");
  }
}

export async function createOrganizationRoute(request: Request): Promise<Response> {
  const payload = await readJson<Record<string, unknown>>(request);

  if (!payload) {
    return errorResponse("Invalid JSON payload", 400);
  }

  const { name, plan, status } = payload;

  if (!isNonEmptyString(name) || !isNonEmptyString(plan) || !isNonEmptyString(status)) {
    return errorResponse("name, plan, and status are required", 400);
  }

  const input: CreateOrganizationInput = {
    name: name.trim(),
    plan: plan.trim(),
    status: status.trim(),
  };

  try {
    const organization = await createOrganization(input);
    await setMetricTimestamp(ORGANIZATION_LAST_MUTATION_KEY, organization.updated_at);
    const total = await countOrganizations();
    await setMetricNumber(ORGANIZATION_COUNT_KEY, total);

    return Response.json(organization, { status: 201 });
  } catch (error) {
    console.error("Failed to create organization", error);
    return errorResponse("Failed to create organization");
  }
}

export async function readOrganizationRoute(request: Request): Promise<Response> {
  const id = getParam(request, "id");
  if (!id) {
    return errorResponse("Missing organization id", 400);
  }

  try {
    const organization = await getOrganizationById(id);
    if (!organization) {
      return errorResponse("Organization not found", 404);
    }

    return Response.json(organization);
  } catch (error) {
    console.error("Failed to load organization", error);
    return errorResponse("Failed to load organization");
  }
}

export async function updateOrganizationRoute(request: Request): Promise<Response> {
  const id = getParam(request, "id");
  if (!id) {
    return errorResponse("Missing organization id", 400);
  }

  const payload = await readJson<Record<string, unknown>>(request);
  if (!payload) {
    return errorResponse("Invalid JSON payload", 400);
  }

  const updatePayload: UpdateOrganizationInput = {};

  if (isNonEmptyString(payload.name)) {
    updatePayload.name = payload.name.trim();
  }

  if (isNonEmptyString(payload.plan)) {
    updatePayload.plan = payload.plan.trim();
  }

  if (isNonEmptyString(payload.status)) {
    updatePayload.status = payload.status.trim();
  }

  if (Object.keys(updatePayload).length === 0) {
    return errorResponse("No updatable fields provided", 400);
  }

  try {
    const organization = await updateOrganization(id, updatePayload);
    if (!organization) {
      return errorResponse("Organization not found", 404);
    }

    await setMetricTimestamp(ORGANIZATION_LAST_MUTATION_KEY, organization.updated_at);
    return Response.json(organization);
  } catch (error) {
    console.error("Failed to update organization", error);
    return errorResponse("Failed to update organization");
  }
}

export async function deleteOrganizationRoute(request: Request): Promise<Response> {
  const id = getParam(request, "id");
  if (!id) {
    return errorResponse("Missing organization id", 400);
  }

  try {
    const deleted = await deleteOrganization(id);
    if (!deleted) {
      return errorResponse("Organization not found", 404);
    }

    const mutationTimestamp = new Date().toISOString();
    await setMetricTimestamp(ORGANIZATION_LAST_MUTATION_KEY, mutationTimestamp);
    const total = await countOrganizations();
    await setMetricNumber(ORGANIZATION_COUNT_KEY, total);

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Failed to delete organization", error);
    return errorResponse("Failed to delete organization");
  }
}
