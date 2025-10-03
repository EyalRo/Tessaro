import express, { Express } from 'express';
import cors, { CorsOptions } from 'cors';

export const resolveCorsOptions = (): CorsOptions => {
  const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS;
  const nodeEnv = process.env.NODE_ENV;

  if (nodeEnv === 'development') {
    return { origin: true };
  }

  if (allowedOrigins === undefined) {
    return { origin: true };
  }

  const parsedOrigins = allowedOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  if (parsedOrigins.length === 0) {
    return { origin: true };
  }

  if (parsedOrigins.length === 1) {
    return { origin: parsedOrigins[0] };
  }

  return { origin: parsedOrigins };
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
