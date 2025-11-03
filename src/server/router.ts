import { randomUUID } from "node:crypto";
import type { RouteParams } from "./routes/utils";
import {
  listUsersRoute,
  createUserRoute,
  readUserRoute,
  updateUserRoute,
  deleteUserRoute,
} from "./routes/users";
import {
  listOrganizationsRoute,
  createOrganizationRoute,
  readOrganizationRoute,
  updateOrganizationRoute,
  deleteOrganizationRoute,
} from "./routes/organizations";
import {
  listServicesRoute,
  createServiceRoute,
  readServiceRoute,
  updateServiceRoute,
  deleteServiceRoute,
} from "./routes/services";
import {
  loginRoute,
  logoutRoute,
  sessionRoute,
} from "./routes/auth";
import { organizationContextRoute } from "./routes/org-app";
import { logger } from "./lib/logger";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
};

export type ApiHandler = (request: Request) => Promise<Response>;

type RoutePattern = {
  exec(url: string): { pathname: { groups: Record<string, string> } } | null;
};

type RouteDefinition = {
  method: string;
  path: string;
  pattern: RoutePattern;
  handler: ApiHandler;
};

type LogContext = {
  requestId: string;
  route?: string;
};

type RequestWithContext = Request & {
  params?: RouteParams;
  logContext?: LogContext;
};

function createPattern(pathname: string): RoutePattern {
  const segments = pathname.split("/").filter(Boolean);
  const paramNames: string[] = [];
  const escaped = segments.map((segment) => {
    if (segment.startsWith(":")) {
      paramNames.push(segment.slice(1));
      return "([^/]+)";
    }

    return segment.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  });

  const source = segments.length ? `^/${escaped.join("/")}/?$` : "^/$";
  const matcher = new RegExp(source);

  return {
    exec(url) {
      const target = new URL(url, "http://localhost");
      const normalized = target.pathname === "/"
        ? "/"
        : target.pathname.replace(/\/+$/, "");
      const match = matcher.exec(normalized);
      if (!match) {
        return null;
      }

      const groups: Record<string, string> = {};
      paramNames.forEach((name, index) => {
        groups[name] = decodeURIComponent(match[index + 1]);
      });

      return { pathname: { groups } };
    },
  };
}

const routes: RouteDefinition[] = [
  { method: "POST", path: "/api/auth/login", pattern: createPattern("/api/auth/login"), handler: loginRoute },
  { method: "POST", path: "/api/auth/logout", pattern: createPattern("/api/auth/logout"), handler: logoutRoute },
  { method: "GET", path: "/api/auth/session", pattern: createPattern("/api/auth/session"), handler: sessionRoute },
  { method: "GET", path: "/api/app/context", pattern: createPattern("/api/app/context"), handler: organizationContextRoute },

  { method: "GET", path: "/api/users", pattern: createPattern("/api/users"), handler: listUsersRoute },
  { method: "POST", path: "/api/users", pattern: createPattern("/api/users"), handler: createUserRoute },
  { method: "GET", path: "/api/users/:id", pattern: createPattern("/api/users/:id"), handler: readUserRoute },
  { method: "PATCH", path: "/api/users/:id", pattern: createPattern("/api/users/:id"), handler: updateUserRoute },
  { method: "DELETE", path: "/api/users/:id", pattern: createPattern("/api/users/:id"), handler: deleteUserRoute },

  { method: "GET", path: "/api/organizations", pattern: createPattern("/api/organizations"), handler: listOrganizationsRoute },
  { method: "POST", path: "/api/organizations", pattern: createPattern("/api/organizations"), handler: createOrganizationRoute },
  { method: "GET", path: "/api/organizations/:id", pattern: createPattern("/api/organizations/:id"), handler: readOrganizationRoute },
  { method: "PATCH", path: "/api/organizations/:id", pattern: createPattern("/api/organizations/:id"), handler: updateOrganizationRoute },
  { method: "DELETE", path: "/api/organizations/:id", pattern: createPattern("/api/organizations/:id"), handler: deleteOrganizationRoute },

  { method: "GET", path: "/api/services", pattern: createPattern("/api/services"), handler: listServicesRoute },
  { method: "POST", path: "/api/services", pattern: createPattern("/api/services"), handler: createServiceRoute },
  { method: "GET", path: "/api/services/:id", pattern: createPattern("/api/services/:id"), handler: readServiceRoute },
  { method: "PATCH", path: "/api/services/:id", pattern: createPattern("/api/services/:id"), handler: updateServiceRoute },
  { method: "DELETE", path: "/api/services/:id", pattern: createPattern("/api/services/:id"), handler: deleteServiceRoute },
];

