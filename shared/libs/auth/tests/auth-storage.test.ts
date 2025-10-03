import { LocalStorageAuthStorage } from '../src/auth-storage';
import { AuthSession } from '../src/types';

describe('LocalStorageAuthStorage', () => {
  const session: AuthSession = {
    token: 'token-123',
    issuedAt: '2024-03-01T00:00:00.000Z',
    user: {
      id: 'user-1',
      email: 'user@example.com',
      name: 'User One',
      role: 'administrator'
    }
  };

  const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');

  afterEach(() => {
    if (originalDescriptor) {
      Object.defineProperty(window, 'localStorage', originalDescriptor);
    } else {
      delete (window as unknown as Record<string, unknown>).localStorage;
    }
  });

  it('loads and saves sessions via window.localStorage when available', () => {
    const getItem = jest.fn().mockReturnValue(JSON.stringify(session));
    const setItem = jest.fn();
    const removeItem = jest.fn();

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: { getItem, setItem, removeItem }
    });

    const storage = new LocalStorageAuthStorage('test.session');

    expect(storage.load()).toEqual(session);

    storage.save(session);

    expect(setItem).toHaveBeenCalledWith('test.session', JSON.stringify(session));

    storage.clear();

    expect(removeItem).toHaveBeenCalledWith('test.session');
  });

  it('removes malformed data from window.localStorage during load', () => {
    const getItem = jest.fn().mockReturnValue('not-json');
    const removeItem = jest.fn();

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: { getItem, setItem: jest.fn(), removeItem }
    });

    const storage = new LocalStorageAuthStorage('test.session');

    expect(storage.load()).toBeNull();
    expect(removeItem).toHaveBeenCalledWith('test.session');
  });

  it('falls back to in-memory storage when localStorage is unavailable', () => {
    delete (window as unknown as Record<string, unknown>).localStorage;

    const storage = new LocalStorageAuthStorage('test.session');

    expect(storage.load()).toBeNull();

    storage.save(session);

    expect(storage.load()).toEqual(session);

    storage.clear();

    expect(storage.load()).toBeNull();
  });
});
