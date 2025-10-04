import { serve } from '@hono/node-server';
import { createBaseApp, getUserService, resolveHost, resolvePort } from './shared';
import { registerCreateUserRoute, registerListUsersRoute } from './routes';

const app = createBaseApp();
const userService = getUserService();

registerListUsersRoute(app, userService);
registerCreateUserRoute(app, userService);

const port = resolvePort(process.env.PORT);
const host = resolveHost(process.env.HOST);

if (require.main === module) {
  const server = serve({ fetch: app.fetch, port, hostname: host });
  // eslint-disable-next-line no-console
  console.log(`Users API listening on http://${host}:${port}`);

  let isShuttingDown = false;
  const gracefulShutdown = (signal: NodeJS.Signals) => {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    // eslint-disable-next-line no-console
    console.log(`Received ${signal}. Users API shutting down gracefully.`);

    server.close((error?: Error) => {
      if (error) {
        // eslint-disable-next-line no-console
        console.error('Error while shutting down Users API server', error);
        process.exit(1);
        return;
      }

      // eslint-disable-next-line no-console
      console.log('Users API shutdown complete.');
      process.exit(0);
    });
  };

  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);
}

export default app;