function attachParams(request: Request, params: RouteParams) {
  const requestWithParams = request as RequestWithContext;

  if (requestWithParams.params === params) {
    return requestWithParams;
  }

  Object.defineProperty(requestWithParams, "params", {
    value: params,
    enumerable: false,
    configurable: true,
  });

  return requestWithParams;
}

function attachLogContext(request: Request, context: LogContext) {
  const requestWithContext = request as RequestWithContext;

  if (requestWithContext.logContext === context) {
    return requestWithContext;
  }

  Object.defineProperty(requestWithContext, "logContext", {
    value: context,
    enumerable: false,
    configurable: true,
  });

  return requestWithContext;
}

function notFound(message = "Not Found", status = 404) {
  return Response.json({ message }, { status, headers: jsonHeaders });
}

export async function handleApiRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  const startedAt = performance.now();
  const baseLogPayload = {
    requestId,
    method,
    path: url.pathname,
    search: url.search || null,
  };

  logger.info("API request received", baseLogPayload);

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        ...jsonHeaders,
        "access-control-allow-origin": request.headers.get("origin") ?? "*",
        "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
        "access-control-allow-headers": request.headers.get("access-control-request-headers") ?? "content-type",
        "access-control-allow-credentials": "true",
      },
    });
  }

  for (const route of routes) {
    if (route.method !== method) {
      continue;
    }

    const match = route.pattern.exec(request.url);
    if (!match) {
      continue;
    }

    const logContext: LogContext = { requestId, route: `${route.method} ${route.path}` };
    const params = match.pathname.groups as RouteParams;
    const requestWithContext = attachLogContext(request, logContext);
    const requestWithParams = attachParams(requestWithContext, params);

    logger.debug("API route matched", {
      ...baseLogPayload,
      route: `${route.method} ${route.path}`,
      params,
    });

    const response = await route.handler(requestWithParams);
    const durationMs = Math.round(performance.now() - startedAt);

    logger.info("API response produced", {
      ...baseLogPayload,
      route: `${route.method} ${route.path}`,
      status: response.status,
      durationMs,
    });

    if (!response.headers.has("x-request-id")) {
      response.headers.set("x-request-id", requestId);
    }

    if (!response.headers.has("access-control-allow-origin")) {
      response.headers.set("access-control-allow-origin", request.headers.get("origin") ?? "*");
      response.headers.set("access-control-allow-credentials", "true");
      response.headers.set(
        "access-control-allow-methods",
        "GET,POST,PATCH,DELETE,OPTIONS",
      );
      response.headers.set(
        "access-control-allow-headers",
        request.headers.get("access-control-request-headers") ?? "content-type",
      );
    }

    return response;
  }

  const response = notFound();
  const durationMs = Math.round(performance.now() - startedAt);

  logger.warn("API route not found", {
    ...baseLogPayload,
    durationMs,
  });

  response.headers.set("access-control-allow-origin", request.headers.get("origin") ?? "*");
  response.headers.set("access-control-allow-credentials", "true");
  response.headers.set(
    "access-control-allow-methods",
    "GET,POST,PATCH,DELETE,OPTIONS",
  );
  response.headers.set(
    "access-control-allow-headers",
    request.headers.get("access-control-request-headers") ?? "content-type",
  );
  response.headers.set("x-request-id", requestId);
  return response;
}
