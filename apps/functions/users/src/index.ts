import { Request, Response } from 'express';
import { UserProfile } from '../../../../libs/database/src/types';
import { createBaseApp, getUserService, resolveHost, resolvePort } from './shared';
import { registerCreateUserRoute, registerListUsersRoute } from './routes';

const app = createBaseApp();
const userService = getUserService();

registerListUsersRoute(app, userService);
registerCreateUserRoute(app, userService);

type UpdateUserPayload = Partial<Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>>;
type UserRouteParams = {
  id: string;
};

app.get('/users/:id', async (req: Request<UserRouteParams>, res: Response) => {
  try {
    const user = await userService.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (_error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

app.put(
  '/users/:id',
  async (
    req: Request<UserRouteParams, unknown, UpdateUserPayload>,
    res: Response
  ) => {
    try {
      const user = await userService.updateUser(req.params.id, req.body);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(user);
    } catch (_error) {
      res.status(500).json({ error: 'Failed to update user' });
    }
  }
);

app.delete('/users/:id', async (req: Request<UserRouteParams>, res: Response) => {
  try {
    await userService.deleteUser(req.params.id);
    res.status(204).send();
  } catch (_error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

const port = resolvePort(process.env.PORT);
const host = resolveHost(process.env.HOST);

if (require.main === module) {
  app.listen(port, host, () => {
    // eslint-disable-next-line no-console
    console.log(`Users service listening on http://${host}:${port}`);
  });
}

export default app;
