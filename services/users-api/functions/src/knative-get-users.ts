import { createBaseApp, getUserService, resolveHost, resolvePort } from './shared';
import { registerListUsersRoute } from './routes';

const app = createBaseApp();
const userService = getUserService();

registerListUsersRoute(app, userService);

const port = resolvePort(process.env.PORT);
const host = resolveHost(process.env.HOST);

if (require.main === module) {
  app.listen(port, host, () => {
    // eslint-disable-next-line no-console
    console.log(`Knative users GET ready on http://${host}:${port}`);
  });
}

export default app;
