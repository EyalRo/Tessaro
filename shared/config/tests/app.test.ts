import { createBaseApp, resolveCorsOptions, resolveHost, resolvePort } from '../app';

const resolveRequestCtor = (): typeof Request => {
  const { ReadableStream } = require('stream/web') as typeof import('stream/web');
  if (typeof (globalThis as any).ReadableStream === 'undefined') {
    (globalThis as any).ReadableStream = ReadableStream;
  }

  const { Request, Response, Headers } = require('undici') as typeof import('undici');
  if (typeof (globalThis as any).Response === 'undefined') {
    (globalThis as any).Response = Response;
  }
  if (typeof (globalThis as any).Headers === 'undefined') {
    (globalThis as any).Headers = Headers;
  }

  return Request as unknown as typeof Request;
};

describe('resolveCorsOptions', () => {
  it('always allows all origins', () => {
    expect(resolveCorsOptions()).toEqual({ origin: '*' });
  });
});

describe('createBaseApp', () => {
  it('registers the health endpoint', async () => {
    const app = createBaseApp();
    const RequestCtor = resolveRequestCtor();
    const response = await app.fetch(
      new RequestCtor('http://localhost/health') as unknown as Request
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'ok' });
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
