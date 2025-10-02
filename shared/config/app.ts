import express, { Express } from 'express';
import cors from 'cors';

type CorsOrigin = boolean | string | RegExp | Array<string | RegExp>;

type CorsOptions = {
  origin: CorsOrigin;
};

export const resolveCorsOptions = (): CorsOptions => {
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
