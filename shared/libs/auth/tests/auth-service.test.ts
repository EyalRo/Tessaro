import { AuthService } from '../src/auth-service';
import { AuthGateway } from '../src/auth-gateway';
import { AuthStorage } from '../src/auth-storage';
import { AuthSession } from '../src/types';

const buildSession = (overrides: Partial<AuthSession> = {}): AuthSession => ({
  token: 'session-token',
  issuedAt: '2024-01-01T00:00:00.000Z',
  user: {
    id: 'admin-1',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'administrator'
  },
  ...overrides
});

const createService = (
  gatewayOverrides: Partial<jest.Mocked<AuthGateway>> = {},
  storageOverrides: Partial<jest.Mocked<AuthStorage>> = {}
) => {
  const gateway: jest.Mocked<AuthGateway> = {
    login: jest.fn(),
    logout: jest.fn(),
    verifySession: jest.fn(),
    ...gatewayOverrides
  };

  const storage: jest.Mocked<AuthStorage> = {
    load: jest.fn(),
    save: jest.fn(),
    clear: jest.fn(),
    ...storageOverrides
  };

  return { service: new AuthService(gateway, storage), gateway, storage };
};

describe('AuthService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('core behaviors', () => {
    it('initializes from storage and notifies subscribers', async () => {
      const storedSession = buildSession();
      const { service, storage, gateway } = createService({
        logout: jest.fn().mockResolvedValue(undefined)
      }, {
        load: jest.fn().mockReturnValue(storedSession)
      });

      const listener = jest.fn();
      const unsubscribe = service.subscribe(listener);

      expect(storage.load).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(storedSession);
      expect(service.getSession()).toEqual(storedSession);
      expect(service.isAuthenticated()).toBe(true);

      unsubscribe();
      listener.mockClear();

      await service.logout();

      expect(gateway.logout).toHaveBeenCalledWith(storedSession.token);
      expect(listener).not.toHaveBeenCalled();
    });

    it('logs in via the gateway and persists the new session', async () => {
      const newSession = buildSession({ token: 'fresh-token' });
      const credentials = { email: 'admin@example.com', password: 'secret' };
      const { service, gateway, storage } = createService({
        login: jest.fn().mockResolvedValue(newSession)
      }, {
        load: jest.fn().mockReturnValue(null)
      });

      const listener = jest.fn();
      service.subscribe(listener);
      listener.mockClear();

      await service.login(credentials);

      expect(gateway.login).toHaveBeenCalledWith(credentials);
      expect(storage.save).toHaveBeenCalledWith(newSession);
      expect(listener).toHaveBeenLastCalledWith(newSession);
      expect(service.getSession()).toEqual(newSession);
      expect(service.isAuthenticated()).toBe(true);
    });

    it('logs out, clears storage, and notifies subscribers', async () => {
      const storedSession = buildSession({ token: 'persisted-token' });
      const { service, gateway, storage } = createService({}, {
        load: jest.fn().mockReturnValue(storedSession)
      });

      const listener = jest.fn();
      service.subscribe(listener);
      listener.mockClear();

      await service.logout();

      expect(gateway.logout).toHaveBeenCalledWith('persisted-token');
      expect(storage.clear).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenLastCalledWith(null);
      expect(service.getSession()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
    });

    it('passes a null token to gateway logout when no session exists', async () => {
      const { service, gateway } = createService();

      await service.logout();

      expect(gateway.logout).toHaveBeenCalledWith(null);
    });
  });

  describe('restore', () => {
    it('clears the stored session when verification returns null', async () => {
      const storedSession = buildSession();
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const { service, gateway, storage } = createService({
        verifySession: jest.fn().mockResolvedValue(null)
      }, {
        load: jest.fn().mockReturnValue(storedSession)
      });

      const listener = jest.fn();
      service.subscribe(listener);

      expect(service.getSession()).toEqual(storedSession);

      const restored = await service.restore();

      expect(restored).toBeNull();
      expect(gateway.verifySession).toHaveBeenCalledWith(storedSession.token);
      expect(storage.clear).toHaveBeenCalledTimes(1);
      expect(service.getSession()).toBeNull();
      expect(listener).toHaveBeenLastCalledWith(null);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('clears the stored session when verification throws', async () => {
      const storedSession = buildSession({ token: 'stale-token' });
      const error = new Error('network-failure');
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const { service, gateway, storage } = createService({
        verifySession: jest.fn().mockRejectedValue(error)
      }, {
        load: jest.fn().mockReturnValue(storedSession)
      });

      const listener = jest.fn();
      service.subscribe(listener);

      expect(service.getSession()).toEqual(storedSession);

      const restored = await service.restore();

      expect(restored).toBeNull();
      expect(gateway.verifySession).toHaveBeenCalledWith(storedSession.token);
      expect(storage.clear).toHaveBeenCalledTimes(1);
      expect(service.getSession()).toBeNull();
      expect(listener).toHaveBeenLastCalledWith(null);
      expect(warnSpy).toHaveBeenCalledWith('Failed to verify stored session', error);
    });
  });
});
