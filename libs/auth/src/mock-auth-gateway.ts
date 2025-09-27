import { AuthGateway } from './auth-gateway';
import { AuthError } from './errors';
import { AuthSession, AuthUser, LoginCredentials } from './types';

const ADMIN_USER: AuthUser = {
  id: 'admin-1',
  email: 'admin@example.com',
  name: 'Admin User',
  role: 'Administrator'
};

const ADMIN_PASSWORD = 'password';

const createToken = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `mock-token-${Math.random().toString(36).slice(2, 12)}`;
};

export class MockAuthGateway implements AuthGateway {
  private sessions = new Map<string, AuthSession>();

  async login({ email, password }: LoginCredentials): Promise<AuthSession> {
    await new Promise((resolve) => setTimeout(resolve, 350));

    if (email !== ADMIN_USER.email || password !== ADMIN_PASSWORD) {
      throw new AuthError('Invalid credentials provided', 'INVALID_CREDENTIALS');
    }

    const session: AuthSession = {
      user: ADMIN_USER,
      token: createToken(),
      issuedAt: new Date().toISOString()
    };

    this.sessions.set(session.token, session);
    return session;
  }

  async logout(token: string | null): Promise<void> {
    if (!token) {
      return;
    }

    this.sessions.delete(token);
  }

  async verifySession(token: string): Promise<AuthSession | null> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return this.sessions.get(token) ?? null;
  }
}
