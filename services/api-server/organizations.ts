import { Hono } from "./lib/hono.ts";
import type { Context } from "./lib/hono.ts";
import {
  countOrganizations,
  createOrganization,
  deleteOrganization,
  getOrganizationById,
  listOrganizations,
  updateOrganization,
} from "./storage/denodb.ts";
import { getValue, incrementCounter, setValue } from "./storage/kv.ts";

const app = new Hono();

const ORGANIZATION_LIST_HITS_KEY: Deno.KvKey = [
  "metrics",
  "organizations",
  "list_hits",
];
const ORGANIZATION_LAST_MUTATION_KEY: Deno.KvKey = [
  "metrics",
  "organizations",
  "last_mutation_at",
];
const ORGANIZATION_COUNT_KEY: Deno.KvKey = [
  "metrics",
  "organizations",
  "count",
];
const ORGANIZATION_LAST_LIST_KEY: Deno.KvKey = [
  "metrics",
  "organizations",
  "last_list_at",
];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
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
    const organizations = await listOrganizations();
    const listHits = await incrementCounter(ORGANIZATION_LIST_HITS_KEY);
    const listedAt = new Date().toISOString();
    await setValue(ORGANIZATION_LAST_LIST_KEY, listedAt);
    const lastMutation = await getValue<string>(ORGANIZATION_LAST_MUTATION_KEY);
    const totalCount = await getValue<number>(ORGANIZATION_COUNT_KEY);

    const headers = buildHeaders({
      "x-organizations-list-hits": String(listHits),
      "x-organizations-last-list-at": listedAt,
    });

    if (lastMutation) {
      headers.set("x-organizations-last-mutation-at", lastMutation);
    }

    if (typeof totalCount === "number") {
      headers.set("x-organizations-total-count", String(totalCount));
    }

    return context.json(organizations, 200, { headers });
  } catch (error) {
    console.error("Failed to list organizations", error);
    return context.json({ message: "Failed to list organizations" }, 500);
  }
});

app.post("/", async (context: Context) => {
  const payload = await readJsonBody<unknown>(context);

  if (!payload || typeof payload !== "object") {
    return context.json({ message: "Invalid JSON payload" }, 400);
  }

  const { name, plan, status } = payload as Record<string, unknown>;

  if (
    !isNonEmptyString(name) || !isNonEmptyString(plan) ||
    !isNonEmptyString(status)
  ) {
    return context.json({
      message: "name, plan, and status are required",
    }, 400);
  }

  try {
    const organization = await createOrganization({
      name: name.trim(),
      plan: plan.trim(),
      status: status.trim(),
    });

    await setValue(ORGANIZATION_LAST_MUTATION_KEY, organization.updated_at);
    const total = await countOrganizations();
    await setValue(ORGANIZATION_COUNT_KEY, total);

    return context.json(organization, 201);
  } catch (error) {
    console.error("Failed to create organization", error);
    return context.json({ message: "Failed to create organization" }, 500);
  }
});

app.get("/:id", async (context: Context) => {
  const id = context.req.param("id");

  if (!id) {
    return context.json({ message: "Missing organization id" }, 400);
  }

  try {
    const organization = await getOrganizationById(id);

    if (!organization) {
      return context.json({ message: "Organization not found" }, 404);
    }

    return context.json(organization);
  } catch (error) {
    console.error("Failed to read organization", error);
    return context.json({ message: "Failed to load organization" }, 500);
  }
});

app.patch("/:id", async (context: Context) => {
  const id = context.req.param("id");

  if (!id) {
    return context.json({ message: "Missing organization id" }, 400);
  }

  const payload = await readJsonBody<unknown>(context);

  if (!payload || typeof payload !== "object") {
    return context.json({ message: "Invalid JSON payload" }, 400);
  }

  const { name, plan, status } = payload as Record<string, unknown>;
  const updatePayload: {
    name?: string;
    plan?: string;
    status?: string;
  } = {};

  if (isNonEmptyString(name)) {
    updatePayload.name = name.trim();
  }

  if (isNonEmptyString(plan)) {
    updatePayload.plan = plan.trim();
  }

  if (isNonEmptyString(status)) {
    updatePayload.status = status.trim();
  }

  if (Object.keys(updatePayload).length === 0) {
    return context.json({ message: "No updatable fields provided" }, 400);
  }

  try {
    const organization = await updateOrganization(id, updatePayload);

    if (!organization) {
      return context.json({ message: "Organization not found" }, 404);
    }

    await setValue(ORGANIZATION_LAST_MUTATION_KEY, organization.updated_at);
    return context.json(organization);
  } catch (error) {
    console.error("Failed to update organization", error);
    return context.json({ message: "Failed to update organization" }, 500);
  }
});

app.delete("/:id", async (context: Context) => {
  const id = context.req.param("id");

  if (!id) {
    return context.json({ message: "Missing organization id" }, 400);
  }

  try {
    const deleted = await deleteOrganization(id);

    if (!deleted) {
      return context.json({ message: "Organization not found" }, 404);
    }

    const mutationTimestamp = new Date().toISOString();
    await setValue(ORGANIZATION_LAST_MUTATION_KEY, mutationTimestamp);
    const total = await countOrganizations();
    await setValue(ORGANIZATION_COUNT_KEY, total);

    return context.text("", 204);
  } catch (error) {
    console.error("Failed to delete organization", error);
    return context.json({ message: "Failed to delete organization" }, 500);
  }
});

export default app;
