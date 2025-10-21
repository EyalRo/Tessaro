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

function resolveRouterUrl(): string {
  const configured = Bun.env.FISSION_ROUTER_URL;
  const base = typeof configured === "string" && configured.trim().length > 0 ? configured.trim() : DEFAULT_ROUTER_URL;
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

export async function fissionFetch(pathname: string, init?: RequestInit): Promise<Response> {
  const baseUrl = resolveRouterUrl();
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const url = new URL("/tessaro", `${baseUrl}/`);
  if (path !== "/tessaro") {
    url.searchParams.set("__path", path);
  }

  const headers = new Headers(init?.headers ?? {});
  if (!headers.has("accept")) {
    headers.set("accept", "application/json");
  }
  headers.set("x-tessaro-path", path);

  const response = await fetch(url.toString(), {
    ...init,
    headers,
  });

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.clone().json();
    } catch {
      try {
        body = await response.text();
      } catch {
        body = null;
      }
    }

    throw new FissionRequestError(`Fission request failed with status ${response.status}`, response.status, body);
  }

  return response;
}

export async function fissionJson<T>(method: string, pathname: string, body?: unknown, init?: RequestInit): Promise<T> {
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
