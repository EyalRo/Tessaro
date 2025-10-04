export interface Context {
  req: {
    method: string;
    url: string;
    param(name: string): string | undefined;
    json<T = unknown>(): Promise<T>;
    text(): Promise<string>;
  };
  json(body: unknown, status?: number, init?: ResponseInit): Response;
  text(body: string, status?: number, init?: ResponseInit): Response;
}

type Handler = (context: Context) => Response | Promise<Response>;

type Segment = { type: "literal"; value: string } | {
  type: "param";
  name: string;
};

type Route = {
  method: string;
  segments: Segment[];
  handler: Handler;
};

function normalizePath(path: string) {
  if (!path || path === "/") {
    return [];
  }

  return path
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .filter(Boolean);
}

function parsePath(path: string): Segment[] {
  return normalizePath(path).map((segment) => {
    if (segment.startsWith(":")) {
      return { type: "param", name: segment.slice(1) || "param" } as Segment;
    }

    return { type: "literal", value: segment } as Segment;
  });
}

class RouterContext implements Context {
  #request: Request;
  #params: Record<string, string>;

  constructor(request: Request, params: Record<string, string>) {
    this.#request = request;
    this.#params = params;
  }

  get req() {
    const request = this.#request;
    const params = this.#params;

    return {
      method: request.method,
      url: request.url,
      param: (name: string) => params[name],
      json: <T>() => request.json() as Promise<T>,
      text: () => request.text(),
    };
  }

  json(body: unknown, status = 200, init: ResponseInit = {}) {
    const headers = new Headers(init.headers);
    if (!headers.has("content-type")) {
      headers.set("content-type", "application/json; charset=utf-8");
    }

    return new Response(JSON.stringify(body), {
      ...init,
      status,
      headers,
    });
  }

  text(body: string, status = 200, init: ResponseInit = {}) {
    const headers = new Headers(init.headers);
    if (!headers.has("content-type")) {
      headers.set("content-type", "text/plain; charset=utf-8");
    }

    return new Response(body, {
      ...init,
      status,
      headers,
    });
  }
}

export class Hono {
  private routes: Route[] = [];

  private addRoute(method: string, path: string, handler: Handler) {
    const segments = parsePath(path);
    this.routes.push({ method: method.toUpperCase(), segments, handler });
    return this;
  }

  get(path: string, handler: Handler) {
    return this.addRoute("GET", path, handler);
  }

  post(path: string, handler: Handler) {
    return this.addRoute("POST", path, handler);
  }

  route(path: string, app: Hono) {
    const baseSegments = parsePath(path);

    for (const route of app.routes) {
      this.routes.push({
        method: route.method,
        segments: [...baseSegments, ...route.segments],
        handler: route.handler,
      });
    }

    return this;
  }

  async fetch(request: Request) {
    const url = new URL(request.url);
    const match = this.matchRoute(request.method, url.pathname);

    if (!match) {
      return new Response("Not Found", { status: 404 });
    }

    const context = new RouterContext(request, match.params);
    const response = await match.route.handler(context);
    return response instanceof Response
      ? response
      : new Response(String(response));
  }

  request(path: string, init: RequestInit = {}) {
    const url = new URL(path, "http://localhost");
    const request = new Request(url, {
      method: init.method ?? "GET",
      ...init,
    });

    return this.fetch(request);
  }

  private matchRoute(method: string, pathname: string) {
    const requestSegments = normalizePath(pathname);

    for (const route of this.routes) {
      if (route.method !== method.toUpperCase()) {
        continue;
      }

      if (route.segments.length !== requestSegments.length) {
        continue;
      }

      const params: Record<string, string> = {};
      let matched = true;

      for (let index = 0; index < route.segments.length; index += 1) {
        const routeSegment = route.segments[index];
        const requestSegment = requestSegments[index];

        if (routeSegment.type === "literal") {
          if (routeSegment.value !== requestSegment) {
            matched = false;
            break;
          }
        } else {
          params[routeSegment.name] = requestSegment;
        }
      }

      if (matched) {
        return { route, params };
      }
    }

    return null;
  }
}

export type { Context as HonoContext };
