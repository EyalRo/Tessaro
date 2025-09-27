import { AuthSession } from './types';

export interface AuthStorage {
  load(): AuthSession | null;
  save(session: AuthSession): void;
  clear(): void;
}

export class LocalStorageAuthStorage implements AuthStorage {
  private fallback: AuthSession | null = null;

  constructor(private storageKey = 'tessaro.admin.session') {}

  load(): AuthSession | null {
    if (this.hasLocalStorage()) {
      const raw = window.localStorage.getItem(this.storageKey);
      if (!raw) {
        return null;
      }

      try {
        return JSON.parse(raw) as AuthSession;
      } catch (error) {
        window.localStorage.removeItem(this.storageKey);
        return null;
      }
    }

    return this.fallback;
  }

  save(session: AuthSession): void {
    if (this.hasLocalStorage()) {
      window.localStorage.setItem(this.storageKey, JSON.stringify(session));
      return;
    }

    this.fallback = session;
  }

  clear(): void {
    if (this.hasLocalStorage()) {
      window.localStorage.removeItem(this.storageKey);
    }

    this.fallback = null;
  }

  private hasLocalStorage(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }
}
