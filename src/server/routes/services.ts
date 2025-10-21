import {
  countServices,
  createService,
  deleteService,
  getServiceById,
  listServices,
  updateService,
} from "../database/services";
import type { CreateServiceInput, UpdateServiceInput } from "../database/services";
import {
  getMetricNumber,
  getMetricTimestamp,
  incrementMetric,
  setMetricNumber,
  setMetricTimestamp,
} from "../database/metrics";
import {
  errorResponse,
  formatHeaders,
  getParam,
  isNonEmptyString,
  readJson,
} from "./utils";

const SERVICE_LIST_HITS_KEY = "metrics.services.list_hits";
const SERVICE_LAST_MUTATION_KEY = "metrics.services.last_mutation_at";
const SERVICE_COUNT_KEY = "metrics.services.count";
const SERVICE_LAST_LIST_KEY = "metrics.services.last_list_at";

function normalizeCount(value: unknown): number | null {
  if (value === undefined) {
    return null;
  }

  const numericValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return null;
  }

  return Math.floor(numericValue);
}

export async function listServicesRoute(_request: Request): Promise<Response> {
  try {
    const [services, listHits, lastMutation, totalCount] = await Promise.all([
      listServices(),
      incrementMetric(SERVICE_LIST_HITS_KEY),
      getMetricTimestamp(SERVICE_LAST_MUTATION_KEY),
      getMetricNumber(SERVICE_COUNT_KEY),
    ]);

    const listedAt = new Date().toISOString();
    await setMetricTimestamp(SERVICE_LAST_LIST_KEY, listedAt);

    const headers = formatHeaders({
      "x-services-list-hits": String(listHits),
      "x-services-last-list-at": listedAt,
    });

    if (lastMutation) {
      headers.set("x-services-last-mutation-at", lastMutation);
    }

    if (typeof totalCount === "number" && Number.isFinite(totalCount)) {
      headers.set("x-services-total-count", String(totalCount));
    }

    return Response.json(services, { status: 200, headers });
  } catch (error) {
    console.error("Failed to list services", error);
    return errorResponse("Failed to list services");
  }
}

export async function createServiceRoute(request: Request): Promise<Response> {
  const payload = await readJson<Record<string, unknown>>(request);

  if (!payload) {
    return errorResponse("Invalid JSON payload", 400);
  }

  const { name, service_type, status, organization_count } = payload;

  if (!isNonEmptyString(name) || !isNonEmptyString(service_type) || !isNonEmptyString(status)) {
    return errorResponse("name, service_type, and status are required", 400);
  }

  const normalizedCount = organization_count === undefined
    ? 0
    : normalizeCount(organization_count);

  if (normalizedCount === null) {
    return errorResponse("organization_count must be a non-negative integer", 400);
  }

  const input: CreateServiceInput = {
    name: name.trim(),
    service_type: service_type.trim(),
    status: status.trim(),
    organization_count: normalizedCount,
  };

  try {
    const service = await createService(input);
    await setMetricTimestamp(SERVICE_LAST_MUTATION_KEY, service.updated_at);
    const total = await countServices();
    await setMetricNumber(SERVICE_COUNT_KEY, total);

    return Response.json(service, { status: 201 });
  } catch (error) {
    console.error("Failed to create service", error);
    return errorResponse("Failed to create service");
  }
}

export async function readServiceRoute(request: Request): Promise<Response> {
  const id = getParam(request, "id");
  if (!id) {
    return errorResponse("Missing service id", 400);
  }

  try {
    const service = await getServiceById(id);
    if (!service) {
      return errorResponse("Service not found", 404);
    }

    return Response.json(service);
  } catch (error) {
    console.error("Failed to load service", error);
    return errorResponse("Failed to load service");
  }
}

export async function updateServiceRoute(request: Request): Promise<Response> {
  const id = getParam(request, "id");
  if (!id) {
    return errorResponse("Missing service id", 400);
  }

  const payload = await readJson<Record<string, unknown>>(request);
  if (!payload) {
    return errorResponse("Invalid JSON payload", 400);
  }

  const updatePayload: UpdateServiceInput = {};

  if (isNonEmptyString(payload.name)) {
    updatePayload.name = payload.name.trim();
  }

  if (isNonEmptyString(payload.service_type)) {
    updatePayload.service_type = payload.service_type.trim();
  }

  if (isNonEmptyString(payload.status)) {
    updatePayload.status = payload.status.trim();
  }

  if (Object.prototype.hasOwnProperty.call(payload, "organization_count")) {
    const normalized = normalizeCount(payload.organization_count);
    if (normalized === null) {
      return errorResponse("organization_count must be a non-negative integer", 400);
    }

    updatePayload.organization_count = normalized;
  }

  if (Object.keys(updatePayload).length === 0) {
    return errorResponse("No updatable fields provided", 400);
  }

  try {
    const service = await updateService(id, updatePayload);
    if (!service) {
      return errorResponse("Service not found", 404);
    }

    await setMetricTimestamp(SERVICE_LAST_MUTATION_KEY, service.updated_at);
    return Response.json(service);
  } catch (error) {
    console.error("Failed to update service", error);
    return errorResponse("Failed to update service");
  }
}

export async function deleteServiceRoute(request: Request): Promise<Response> {
  const id = getParam(request, "id");
  if (!id) {
    return errorResponse("Missing service id", 400);
  }

  try {
    const deleted = await deleteService(id);
    if (!deleted) {
      return errorResponse("Service not found", 404);
    }

    const mutationTimestamp = new Date().toISOString();
    await setMetricTimestamp(SERVICE_LAST_MUTATION_KEY, mutationTimestamp);
    const total = await countServices();
    await setMetricNumber(SERVICE_COUNT_KEY, total);

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Failed to delete service", error);
    return errorResponse("Failed to delete service");
  }
}
