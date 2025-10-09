export type UserProfile = {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  organizations: Organization[];
};

export type CreateUserPayload = {
  name: string;
  email: string;
  role: string;
  avatar_url?: string | null | undefined;
  organization_ids?: string[];
};

export type UpdateUserPayload = Partial<CreateUserPayload>;

export type Organization = {
  id: string;
  name: string;
  plan: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type CreateOrganizationPayload = {
  name: string;
  plan: string;
  status: string;
};

export type UpdateOrganizationPayload = Partial<CreateOrganizationPayload>;

export type Service = {
  id: string;
  name: string;
  service_type: string;
  status: string;
  organization_count: number;
  created_at: string;
  updated_at: string;
};

export type CreateServicePayload = {
  name: string;
  service_type: string;
  status: string;
  organization_count?: number;
};

export type UpdateServicePayload = Partial<CreateServicePayload>;

export class ApiClientError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.details = details;
    Object.setPrototypeOf(this, ApiClientError.prototype);
  }
}

function joinUrl(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  return `${normalizedBase}/${normalizedPath}`;
}

async function parseJson<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.toLowerCase().includes('application/json')) {
    return (await response.json()) as T;
  }

  return undefined as unknown as T;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let details: unknown;

    try {
      details = await parseJson<unknown>(response);
    } catch {
      details = undefined;
    }

    throw new ApiClientError(response.statusText || 'Request failed', response.status, details);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return parseJson<T>(response);
}

class BaseApiClient {
  constructor(private readonly baseUrl: string) {}

  protected buildUrl(path: string): string {
    return joinUrl(this.baseUrl, path);
  }

  protected async request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers = new Headers(init?.headers);
    headers.set('Accept', 'application/json');

    if (init?.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(this.buildUrl(path), {
      credentials: 'include',
      ...init,
      headers
    });

    return handleResponse<T>(response);
  }
}

export class UserApiClient extends BaseApiClient {
  constructor(baseUrl: string) {
    super(baseUrl);
  }

  async listUsers(): Promise<UserProfile[]> {
    return this.request<UserProfile[]>('/users');
  }

  async getUser(id: string): Promise<UserProfile> {
    return this.request<UserProfile>(`/users/${encodeURIComponent(id)}`);
  }

  async createUser(payload: CreateUserPayload): Promise<UserProfile> {
    return this.request<UserProfile>('/users', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async updateUser(id: string, payload: UpdateUserPayload): Promise<UserProfile> {
    return this.request<UserProfile>(`/users/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  }

  async deleteUser(id: string): Promise<void> {
    await this.request<void>(`/users/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  }
}

export class OrganizationApiClient extends BaseApiClient {
  constructor(baseUrl: string) {
    super(baseUrl);
  }

  async listOrganizations(): Promise<Organization[]> {
    return this.request<Organization[]>('/organizations');
  }

  async createOrganization(payload: CreateOrganizationPayload): Promise<Organization> {
    return this.request<Organization>('/organizations', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async updateOrganization(id: string, payload: UpdateOrganizationPayload): Promise<Organization> {
    return this.request<Organization>(`/organizations/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  }

  async deleteOrganization(id: string): Promise<void> {
    await this.request<void>(`/organizations/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  }
}

export class ServiceApiClient extends BaseApiClient {
  constructor(baseUrl: string) {
    super(baseUrl);
  }

  async listServices(): Promise<Service[]> {
    return this.request<Service[]>('/services');
  }

  async createService(payload: CreateServicePayload): Promise<Service> {
    return this.request<Service>('/services', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async updateService(id: string, payload: UpdateServicePayload): Promise<Service> {
    return this.request<Service>(`/services/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  }

  async deleteService(id: string): Promise<void> {
    await this.request<void>(`/services/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  }
}
