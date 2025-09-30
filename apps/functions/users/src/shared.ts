import express, { Express } from 'express';
import cors, { CorsOptions } from 'cors';
import ScyllaClient from '../../../../libs/database/src/scylla-client';
import UserService from '../../../../libs/database/src/user-service';

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

let cachedUserService: UserService | null = null;

const createUserService = (): UserService => {
  const client = new ScyllaClient({
    contactPoints: resolveContactPoints(),
    localDataCenter: resolveLocalDataCenter(),
    keyspace: resolveKeyspace(),
    authProvider: resolveAuthProvider()
  });

  return new UserService(client);
};

export const getUserService = (): UserService => {
  if (!cachedUserService) {
    cachedUserService = createUserService();
  }

  return cachedUserService;
};

export const createBaseApp = (): Express => {
  const app = express();
  app.use(cors(resolveCorsOptions()));
  app.use(express.json());
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
};

export const resolvePort = (value: string | undefined): number => {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return 8080;
};

export const resolveHost = (value: string | undefined): string => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }
  return '0.0.0.0';
};
