export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

export type AuthSession = {
  token: string;
  issuedAt: string;
  user: AuthUser;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export class AuthError extends Error {
  readonly code: string;

  constructor(message: string, code = 'auth_error') {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}

export interface AuthGateway {
  login(payload: LoginPayload): Promise<AuthSession>;
  restore(token: string): Promise<AuthSession | null>;
  logout(token: string | null): Promise<void>;
}

export interface AuthStorage {
  load(): AuthSession | null;
  save(session: AuthSession): void;
  clear(): void;
}

type SessionListener = (session: AuthSession | null) => void;

export class AuthService {
  private session: AuthSession | null;
  private readonly listeners = new Set<SessionListener>();

  constructor(
    private readonly gateway: AuthGateway,
    private readonly storage: AuthStorage
  ) {
    this.session = this.storage.load();
  }

  getSession(): AuthSession | null {
    return this.session;
  }

  subscribe(listener: SessionListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setSession(session: AuthSession | null): void {
    this.session = session;

    if (session) {
      this.storage.save(session);
    } else {
      this.storage.clear();
    }

    for (const listener of this.listeners) {
      listener(session);
    }
  }

  async restore(): Promise<AuthSession | null> {
    const cached = this.storage.load();

    if (!cached) {
      this.setSession(null);
      return null;
    }

    try {
      const restored = await this.gateway.restore(cached.token);

      if (restored) {
        this.setSession(restored);
        return restored;
      }
    } catch (error) {
      console.warn('Failed to restore session', error);
    }

    this.setSession(null);
    return null;
  }

  async login(payload: LoginPayload): Promise<AuthSession> {
    const session = await this.gateway.login(payload);
    this.setSession(session);
    return session;
  }

  async logout(): Promise<void> {
    const token = this.session?.token ?? null;
    await this.gateway.logout(token);
    this.setSession(null);
  }
}

type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

const memoryStorageData = new Map<string, string>();
const memoryStorage: StorageLike = {
  getItem: (key: string) => memoryStorageData.get(key) ?? null,
  setItem: (key: string, value: string) => {
    memoryStorageData.set(key, value);
  },
  removeItem: (key: string) => {
    memoryStorageData.delete(key);
  }
};

function resolveBrowserStorage(): StorageLike | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    if (window.localStorage) {
      return window.localStorage;
    }
  } catch (error) {
    console.warn('Unable to access localStorage', error);
  }

  return null;
}

export class LocalStorageAuthStorage implements AuthStorage {
  private readonly storage: StorageLike | null;

  constructor(private readonly key: string, storage?: StorageLike | null) {
    this.storage = typeof storage === 'undefined' ? resolveBrowserStorage() : storage;
  }

  private get store(): StorageLike {
    return this.storage ?? memoryStorage;
  }

  load(): AuthSession | null {
    const raw = this.store.getItem(this.key);

    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as AuthSession;
      if (parsed && typeof parsed.token === 'string' && parsed.user) {
        return parsed;
      }
    } catch (error) {
      console.warn('Failed to parse stored auth session', error);
    }

    this.store.removeItem(this.key);
    return null;
  }

  save(session: AuthSession): void {
    this.store.setItem(this.key, JSON.stringify(session));
  }

  clear(): void {
    this.store.removeItem(this.key);
  }
}

type MockGatewayUser = AuthUser & { password: string };

type MockAuthGatewayOptions = {
  users?: MockGatewayUser[];
};

function createDefaultUsers(): MockGatewayUser[] {
  return [
    {
      id: 'admin-1',
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'administrator',
      password: 'password'
    },
    {
      id: 'auditor-1',
      email: 'auditor@example.com',
      name: 'Auditor',
      role: 'auditor',
      password: 'password'
    }
  ];
}

function createSession(user: AuthUser): AuthSession {
  const randomPart = Math.random().toString(36).slice(2);
  return {
    token: `mock-${user.id}-${randomPart}`,
    issuedAt: new Date().toISOString(),
    user
  };
}

export class MockAuthGateway implements AuthGateway {
  private readonly users: MockGatewayUser[];
  private readonly sessions = new Map<string, AuthSession>();

  constructor(options: MockAuthGatewayOptions = {}) {
    this.users = (options.users ?? createDefaultUsers()).map((user) => ({
      ...user,
      email: user.email.toLowerCase()
    }));
  }

  async login(payload: LoginPayload): Promise<AuthSession> {
    const email = payload.email.trim().toLowerCase();
    const password = payload.password;

    const user = this.users.find((candidate) => candidate.email === email);

    if (!user || user.password !== password) {
      throw new AuthError('Invalid email or password', 'invalid_credentials');
    }

    const session = createSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    });

    this.sessions.set(session.token, session);
    return session;
  }

  async restore(token: string): Promise<AuthSession | null> {
    const existing = this.sessions.get(token);
    if (existing) {
      return existing;
    }

    const match = /^mock-([^\s-]+)-/.exec(token);
    if (!match) {
      return null;
    }

    const userId = match[1];
    const user = this.users.find((candidate) => candidate.id === userId);

    if (!user) {
      return null;
    }

    const session = {
      token,
      issuedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    } satisfies AuthSession;

    this.sessions.set(token, session);
    return session;
  }

  async logout(token: string | null): Promise<void> {
    if (!token) {
      return;
    }

    this.sessions.delete(token);
  }
}
