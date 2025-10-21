import { fissionRequest } from "./client";

export type OrganizationRecord = {
  id: string;
  name: string;
  plan: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type CreateOrganizationInput = {
  id?: string;
  name: string;
  plan: string;
  status: string;
};

export type UpdateOrganizationInput = Partial<CreateOrganizationInput>;

export async function listOrganizations(): Promise<OrganizationRecord[]> {
  const { data } = await fissionRequest<OrganizationRecord[]>("/tessaro/organizations");
  return data ?? [];
}

export async function getOrganizationById(id: string): Promise<OrganizationRecord | null> {
  const { status, data } = await fissionRequest<OrganizationRecord>(
    `/tessaro/organizations/${encodeURIComponent(id)}`,
    { method: "GET", acceptStatuses: [404] },
  );
  return status === 404 ? null : data;
}

export async function createOrganization(
  input: CreateOrganizationInput,
): Promise<OrganizationRecord> {
  const { data } = await fissionRequest<OrganizationRecord>("/tessaro/organizations", {
    method: "POST",
    body: JSON.stringify(input),
  });

  if (!data) {
    throw new Error("Fission createOrganization returned no data");
  }

  return data;
}

export async function updateOrganization(
  id: string,
  input: UpdateOrganizationInput,
): Promise<OrganizationRecord | null> {
  const { status, data } = await fissionRequest<OrganizationRecord>(
    `/tessaro/organizations/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify(input),
      acceptStatuses: [404],
    },
  );

  return status === 404 ? null : data;
}

export async function deleteOrganization(id: string): Promise<boolean> {
  const { status } = await fissionRequest<null>(
    `/tessaro/organizations/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      acceptStatuses: [404],
    },
  );

  return status === 200 || status === 202 || status === 204;
}

export async function countOrganizations(): Promise<number> {
  const { data } = await fissionRequest<{ count: number }>(
    "/tessaro/organizations?summary=count",
  );
  return Number(data?.count ?? 0);
}
