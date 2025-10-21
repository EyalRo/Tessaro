import { CSRF, randomUUIDv7, secrets } from "bun";
import {
  createSession as persistSession,
  deleteSession,
  getSession,
  replaceSession,
} from "../database/sessions";
import type { SessionRecord } from "../database/sessions";

const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const SECRET_SERVICE = "tessaro";
const SECRET_NAME = "session-secret";
const SESSION_COOKIE = "tessaro_session";

type ParsedCookies = Record<string, string>;

export type AuthenticatedSession = SessionRecord & {
  token: string;
};

let cachedSecret: string | null = null;
let secretStoreAvailable = true;
let secretStoreErrorLogged = false;
const secretDecoder = new TextDecoder();

function logSecretStoreError(error: unknown) {
  if (secretStoreErrorLogged) {
    return;
  }

  secretStoreErrorLogged = true;
  console.warn("Falling back to in-memory auth secret; Bun.secrets unavailable.", error);
}

function decodeSecretValue(value: unknown): string | null {
  if (typeof value === "string") {
    return value.length > 0 ? value : null;
  }

  if (value instanceof Uint8Array) {
    const decoded = secretDecoder.decode(value);
    return decoded.length > 0 ? decoded : null;
  }

  if (value instanceof ArrayBuffer) {
    const decoded = secretDecoder.decode(new Uint8Array(value));
    return decoded.length > 0 ? decoded : null;
  }

  return null;
}

async function loadSecret(): Promise<string> {
  if (cachedSecret) {
    return cachedSecret;
  }

  if (secretStoreAvailable) {
    try {
      const stored = await secrets.get({ service: SECRET_SERVICE, name: SECRET_NAME });
      const decoded = decodeSecretValue(stored);
      if (decoded) {
        cachedSecret = decoded;
        return decoded;
      }
    } catch (error) {
      secretStoreAvailable = false;
      logSecretStoreError(error);
    }
  }

  const envSecret = Bun.env.SESSION_SECRET ?? Bun.env.TESSARO_SESSION_SECRET;
  if (envSecret && envSecret.length >= 32) {
    if (secretStoreAvailable) {
      try {
        await secrets.set({ service: SECRET_SERVICE, name: SECRET_NAME, value: envSecret });
      } catch (error) {
        secretStoreAvailable = false;
        logSecretStoreError(error);
      }
    }
    cachedSecret = envSecret;
    return envSecret;
  }

  const generated = randomUUIDv7();
  if (secretStoreAvailable) {
    try {
      await secrets.set({ service: SECRET_SERVICE, name: SECRET_NAME, value: generated });
    } catch (error) {
      secretStoreAvailable = false;
      logSecretStoreError(error);
    }
  }
  cachedSecret = generated;
  return generated;
}

async function hashToken(raw: string): Promise<string> {
  const encoded = new TextEncoder().encode(raw);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function computeExpiry(ttlMs = DEFAULT_TTL_MS) {
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + ttlMs);
  return {
    issued_at: issuedAt.toISOString(),
    expires_at: expiresAt.toISOString(),
  };
}

export type CreateAuthSessionOptions = {
  organizationId?: string | null;
  ttlMs?: number;
};

export async function createAuthSession(userId: string, options?: CreateAuthSessionOptions) {
  const secret = await loadSecret();
  const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;
  const { issued_at, expires_at } = computeExpiry(ttlMs);
  const token = CSRF.generate(secret, { encoding: "base64", expiresIn: ttlMs });
  const tokenHash = await hashToken(token);

  const record: SessionRecord = {
    token_hash: tokenHash,
    user_id: userId,
    organization_id: options?.organizationId ?? null,
    issued_at,
    expires_at,
  };

  await persistSession(record);

  return {
    token,
    issued_at,
    expires_at,
    organization_id: record.organization_id,
  };
}

export async function renewAuthSession(token: string, ttlMs = DEFAULT_TTL_MS) {
  const secret = await loadSecret();
  if (!CSRF.verify(token, { secret, encoding: "base64" })) {
    return null;
  }

  const tokenHash = await hashToken(token);
  const session = await getSession(tokenHash);

  if (!session) {
    return null;
  }

  const now = new Date();
  const currentExpiry = new Date(session.expires_at);
  if (currentExpiry.getTime() < now.getTime()) {
    await deleteSession(tokenHash);
    return null;
  }

  const { issued_at, expires_at } = computeExpiry(ttlMs);
  const updated: SessionRecord = {
    token_hash: tokenHash,
    user_id: session.user_id,
    organization_id: session.organization_id ?? null,
    issued_at,
    expires_at,
  };

  await replaceSession(updated);

  return {
    token,
    issued_at,
    expires_at,
    user_id: session.user_id,
    organization_id: session.organization_id ?? null,
  };
}

export async function deleteAuthSession(token: string) {
  const tokenHash = await hashToken(token);
  await deleteSession(tokenHash);
}

export async function validateAuthToken(token: string) {
  const secret = await loadSecret();
  if (!CSRF.verify(token, { secret, encoding: "base64" })) {
    return null;
  }

  const tokenHash = await hashToken(token);
  const session = await getSession(tokenHash);
  if (!session) {
    return null;
  }

  const now = Date.now();
  if (new Date(session.expires_at).getTime() < now) {
    await deleteSession(tokenHash);
    return null;
  }

  return session;
}

function parseCookies(header: string | null): ParsedCookies {
  if (!header) {
    return {};
  }

  const pairs = header.split(";");
  const cookies: ParsedCookies = {};

  for (const pair of pairs) {
    const [rawName, ...rest] = pair.trim().split("=");
    if (!rawName) {
      continue;
    }

    const value = rest.join("=").trim();
    try {
      cookies[rawName] = decodeURIComponent(value);
    } catch {
      cookies[rawName] = value;
    }
  }

  return cookies;
}

export function readSessionToken(cookieHeader: string | null) {
  const cookies = parseCookies(cookieHeader);
  return cookies[SESSION_COOKIE] ?? null;
}

function cookieAttributes(expiresAt: string | Date, options?: { clear?: boolean }) {
  const expiresDate = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  const attributes = [
    `Path=/`,
    `Expires=${expiresDate.toUTCString()}`,
    `HttpOnly`,
    `SameSite=Lax`,
  ];

  const secure = Bun.env.NODE_ENV === "production" || Bun.env.COOKIE_SECURE === "true";
  if (secure) {
    attributes.push("Secure");
  }

  if (options?.clear) {
    attributes.push("Max-Age=0");
  }

  return attributes.join("; ");
}

export function createSessionCookie(token: string, expiresAt: string) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; ${cookieAttributes(expiresAt)}`;
}

export function expireSessionCookie() {
  const expiredDate = new Date(0);
  return `${SESSION_COOKIE}=; ${cookieAttributes(expiredDate, { clear: true })}`;
}

export async function getAuthenticatedSession(request: Request): Promise<AuthenticatedSession | null> {
  const token = readSessionToken(request.headers.get("cookie"));
  if (!token) {
    return null;
  }

  const session = await validateAuthToken(token);
  if (!session) {
    return null;
  }

  return {
    ...session,
    token,
  } satisfies AuthenticatedSession;
}

export { DEFAULT_TTL_MS as SESSION_TTL_MS, SESSION_COOKIE };
