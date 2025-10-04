import { Hono } from 'hono';
import { cors } from 'hono/cors';

export type CorsOptions = Parameters<typeof cors>[0];

export const resolveCorsOptions = (): CorsOptions => ({ origin: '*' });

export const createBaseApp = (): Hono => {
  const app = new Hono();
  app.use('*', cors(resolveCorsOptions()));
  app.get('/health', (c) => c.json({ status: 'ok' }));

  return app;
};

export type BaseApp = ReturnType<typeof createBaseApp>;

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
