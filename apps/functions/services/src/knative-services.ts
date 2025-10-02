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
  app.listen(port, host, () => {
    // eslint-disable-next-line no-console
    console.log(`Knative services API ready on http://${host}:${port}`);
  });
}

export default app;
