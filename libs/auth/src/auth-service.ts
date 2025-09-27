import { AuthGateway } from './auth-gateway';
import { AuthStorage } from './auth-storage';
import { AuthSession, LoginCredentials } from './types';

type SessionListener = (session: AuthSession | null) => void;

export class AuthService {
  private session: AuthSession | null;
  private listeners = new Set<SessionListener>();

  constructor(
    private readonly gateway: AuthGateway,
    private readonly storage: AuthStorage
  ) {
    this.session = this.storage.load();
  }

  getSession(): AuthSession | null {
    return this.session;
  }

  isAuthenticated(): boolean {
    return Boolean(this.session);
  }

  subscribe(listener: SessionListener): () => void {
    this.listeners.add(listener);
    listener(this.session);

    return () => {
      this.listeners.delete(listener);
    };
  }

  async login(credentials: LoginCredentials): Promise<AuthSession> {
    const nextSession = await this.gateway.login(credentials);
    this.setSession(nextSession);
    return nextSession;
  }

  async logout(): Promise<void> {
    const token = this.session?.token ?? null;
    await this.gateway.logout(token);
    this.clearSession();
  }

  async restore(): Promise<AuthSession | null> {
    const stored = this.storage.load();
    if (!stored) {
      this.clearSession();
      return null;
    }

    try {
      const verified = await this.gateway.verifySession(stored.token);
      if (verified) {
        this.setSession(verified);
        return verified;
      }
    } catch (error) {
      console.warn('Failed to verify stored session', error);
    }

    this.setSession(stored);
    return stored;
  }

  private setSession(next: AuthSession): void {
    this.session = next;
    this.storage.save(next);
    this.publish();
  }

  private clearSession(): void {
    this.session = null;
    this.storage.clear();
    this.publish();
  }

  private publish(): void {
    this.listeners.forEach((listener) => listener(this.session));
  }
}

export type { SessionListener };
