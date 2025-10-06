import { Hono } from "./lib/hono.ts";
import type { Context } from "./lib/hono.ts";
import users from "./users.ts";

export function createApp() {
  const app = new Hono();
  app.get("/", (c: Context) => c.text("Hello, World!"));
  app.route("/users", users);

  return app;
}

export const app = createApp();

if (import.meta.main) {
  const configuredPort = Number.parseInt(Deno.env.get("PORT") ?? "", 10);
  const port = Number.isFinite(configuredPort) ? configuredPort : 8000;
  Deno.serve({ port }, app.fetch);
}
