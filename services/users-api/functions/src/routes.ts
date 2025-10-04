import { Request, Response } from 'express';
import { Express } from 'express-serve-static-core';
import UserService from 'shared/libs/database/user-service';
import { UserProfile } from 'shared/libs/database/types';
import { logRequest } from './logger';

export type CreateUserPayload = Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>;

export const registerListUsersRoute = (app: Express, userService: UserService): void => {
  app.get('/users', async (req: Request, res: Response) => {
    logRequest(req);
    try {
      const users = await userService.listUsers();
      res.json(users);
    } catch (_error) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });
};

export const registerCreateUserRoute = (app: Express, userService: UserService): void => {
  app.post('/users', async (req: Request<unknown, unknown, CreateUserPayload>, res: Response) => {
    logRequest(req);
    try {
      const user = await userService.createUser(req.body);
      res.status(201).json(user);
    } catch (_error) {
      res.status(500).json({ error: 'Failed to create user' });
    }
  });
};
