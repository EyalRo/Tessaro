import { serve } from '@hono/node-server';
import { createBaseApp, getUserService, resolveHost, resolvePort } from './shared';
import { registerCreateUserRoute } from './routes';

const app = createBaseApp();
const userService = getUserService();

registerCreateUserRoute(app, userService);

const port = resolvePort(process.env.PORT);
const host = resolveHost(process.env.HOST);

if (require.main === module) {
  serve({ fetch: app.fetch, port, hostname: host });
  // eslint-disable-next-line no-console
  console.log(`Users API (POST) listening on http://${host}:${port}`);
}

export default app;
