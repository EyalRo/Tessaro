import express, { Request, Response } from 'express';
import cors, { CorsOptions } from 'cors';
import ScyllaClient from '../../../../libs/database/src/scylla-client';
import UserService from '../../../../libs/database/src/user-service';
import { UserProfile } from '../../../../libs/database/src/types';

const app = express();

const resolveCorsOptions = (): CorsOptions => {
  const rawOrigins = process.env.CORS_ALLOWED_ORIGINS;
  if (!rawOrigins) {
    return { origin: true };
  }

  const origins = rawOrigins
    .split(',')
    .map(origin => origin.trim())
    .filter(origin => origin.length > 0);

  if (origins.length === 0) {
    return { origin: true };
  }

  if (origins.length === 1) {
    return { origin: origins[0] };
  }

  return { origin: origins };
};

app.use(cors(resolveCorsOptions()));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const resolveContactPoints = (): string[] => {
  const raw = process.env.SCYLLA_CONTACT_POINTS;
  if (raw) {
    return raw
      .split(',')
      .map(point => point.trim())
      .filter(point => point.length > 0);
  }
  return ['scylla-client.databases.svc.cluster.local'];
};

const resolveLocalDataCenter = (): string => {
  return process.env.SCYLLA_LOCAL_DC?.trim() || 'datacenter1';
};

const resolveKeyspace = (): string => {
  return process.env.SCYLLA_KEYSPACE?.trim() || 'tessaro_admin';
};

const resolveAuthProvider = () => {
  const username = process.env.SCYLLA_USERNAME;
  const password = process.env.SCYLLA_PASSWORD;
  if (username && password) {
    return { username, password };
  }
  return undefined;
};

// Initialize database client
const dbClient = new ScyllaClient({
  contactPoints: resolveContactPoints(),
  localDataCenter: resolveLocalDataCenter(),
  keyspace: resolveKeyspace(),
  authProvider: resolveAuthProvider()
});

const userService = new UserService(dbClient);

type CreateUserPayload = Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>;
type UpdateUserPayload = Partial<CreateUserPayload>;

type UserRouteParams = {
  id: string;
};

// List users endpoint
app.get('/users', async (_req: Request, res: Response) => {
  try {
    const users = await userService.listUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create user endpoint
app.post(
  '/users',
  async (
    req: Request<unknown, unknown, CreateUserPayload>,
    res: Response
  ) => {
    try {
      const user = await userService.createUser(req.body);
      res.status(201).json(user);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create user' });
    }
  }
);

// Get user by ID endpoint
app.get('/users/:id', async (req: Request<UserRouteParams>, res: Response) => {
  try {
    const user = await userService.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user endpoint
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
    } catch (error) {
      res.status(500).json({ error: 'Failed to update user' });
    }
  }
);

// Delete user endpoint
app.delete('/users/:id', async (req: Request<UserRouteParams>, res: Response) => {
  try {
    await userService.deleteUser(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

const resolvePort = (value: string | undefined): number => {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return 4000;
};

const resolveHost = (value: string | undefined): string => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }
  return '0.0.0.0';
};

const port = resolvePort(process.env.PORT);
const host = resolveHost(process.env.HOST);

if (require.main === module) {
  app.listen(port, host, () => {
    // eslint-disable-next-line no-console
    console.log(`Users service listening on http://${host}:${port}`);
  });
}

export default app;
