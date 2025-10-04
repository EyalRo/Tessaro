import { Request } from 'express';

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

export const logRequest = (
  req: Request<any, any, any, any, any>,
  level: LogLevel = 'info'
): void => {
  const { method, originalUrl, ip, params, query, headers } = req;
  const metadata: Record<string, unknown> = {
    level,
    method,
    path: originalUrl,
    ip,
    params,
    query,
  };

  if (req.body && Object.keys(req.body).length > 0) {
    metadata.body = req.body;
  }

  const consoleMethod = resolveConsoleMethod(level);

  // eslint-disable-next-line no-console
  console[consoleMethod]('[UsersAPI] Incoming request', metadata, {
    headers: {
      'user-agent': headers['user-agent'],
      'content-type': headers['content-type'],
    },
  });
};
