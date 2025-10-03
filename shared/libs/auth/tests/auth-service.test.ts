import { AuthService } from '../src/auth-service';
import { AuthGateway } from '../src/auth-gateway';
import { AuthStorage } from '../src/auth-storage';
import { AuthSession } from '../src/types';

describe('AuthService.restore', () => {
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

  afterEach(() => {
    jest.restoreAllMocks();
  });

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
