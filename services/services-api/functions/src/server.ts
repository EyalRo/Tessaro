import { serve } from '@hono/node-server';
import { createBaseApp, getConfigService, resolveHost, resolvePort } from './shared';
import {
  registerCreateServiceRoute,
  registerDeleteServiceRoute,
  registerGetServiceRoute,
  registerUpdateServiceRoute
} from './routes';

const app = createBaseApp();
const configService = getConfigService();

registerCreateServiceRoute(app, configService);
registerGetServiceRoute(app, configService);
registerUpdateServiceRoute(app, configService);
registerDeleteServiceRoute(app, configService);

const port = resolvePort(process.env.PORT);
const host = resolveHost(process.env.HOST);

if (require.main === module) {
  serve({ fetch: app.fetch, port, hostname: host });
  // eslint-disable-next-line no-console
  console.log(`Services API listening on http://${host}:${port}`);
}

export default app;
