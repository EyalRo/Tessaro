const FISSION_BASE_URL = Bun.env.FISSION_BASE_URL ?? "http://fission.dino.home";
const DEFAULT_ACCEPT = "application/json";

export type FissionRequestOptions = RequestInit & {
  acceptStatuses?: number[];
};

type WithMaybeNull<T> = T | null;

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  accept: DEFAULT_ACCEPT,
};

function buildFissionUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const target = new URL("/tessaro", FISSION_BASE_URL);
  target.searchParams.set("__path", normalizedPath);
  return target.toString();
}

async function parseJson<T>(response: Response): Promise<T | null> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    if (response.status === 204) {
      return null;
    }
    const text = await response.text();
    if (!text) {
      return null;
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      return null;
    }
  }

  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function fissionRequest<T>(
  path: string,
  options: FissionRequestOptions = {},
) {
  const { acceptStatuses = [], headers, ...init } = options;
  const requestHeaders = new Headers(headers ?? {});

  if (!requestHeaders.has("accept")) {
    requestHeaders.set("accept", DEFAULT_ACCEPT);
  }

  const hasBody = init.body !== undefined && init.body !== null;
  if (hasBody && !requestHeaders.has("content-type")) {
    requestHeaders.set("content-type", JSON_HEADERS["content-type"]);
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  requestHeaders.set("x-tessaro-path", normalizedPath);

  const response = await fetch(buildFissionUrl(path), {
    ...init,
    headers: requestHeaders,
  });

  if (!response.ok && !acceptStatuses.includes(response.status)) {
    const body = await parseJson<{ message?: string }>(response);
    const error = new Error(
      body?.message ?? `Fission request failed with status ${response.status}`,
    ) as Error & {
      status?: number;
      body?: unknown;
    };
    error.status = response.status;
    error.body = body;
    throw error;
  }

  const data = await parseJson<T>(response);
  return {
    status: response.status,
    data: data as WithMaybeNull<T>,
  };
}
