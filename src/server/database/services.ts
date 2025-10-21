import { fissionRequest } from "./client";

export type ServiceRecord = {
  id: string;
  name: string;
  service_type: string;
  status: string;
  organization_count: number;
  created_at: string;
  updated_at: string;
  description: string | null;
};

export type CreateServiceInput = {
  id?: string;
  name: string;
  service_type: string;
  status: string;
  organization_count?: number;
  description?: string | null;
  organization_ids?: string[];
};

export type UpdateServiceInput = Partial<CreateServiceInput>;

export async function listServices(): Promise<ServiceRecord[]> {
  const { data } = await fissionRequest<ServiceRecord[]>("/tessaro/services");
  return data ?? [];
}

export async function getServiceById(id: string): Promise<ServiceRecord | null> {
  const { status, data } = await fissionRequest<ServiceRecord>(
    `/tessaro/services/${encodeURIComponent(id)}`,
    { method: "GET", acceptStatuses: [404] },
  );
  return status === 404 ? null : data;
}

export async function createService(input: CreateServiceInput): Promise<ServiceRecord> {
  const { data } = await fissionRequest<ServiceRecord>("/tessaro/services", {
    method: "POST",
    body: JSON.stringify(input),
  });

  if (!data) {
    throw new Error("Fission createService returned no data");
  }

  return data;
}

export async function updateService(
  id: string,
  input: UpdateServiceInput,
): Promise<ServiceRecord | null> {
  const { status, data } = await fissionRequest<ServiceRecord>(
    `/tessaro/services/${encodeURIComponent(id)}`,
    { method: "PUT", body: JSON.stringify(input), acceptStatuses: [404] },
  );
  return status === 404 ? null : data;
}

export async function deleteService(id: string): Promise<boolean> {
  const { status } = await fissionRequest<null>(
    `/tessaro/services/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      acceptStatuses: [404],
    },
  );
  return status === 200 || status === 202 || status === 204;
}

export async function countServices(): Promise<number> {
  const { data } = await fissionRequest<{ count: number }>("/tessaro/services?summary=count");
  return Number(data?.count ?? 0);
}

export async function listServicesForOrganizations(
  organizationIds: string[],
): Promise<ServiceRecord[]> {
  if (!organizationIds.length) {
    return [];
  }

  const { data } = await fissionRequest<ServiceRecord[]>("/tessaro/services/query", {
    method: "POST",
    body: JSON.stringify({ organization_ids: organizationIds }),
  });

  return data ?? [];
}
