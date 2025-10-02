import express, { Express } from 'express';
import cors from 'cors';

type CorsOrigin = boolean | string | RegExp | Array<string | RegExp>;

type CorsOptions = {
  origin: CorsOrigin;
};

export const resolveCorsOptions = (): CorsOptions => {
  return { origin: true };
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
