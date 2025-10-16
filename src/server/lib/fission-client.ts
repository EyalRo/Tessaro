const DEFAULT_ROUTER_URL = "http://fission.dino.home";

export class FissionRequestError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "FissionRequestError";
    this.status = status;
    this.body = body;
  }
}

function getRouterUrl(): string {
  const raw = Bun.env.FISSION_ROUTER_URL;
  const url = typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : DEFAULT_ROUTER_URL;
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export async function fissionFetch(pathname: string, init?: RequestInit): Promise<Response> {
  const baseUrl = getRouterUrl();
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const url = `${baseUrl}${path}`;

  const headers = new Headers(init?.headers ?? {});
  if (!headers.has("accept")) {
    headers.set("accept", "application/json");
  }

  const response = await fetch(url, {
    ...init,
    headers,
  });

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.clone().json();
    } catch {
      body = await response.text();
    }
    throw new FissionRequestError(`Fission request failed with status ${response.status}`, response.status, body);
  }

  return response;
}

export async function fissionJson<T>(
  method: string,
  pathname: string,
  body?: unknown,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers ?? {});
  if (body !== undefined && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fissionFetch(pathname, {
    ...init,
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
