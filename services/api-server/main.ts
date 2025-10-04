import { Hono } from "hono";
import type { Context } from "hono";
import users from "./users.ts";

export function createApp() {
  const app = new Hono();
  app.get("/", (c: Context) => c.text("Hello, World!"));
  app.route("/users", users);

  return app;
}

export const app = createApp();

if (import.meta.main) {
  Deno.serve(app.fetch);
}
