import { AuthSession, LoginCredentials } from './types';

export interface AuthGateway {
  login(credentials: LoginCredentials): Promise<AuthSession>;
  logout(token: string | null): Promise<void>;
  verifySession(token: string): Promise<AuthSession | null>;
}
