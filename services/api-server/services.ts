import { Hono } from "./lib/hono.ts";
import type { Context } from "./lib/hono.ts";
import {
  countServices,
  createService,
  deleteService,
  getServiceById,
  listServices,
  updateService,
} from "./storage/denodb.ts";
import { getValue, incrementCounter, setValue } from "./storage/kv.ts";

const app = new Hono();

const SERVICE_LIST_HITS_KEY: Deno.KvKey = [
  "metrics",
  "services",
  "list_hits",
];
const SERVICE_LAST_MUTATION_KEY: Deno.KvKey = [
  "metrics",
  "services",
  "last_mutation_at",
];
const SERVICE_COUNT_KEY: Deno.KvKey = [
  "metrics",
  "services",
  "count",
];
const SERVICE_LAST_LIST_KEY: Deno.KvKey = [
  "metrics",
  "services",
  "last_list_at",
];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeCount(value: unknown): number | null {
  const numericValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numericValue)) {
    return null;
  }
  if (numericValue < 0) {
    return null;
  }

  return Math.floor(numericValue);
}

async function readJsonBody<T>(context: Context): Promise<T | null> {
  try {
    return await context.req.json<T>();
  } catch (error) {
    console.error("Failed to parse JSON body", error);
    return null;
  }
}

function buildHeaders(init?: HeadersInit) {
  return new Headers(init);
}

app.get("/", async (context: Context) => {
  try {
    const services = await listServices();
    const listHits = await incrementCounter(SERVICE_LIST_HITS_KEY);
    const listedAt = new Date().toISOString();
    await setValue(SERVICE_LAST_LIST_KEY, listedAt);
    const lastMutation = await getValue<string>(SERVICE_LAST_MUTATION_KEY);
    const totalCount = await getValue<number>(SERVICE_COUNT_KEY);

    const headers = buildHeaders({
      "x-services-list-hits": String(listHits),
      "x-services-last-list-at": listedAt,
    });

    if (lastMutation) {
      headers.set("x-services-last-mutation-at", lastMutation);
    }

    if (typeof totalCount === "number") {
      headers.set("x-services-total-count", String(totalCount));
    }

    return context.json(services, 200, { headers });
  } catch (error) {
    console.error("Failed to list services", error);
    return context.json({ message: "Failed to list services" }, 500);
  }
});

app.post("/", async (context: Context) => {
  const payload = await readJsonBody<unknown>(context);

  if (!payload || typeof payload !== "object") {
    return context.json({ message: "Invalid JSON payload" }, 400);
  }

  const { name, service_type, status, organization_count } = payload as Record<
    string,
    unknown
  >;

  if (
    !isNonEmptyString(name) || !isNonEmptyString(service_type) ||
    !isNonEmptyString(status)
  ) {
    return context.json({
      message: "name, service_type, and status are required",
    }, 400);
  }

  const normalizedCount = organization_count === undefined
    ? 0
    : normalizeCount(organization_count);

  if (normalizedCount === null) {
    return context.json({
      message: "organization_count must be a non-negative integer",
    }, 400);
  }

  try {
    const service = await createService({
      name: name.trim(),
      service_type: service_type.trim(),
      status: status.trim(),
      organization_count: normalizedCount,
    });

    await setValue(SERVICE_LAST_MUTATION_KEY, service.updated_at);
    const total = await countServices();
    await setValue(SERVICE_COUNT_KEY, total);

    return context.json(service, 201);
  } catch (error) {
    console.error("Failed to create service", error);
    return context.json({ message: "Failed to create service" }, 500);
  }
});

app.get("/:id", async (context: Context) => {
  const id = context.req.param("id");

  if (!id) {
    return context.json({ message: "Missing service id" }, 400);
  }

  try {
    const service = await getServiceById(id);

    if (!service) {
      return context.json({ message: "Service not found" }, 404);
    }

    return context.json(service);
  } catch (error) {
    console.error("Failed to read service", error);
    return context.json({ message: "Failed to load service" }, 500);
  }
});

app.patch("/:id", async (context: Context) => {
  const id = context.req.param("id");

  if (!id) {
    return context.json({ message: "Missing service id" }, 400);
  }

  const payload = await readJsonBody<unknown>(context);

  if (!payload || typeof payload !== "object") {
    return context.json({ message: "Invalid JSON payload" }, 400);
  }

  const { name, service_type, status, organization_count } = payload as Record<
    string,
    unknown
  >;
  const updatePayload: {
    name?: string;
    service_type?: string;
    status?: string;
    organization_count?: number;
  } = {};

  if (isNonEmptyString(name)) {
    updatePayload.name = name.trim();
  }

  if (isNonEmptyString(service_type)) {
    updatePayload.service_type = service_type.trim();
  }

  if (isNonEmptyString(status)) {
    updatePayload.status = status.trim();
  }

  if (
    (payload as Record<string, unknown>).hasOwnProperty("organization_count")
  ) {
    const normalized = normalizeCount(organization_count);
    if (normalized === null) {
      return context.json({
        message: "organization_count must be a non-negative integer",
      }, 400);
    }
    updatePayload.organization_count = normalized;
  }

  if (Object.keys(updatePayload).length === 0) {
    return context.json({ message: "No updatable fields provided" }, 400);
  }

  try {
    const service = await updateService(id, updatePayload);

    if (!service) {
      return context.json({ message: "Service not found" }, 404);
    }

    await setValue(SERVICE_LAST_MUTATION_KEY, service.updated_at);
    return context.json(service);
  } catch (error) {
    console.error("Failed to update service", error);
    return context.json({ message: "Failed to update service" }, 500);
  }
});

app.delete("/:id", async (context: Context) => {
  const id = context.req.param("id");

  if (!id) {
    return context.json({ message: "Missing service id" }, 400);
  }

  try {
    const deleted = await deleteService(id);

    if (!deleted) {
      return context.json({ message: "Service not found" }, 404);
    }

    const mutationTimestamp = new Date().toISOString();
    await setValue(SERVICE_LAST_MUTATION_KEY, mutationTimestamp);
    const total = await countServices();
    await setValue(SERVICE_COUNT_KEY, total);

    return context.text("", 204);
  } catch (error) {
    console.error("Failed to delete service", error);
    return context.json({ message: "Failed to delete service" }, 500);
  }
});

export default app;
