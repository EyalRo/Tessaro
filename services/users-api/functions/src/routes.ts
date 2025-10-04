import type { Context } from 'hono';
import UserService from 'shared/libs/database/user-service';
import { UserProfile } from 'shared/libs/database/types';
import type { BaseApp } from 'shared/config/app';
import { logRequest } from './logger';

export type CreateUserPayload = Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>;

export const registerListUsersRoute = (app: BaseApp, userService: UserService): void => {
  const handler = async (c: Context) => {
    logRequest(c);
    try {
      const users = await userService.listUsers();
      return c.json(users);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logRequest(c, 'error', { message });
      c.header('x-data-source', 'fallback');
      return c.json([]);
    }
  };

  app.get('/users', handler);
};

export const registerCreateUserRoute = (app: BaseApp, userService: UserService): void => {
  app.post('/users', async (c: Context) => {
    let payload: CreateUserPayload;
    try {
      payload = await c.req.json<CreateUserPayload>();
    } catch (_error) {
      logRequest(c, 'warn');
      return c.json({ error: 'Failed to create user' }, 400);
    }

    logRequest(c, 'info', payload);

    try {
      const user = await userService.createUser(payload);
      return c.json(user, 201);
    } catch (_error) {
      return c.json({ error: 'Failed to create user' }, 500);
    }
  });
};
