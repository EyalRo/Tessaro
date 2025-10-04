import type { Context } from 'hono';

type LogLevel = 'info' | 'warn' | 'error';

const resolveConsoleMethod = (level: LogLevel): 'info' | 'warn' | 'error' => {
  switch (level) {
    case 'warn':
      return 'warn';
    case 'error':
      return 'error';
    case 'info':
    default:
      return 'info';
  }
};

export const logRequest = (c: Context, level: LogLevel = 'info', body?: unknown): void => {
  const { req } = c;
  const metadata: Record<string, unknown> = {
    level,
    method: req.method,
    path: req.path,
    params: req.param(),
    query: req.queries(),
  };

  const forwardedIp = req.header('x-forwarded-for') ?? req.header('x-real-ip');
  if (forwardedIp) {
    metadata.ip = forwardedIp;
  }

  if (
    body &&
    (typeof body !== 'object' || Object.keys(body as Record<string, unknown>).length > 0)
  ) {
    metadata.body = body;
  }

  const consoleMethod = resolveConsoleMethod(level);

  const headers: Record<string, string> = {};
  const userAgent = req.header('user-agent');
  if (userAgent) {
    headers['user-agent'] = userAgent;
  }
  const contentType = req.header('content-type');
  if (contentType) {
    headers['content-type'] = contentType;
  }

  // eslint-disable-next-line no-console
  console[consoleMethod]('[UsersAPI] Incoming request', metadata, { headers });
};
