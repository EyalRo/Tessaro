import { Hono } from "./lib/hono.ts";
import type { Context } from "./lib/hono.ts";
import users from "./users.ts";
import { closeDatabase } from "./storage/denodb.ts";
import { closeKv } from "./storage/kv.ts";

type CorsOptions = {
  allowedOrigins?: string[];
  allowCredentials?: boolean;
  allowHeaders?: string[];
  allowMethods?: string[];
  exposeHeaders?: string[];
};

const DEV_ORIGIN_HOSTS = new Set(["localhost", "127.0.0.1"]);
const DEFAULT_EXPOSE_HEADERS = [
  "x-users-list-hits",
  "x-users-last-list-at",
  "x-users-last-mutation-at",
  "x-users-total-count",
];

function readAllowedOrigins(): string[] {
  try {
    const envValue = Deno.env.get("CORS_ALLOWED_ORIGINS");
    if (!envValue) {
      return [];
    }

    return envValue
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function isDevOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return (url.protocol === "http:" || url.protocol === "https:") &&
      DEV_ORIGIN_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

function isOriginAllowed(
  origin: string,
  allowedOrigins: string[],
  allowDevFallback: boolean,
): boolean {
  if (allowedOrigins.includes("*")) {
    return true;
  }

  if (allowedOrigins.includes(origin)) {
    return true;
  }

  if (allowDevFallback && isDevOrigin(origin)) {
    return true;
  }

  return false;
}

function appendVary(headers: Headers, value: string) {
  const existing = headers.get("vary");
  if (!existing) {
    headers.set("vary", value);
    return;
  }

  const headerValues = new Set(
    existing.split(",").map((item) => item.trim()).filter(Boolean),
  );
  const newValues = value.split(",").map((item) => item.trim()).filter(Boolean);
  for (const newValue of newValues) {
    headerValues.add(newValue);
  }
  headers.set("vary", Array.from(headerValues).join(", "));
}

function applyCorsHeaders(target: Headers, corsHeaders: Headers) {
  corsHeaders.forEach((value, key) => {
    if (key.toLowerCase() === "vary") {
      appendVary(target, value);
      return;
    }

    target.set(key, value);
  });
}

function createCorsHeaders(
  origin: string,
  allowCredentials: boolean,
  exposeHeaders: string[],
): Headers {
  const headers = new Headers();
  headers.set("access-control-allow-origin", origin);
  if (allowCredentials) {
    headers.set("access-control-allow-credentials", "true");
  }

  appendVary(headers, "origin");

  if (exposeHeaders.length > 0) {
    headers.set("access-control-expose-headers", exposeHeaders.join(", "));
  }

  return headers;
}

function createPreflightHeaders(
  origin: string,
  request: Request,
  allowCredentials: boolean,
  allowMethods: string[],
  allowHeaders: string[],
  exposeHeaders: string[],
): Headers {
  const headers = createCorsHeaders(origin, allowCredentials, exposeHeaders);
  headers.set("access-control-allow-methods", allowMethods.join(", "));

  const requestedHeaders = request.headers.get(
    "access-control-request-headers",
  );
  if (requestedHeaders && requestedHeaders.trim().length > 0) {
    headers.set("access-control-allow-headers", requestedHeaders);
  } else if (allowHeaders.length > 0) {
    headers.set("access-control-allow-headers", allowHeaders.join(", "));
  }

  headers.set("access-control-max-age", "86400");
  return headers;
}

export function createRequestHandler(
  app: Hono,
  options: CorsOptions = {},
) {
  const envAllowedOrigins = readAllowedOrigins();
  const allowedOrigins = options.allowedOrigins ?? envAllowedOrigins;
  const allowCredentials = options.allowCredentials ?? true;
  const allowMethods = options.allowMethods ?? [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ];
  const allowHeaders = options.allowHeaders ?? [
    "Content-Type",
    "Authorization",
  ];
  const exposeHeaders = options.exposeHeaders ?? DEFAULT_EXPOSE_HEADERS;
  const allowDevFallback = envAllowedOrigins.length === 0;

  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get("origin");
    const originAllowed = origin
      ? isOriginAllowed(origin, allowedOrigins, allowDevFallback)
      : false;

    if (request.method.toUpperCase() === "OPTIONS") {
      if (!origin || !originAllowed) {
        return new Response(null, { status: 204 });
      }

      const headers = createPreflightHeaders(
        origin,
        request,
        allowCredentials,
        allowMethods,
        allowHeaders,
        exposeHeaders,
      );

      return new Response(null, { status: 204, headers });
    }

    const response = await app.fetch(request);

    if (!origin || !originAllowed) {
      return response;
    }

    const headers = new Headers(response.headers);
    applyCorsHeaders(
      headers,
      createCorsHeaders(origin, allowCredentials, exposeHeaders),
    );

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}

export function createApp() {
  const app = new Hono();
  app.get("/", (c: Context) => c.text("Hello, World!"));
  app.route("/users", users);

  return app;
}

export const app = createApp();
export const handler = createRequestHandler(app);

if (import.meta.main) {
  const configuredPort = Number.parseInt(Deno.env.get("PORT") ?? "", 10);
  const port = Number.isFinite(configuredPort) ? configuredPort : 8000;
  const controller = new AbortController();
  const signals: Deno.Signal[] = ["SIGINT", "SIGTERM"];
  const signalHandlers = signals.map((signal) => {
    const handler = () => controller.abort();
    Deno.addSignalListener(signal, handler);
    return { signal, handler };
  });

  const server = Deno.serve({ port, signal: controller.signal }, handler);

  server.finished.finally(async () => {
    for (const { signal, handler } of signalHandlers) {
      Deno.removeSignalListener(signal, handler);
    }

    await closeDatabase();
    await closeKv();
  });
}
