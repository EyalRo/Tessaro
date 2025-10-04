import { serve } from '@hono/node-server';
import { createBaseApp, getConfigService, resolveHost, resolvePort } from './shared';
import {
  registerCreateOrganizationRoute,
  registerDeleteOrganizationRoute,
  registerGetOrganizationRoute,
  registerUpdateOrganizationRoute
} from './routes';

const app = createBaseApp();
const configService = getConfigService();

registerCreateOrganizationRoute(app, configService);
registerGetOrganizationRoute(app, configService);
registerUpdateOrganizationRoute(app, configService);
registerDeleteOrganizationRoute(app, configService);

const port = resolvePort(process.env.PORT);
const host = resolveHost(process.env.HOST);

if (require.main === module) {
  serve({ fetch: app.fetch, port, hostname: host });
  // eslint-disable-next-line no-console
  console.log(`Organizations API listening on http://${host}:${port}`);
}

export default app;
