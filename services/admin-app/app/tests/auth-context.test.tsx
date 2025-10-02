import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuthContext } from '../src/contexts/AuthContext';
import authService from '../src/services/authService';
import { AuthError, type AuthSession, type AuthUser } from 'shared/libs/auth';

type MockAuthService = {
  getSession: jest.Mock<AuthSession | null, []>;
  subscribe: jest.Mock<() => void, [(session: AuthSession | null) => void]>;
  restore: jest.Mock<Promise<AuthSession | null>, []>;
  login: jest.Mock<Promise<AuthSession>, [unknown]>;
  logout: jest.Mock<Promise<void>, []>;
  __setSession: (session: AuthSession | null) => void;
  __reset: () => void;
};

const authServiceMock = authService as unknown as MockAuthService;

jest.mock('../src/services/authService', () => {
  const listeners = new Set<(session: any) => void>();
  let currentSession: any = null;

  const mock: any = {
    getSession: jest.fn(() => currentSession),
    subscribe: jest.fn((listener: (session: any) => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }),
    restore: jest.fn(async () => currentSession),
    login: jest.fn(),
    logout: jest.fn(),
    __setSession: (session: any) => {
      currentSession = session;
      listeners.forEach((listener) => listener(currentSession));
    },
    __reset: () => {
      currentSession = null;
      listeners.clear();
      mock.getSession.mockReset();
      mock.getSession.mockImplementation(() => currentSession);
      mock.subscribe.mockReset();
      mock.subscribe.mockImplementation((listener: (session: any) => void) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      });
      mock.restore.mockReset();
      mock.restore.mockImplementation(async () => currentSession);
      mock.login.mockReset();
      mock.logout.mockReset();
    }
  };

  return {
    __esModule: true,
    default: mock
  };
});

describe('AuthContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => <AuthProvider>{children}</AuthProvider>;

  const buildSession = (overrides: Partial<AuthSession> = {}): AuthSession => ({
    token: 'session-token',
    issuedAt: '2024-05-01T00:00:00.000Z',
    user: {
      id: 'admin-1',
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'administrator'
    },
    ...overrides
  });

  beforeEach(() => {
    jest.clearAllMocks();
    authServiceMock.__reset();
    authServiceMock.getSession.mockReturnValue(null);
    authServiceMock.restore.mockResolvedValue(null);
  });

  it('hydrates a restored session on mount', async () => {
    const restoredSession = buildSession();
    authServiceMock.restore.mockResolvedValue(restoredSession);

    const { result } = renderHook(() => useAuthContext(), { wrapper });

    expect(result.current.initializing).toBe(true);

    await waitFor(() => {
      expect(result.current.initializing).toBe(false);
    });

    expect(result.current.session).toEqual(restoredSession);
    expect(result.current.user).toEqual(restoredSession.user);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('logs in and stores the resulting session', async () => {
    const loginSession = buildSession({
      token: 'next-token',
      user: {
        id: 'admin-2',
        email: 'jane@example.com',
        name: 'Jane Doe',
        role: 'administrator'
      }
    });
    authServiceMock.login.mockResolvedValue(loginSession);

    const { result } = renderHook(() => useAuthContext(), { wrapper });

    await waitFor(() => expect(result.current.initializing).toBe(false));

    let resolvedUser: AuthUser | null = null;

    await act(async () => {
      resolvedUser = await result.current.login({ email: 'jane@example.com', password: 'password' });
    });

    expect(authServiceMock.login).toHaveBeenCalledWith({
      email: 'jane@example.com',
      password: 'password'
    });
    expect(resolvedUser).toEqual(loginSession.user);
    expect(result.current.session).toEqual(loginSession);
    expect(result.current.user).toEqual(loginSession.user);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('captures authentication errors and exposes them to consumers', async () => {
    const failure = new AuthError('Unable to authenticate', 'invalid_credentials');
    authServiceMock.login.mockRejectedValue(failure);

    const { result } = renderHook(() => useAuthContext(), { wrapper });

    await waitFor(() => expect(result.current.initializing).toBe(false));

    await act(async () => {
      const resolved = await result.current.login({ email: 'admin@example.com', password: 'bad-password' });
      expect(resolved).toBeNull();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Unable to authenticate');

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it('logs out and clears the stored session', async () => {
    const existingSession = buildSession();
    authServiceMock.getSession.mockReturnValue(existingSession);
    authServiceMock.restore.mockResolvedValue(existingSession);

    const { result } = renderHook(() => useAuthContext(), { wrapper });

    await waitFor(() => expect(result.current.initializing).toBe(false));

    await act(async () => {
      await result.current.logout();
    });

    expect(authServiceMock.logout).toHaveBeenCalled();
    expect(result.current.session).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('responds to external session updates from the auth service', async () => {
    const initialSession = buildSession();
    const nextSession = buildSession({
      token: 'another-token',
      user: {
        id: 'admin-3',
        email: 'other@example.com',
        name: 'Other Admin',
        role: 'auditor'
      }
    });

    authServiceMock.getSession.mockReturnValue(initialSession);
    authServiceMock.restore.mockResolvedValue(initialSession);

    const { result } = renderHook(() => useAuthContext(), { wrapper });

    await waitFor(() => expect(result.current.session).toEqual(initialSession));

    act(() => {
      authServiceMock.__setSession(nextSession);
    });

    expect(result.current.session).toEqual(nextSession);
    expect(result.current.user).toEqual(nextSession.user);
  });
});
