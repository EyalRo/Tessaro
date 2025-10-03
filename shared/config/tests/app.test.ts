import { createBaseApp, resolveCorsOptions, resolveHost, resolvePort } from '../app';

describe('resolveCorsOptions', () => {
  const originalEnv = process.env.CORS_ALLOWED_ORIGINS;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.CORS_ALLOWED_ORIGINS;
    } else {
      process.env.CORS_ALLOWED_ORIGINS = originalEnv;
    }

    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it('allows all origins when the env var is missing', () => {
    delete process.env.CORS_ALLOWED_ORIGINS;

    expect(resolveCorsOptions()).toEqual({ origin: true });
  });

  it('allows all origins when running in development', () => {
    process.env.NODE_ENV = 'development';
    process.env.CORS_ALLOWED_ORIGINS = 'https://example.com';

    expect(resolveCorsOptions()).toEqual({ origin: true });
  });

  it('returns a single origin when only one value is provided', () => {
    process.env.CORS_ALLOWED_ORIGINS = 'https://example.com';

    expect(resolveCorsOptions()).toEqual({ origin: 'https://example.com' });
  });

  it('returns a list of origins when multiple values are provided', () => {
    process.env.CORS_ALLOWED_ORIGINS = 'https://a.com, https://b.com ,  https://c.com ';

    expect(resolveCorsOptions()).toEqual({
      origin: ['https://a.com', 'https://b.com', 'https://c.com']
    });
  });
});

describe('createBaseApp', () => {
  it('registers the health endpoint', () => {
    const app = createBaseApp();
    const router = (app as any)._router;
    const healthLayer = router.stack.find((layer: any) => layer.route?.path === '/health');

    expect(healthLayer).toBeDefined();

    const response = { json: jest.fn() } as any;
    healthLayer.route.stack[0].handle({} as any, response, jest.fn());

    expect(response.json).toHaveBeenCalledWith({ status: 'ok' });
  });
});

describe('resolvePort', () => {
  it('returns provided port when valid', () => {
    expect(resolvePort('3000')).toBe(3000);
  });

  it('falls back to default when invalid', () => {
    expect(resolvePort('invalid')).toBe(8080);
  });
});

describe('resolveHost', () => {
  it('returns provided host when valid', () => {
    expect(resolveHost('127.0.0.1')).toBe('127.0.0.1');
  });

  it('falls back to default when invalid', () => {
    expect(resolveHost('   ')).toBe('0.0.0.0');
  });
});
