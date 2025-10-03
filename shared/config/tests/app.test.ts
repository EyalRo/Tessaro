import { createBaseApp, resolveCorsOptions, resolveHost, resolvePort } from '../app';

describe('resolveCorsOptions', () => {
  it('always allows all origins', () => {
    expect(resolveCorsOptions()).toEqual({ origin: '*' });
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
