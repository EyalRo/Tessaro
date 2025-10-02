import type { RequestHandler } from 'express';

declare module 'cors' {
  export type StaticOrigin = boolean | string | RegExp | Array<string | RegExp>;
  export type DynamicOrigin = (
    origin: string | undefined,
    callback: (err: Error | null, allow?: StaticOrigin) => void
  ) => void;

  export interface CorsOptions {
    origin?: StaticOrigin | DynamicOrigin;
    methods?: string | string[];
    allowedHeaders?: string | string[];
    exposedHeaders?: string | string[];
    credentials?: boolean;
    maxAge?: number;
    preflightContinue?: boolean;
    optionsSuccessStatus?: number;
  }

  export type CorsRequestHandler = (options?: CorsOptions) => RequestHandler;

  const cors: CorsRequestHandler;
  export default cors;
}
