import type UserService from 'shared/libs/database/user-service';
import { registerListUsersRoute } from '../src/routes';

jest.mock('../src/logger', () => ({
  logRequest: jest.fn(),
}));

type RouteHandler = (context: any) => Promise<any> | any;

const createRouteHandler = (userService: Partial<UserService>): RouteHandler => {
  let handler: RouteHandler | null = null;
  const app = {
    get: (_path: string, fn: RouteHandler) => {
      handler = fn;
    },
  };

  registerListUsersRoute(app as any, userService as UserService);

  if (!handler) {
    throw new Error('Route handler was not registered');
  }

  return handler;
};

const createContext = () => {
  const headers: Record<string, string> = {};
  const json = jest.fn((body: unknown, status = 200) => ({
    body,
    status,
    headers: { ...headers },
  }));

  return {
    req: {
      method: 'GET',
      path: '/users',
      param: () => ({}),
      queries: () => ({}),
      header: jest.fn(() => undefined),
    },
    header: (name: string, value: string) => {
      headers[name.toLowerCase()] = value;
    },
    json,
  };
};

describe('registerListUsersRoute', () => {
  it('returns users when the user service resolves successfully', async () => {
    const users = [
      {
        id: '1',
        email: 'one@example.com',
        name: 'User One',
        role: 'user',
        avatar_url: null,
        created_at: new Date('2023-01-01T00:00:00Z'),
        updated_at: new Date('2023-01-02T00:00:00Z'),
      },
    ];

    const handler = createRouteHandler({
      listUsers: jest.fn().mockResolvedValue(users),
    });
    const context = createContext();

    const response = await handler(context as any);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(users);
    expect(response.headers['x-data-source']).toBeUndefined();
    expect(context.json).toHaveBeenCalledWith(users);
  });

  it('returns a fallback payload when the user service throws', async () => {
    const handler = createRouteHandler({
      listUsers: jest.fn().mockRejectedValue(new Error('Database unavailable')),
    });
    const context = createContext();

    const response = await handler(context as any);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
    expect(response.headers['x-data-source']).toBe('fallback');
    expect(context.json).toHaveBeenCalledWith([]);
  });
});
