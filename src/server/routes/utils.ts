export type RouteParams = Record<string, string>;

type ParamRequest = Request & { params?: RouteParams };

type JsonValue = Record<string, unknown> | unknown[] | string | number | boolean | null;

export function getParam(request: Request, key: string): string | null {
  const params = (request as ParamRequest).params;
  const value = params?.[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function normalizeOptionalString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export async function readJson<T extends JsonValue>(request: Request): Promise<T | null> {
  try {
    return await request.json<T>();
  } catch (error) {
    console.error("Failed to parse JSON body", error);
    return null;
  }
}

export function errorResponse(message: string, status = 500, init?: ResponseInit) {
  return Response.json({ message }, { status, ...init });
}

export function noContent(headers?: HeadersInit) {
  return new Response(null, { status: 204, headers });
}

export function formatHeaders(init?: HeadersInit): Headers {
  return new Headers(init);
}
