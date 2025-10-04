import { Hono } from "hono";
import users from "./users.ts"

const app = new Hono();

app.get("/", (c) => c.text("Hello, World!"));
app.route('/users', users)

Deno.serve(app.fetch);
