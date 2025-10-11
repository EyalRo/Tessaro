import { CSRF, randomUUIDv7, secrets } from "bun";
import {
  createSession as persistSession,
  deleteSession,
  getSession,
  replaceSession,
} from "../database";
import type { SessionRecord } from "../database";

const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const SECRET_SERVICE = "tessaro";
const SECRET_NAME = "session-secret";
const SESSION_COOKIE = "tessaro_session";

let cachedSecret: string | null = null;

async function loadSecret(): Promise<string> {
  if (cachedSecret) {
    return cachedSecret;
  }

  const stored = await secrets.get({ service: SECRET_SERVICE, name: SECRET_NAME });
  if (typeof stored === "string" && stored.length > 0) {
    cachedSecret = stored;
    return stored;
  }

  const envSecret = Bun.env.SESSION_SECRET ?? Bun.env.TESSARO_SESSION_SECRET;
  if (envSecret && envSecret.length >= 32) {
    await secrets.set({ service: SECRET_SERVICE, name: SECRET_NAME, secret: envSecret });
    cachedSecret = envSecret;
    return envSecret;
  }

  const generated = randomUUIDv7();
  await secrets.set({ service: SECRET_SERVICE, name: SECRET_NAME, secret: generated });
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

export async function createAuthSession(userId: string, ttlMs = DEFAULT_TTL_MS) {
  const secret = await loadSecret();
  const { issued_at, expires_at } = computeExpiry(ttlMs);
  const token = CSRF.generate({ secret, encoding: "base64", expiresIn: ttlMs });
  const tokenHash = await hashToken(token);

  const record: SessionRecord = {
    token_hash: tokenHash,
    user_id: userId,
    issued_at,
    expires_at,
  };

  await persistSession(record);

  return {
    token,
    issued_at,
    expires_at,
  };
}

export async function renewAuthSession(token: string, ttlMs = DEFAULT_TTL_MS) {
  const secret = await loadSecret();
  if (!CSRF.verify(token, { secret })) {
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
    issued_at,
    expires_at,
  };

  await replaceSession(updated);

  return {
    token,
    issued_at,
    expires_at,
    user_id: session.user_id,
  };
}

export async function deleteAuthSession(token: string) {
  const tokenHash = await hashToken(token);
  await deleteSession(tokenHash);
}

export async function validateAuthToken(token: string) {
  const secret = await loadSecret();
  if (!CSRF.verify(token, { secret })) {
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

export { DEFAULT_TTL_MS as SESSION_TTL_MS, SESSION_COOKIE };
