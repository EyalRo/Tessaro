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

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
};

export type ApiHandler = (request: Request) => Promise<Response>;

type RouteDefinition = {
  method: string;
  pattern: URLPattern;
  handler: ApiHandler;
};

const routes: RouteDefinition[] = [
  { method: "GET", pattern: new URLPattern({ pathname: "/api/users" }), handler: listUsersRoute },
  { method: "POST", pattern: new URLPattern({ pathname: "/api/users" }), handler: createUserRoute },
  { method: "GET", pattern: new URLPattern({ pathname: "/api/users/:id" }), handler: readUserRoute },
  { method: "PATCH", pattern: new URLPattern({ pathname: "/api/users/:id" }), handler: updateUserRoute },
  { method: "DELETE", pattern: new URLPattern({ pathname: "/api/users/:id" }), handler: deleteUserRoute },

  { method: "GET", pattern: new URLPattern({ pathname: "/api/organizations" }), handler: listOrganizationsRoute },
  { method: "POST", pattern: new URLPattern({ pathname: "/api/organizations" }), handler: createOrganizationRoute },
  { method: "GET", pattern: new URLPattern({ pathname: "/api/organizations/:id" }), handler: readOrganizationRoute },
  { method: "PATCH", pattern: new URLPattern({ pathname: "/api/organizations/:id" }), handler: updateOrganizationRoute },
  { method: "DELETE", pattern: new URLPattern({ pathname: "/api/organizations/:id" }), handler: deleteOrganizationRoute },

  { method: "GET", pattern: new URLPattern({ pathname: "/api/services" }), handler: listServicesRoute },
  { method: "POST", pattern: new URLPattern({ pathname: "/api/services" }), handler: createServiceRoute },
  { method: "GET", pattern: new URLPattern({ pathname: "/api/services/:id" }), handler: readServiceRoute },
  { method: "PATCH", pattern: new URLPattern({ pathname: "/api/services/:id" }), handler: updateServiceRoute },
  { method: "DELETE", pattern: new URLPattern({ pathname: "/api/services/:id" }), handler: deleteServiceRoute },
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
