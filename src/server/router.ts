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

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
};

export type ApiHandler = (request: Request) => Promise<Response>;

type RoutePattern = {
  exec(url: string): { pathname: { groups: Record<string, string> } } | null;
};

type RouteDefinition = {
  method: string;
  pattern: RoutePattern;
  handler: ApiHandler;
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
  { method: "POST", pattern: createPattern("/api/auth/login"), handler: loginRoute },
  { method: "POST", pattern: createPattern("/api/auth/logout"), handler: logoutRoute },
  { method: "GET", pattern: createPattern("/api/auth/session"), handler: sessionRoute },
  { method: "GET", pattern: createPattern("/api/app/context"), handler: organizationContextRoute },

  { method: "GET", pattern: createPattern("/api/users"), handler: listUsersRoute },
  { method: "POST", pattern: createPattern("/api/users"), handler: createUserRoute },
  { method: "GET", pattern: createPattern("/api/users/:id"), handler: readUserRoute },
  { method: "PATCH", pattern: createPattern("/api/users/:id"), handler: updateUserRoute },
  { method: "DELETE", pattern: createPattern("/api/users/:id"), handler: deleteUserRoute },

  { method: "GET", pattern: createPattern("/api/organizations"), handler: listOrganizationsRoute },
  { method: "POST", pattern: createPattern("/api/organizations"), handler: createOrganizationRoute },
  { method: "GET", pattern: createPattern("/api/organizations/:id"), handler: readOrganizationRoute },
  { method: "PATCH", pattern: createPattern("/api/organizations/:id"), handler: updateOrganizationRoute },
  { method: "DELETE", pattern: createPattern("/api/organizations/:id"), handler: deleteOrganizationRoute },

  { method: "GET", pattern: createPattern("/api/services"), handler: listServicesRoute },
  { method: "POST", pattern: createPattern("/api/services"), handler: createServiceRoute },
  { method: "GET", pattern: createPattern("/api/services/:id"), handler: readServiceRoute },
  { method: "PATCH", pattern: createPattern("/api/services/:id"), handler: updateServiceRoute },
  { method: "DELETE", pattern: createPattern("/api/services/:id"), handler: deleteServiceRoute },
];

function attachParams(request: Request, params: RouteParams) {
  const requestWithParams = request as Request & { params?: RouteParams };

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

function notFound(message = "Not Found", status = 404) {
  return Response.json({ message }, { status, headers: jsonHeaders });
}

export async function handleApiRequest(request: Request): Promise<Response> {
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
    if (route.method !== request.method.toUpperCase()) {
      continue;
    }

    const match = route.pattern.exec(request.url);
    if (!match) {
      continue;
    }

    const params = match.pathname.groups as RouteParams;
    const requestWithParams = attachParams(request, params);
    const response = await route.handler(requestWithParams);

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
  return response;
}
