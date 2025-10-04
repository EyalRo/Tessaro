export type UserProfile = {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateUserPayload = {
  name: string;
  email: string;
  role: string;
  avatar_url?: string | null | undefined;
};

export type UpdateUserPayload = Partial<CreateUserPayload>;

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

export class UserApiClient {
  constructor(private readonly baseUrl: string) {}

  private buildUrl(path: string): string {
    return joinUrl(this.baseUrl, path);
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
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

  async listUsers(): Promise<UserProfile[]> {
    return this.request<UserProfile[]>('/users');
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
