import { act, renderHook } from '@testing-library/react';

const listUsersMock = jest.fn();
const createUserMock = jest.fn();
const updateUserMock = jest.fn();
const deleteUserMock = jest.fn();

jest.mock('shared/libs/api-client', () => ({
  UserApiClient: jest.fn().mockImplementation(() => ({
    listUsers: listUsersMock,
    createUser: createUserMock,
    updateUser: updateUserMock,
    deleteUser: deleteUserMock
  }))
}));

describe('useUserManagement hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes users when fetching from the API', async () => {
    const { default: useUserManagement } = await import('../src/hooks/useUserManagement');

    listUsersMock.mockResolvedValueOnce([
      {
        id: 'user-1',
        email: 'alpha@example.com',
        name: '   ',
        role: '',
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]);

    const { result } = renderHook(() => useUserManagement());

    await act(async () => {
      await result.current.fetchUsers();
    });

    expect(result.current.users).toHaveLength(1);
    expect(result.current.users[0]).toMatchObject({
      id: 'user-1',
      email: 'alpha@example.com',
      name: 'alpha@example.com',
      role: 'User',
      avatar_url: undefined
    });
  });

  it('normalizes created and updated users and clears current selection on delete', async () => {
    const { default: useUserManagement } = await import('../src/hooks/useUserManagement');

    listUsersMock.mockResolvedValueOnce([]);
    createUserMock.mockResolvedValueOnce({
      id: 'user-2',
      email: '   ',
      name: '',
      role: '   ',
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    updateUserMock.mockResolvedValueOnce({
      id: 'user-2',
      email: 'updated@example.com',
      name: '',
      role: '',
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    deleteUserMock.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useUserManagement());

    await act(async () => {
      await result.current.fetchUsers();
    });

    await act(async () => {
      await result.current.createUser({
        name: 'Temp Name',
        email: 'temp@example.com',
        role: 'Manager',
        avatar_url: ''
      });
    });

    expect(result.current.users[0]).toMatchObject({
      name: 'Unnamed user',
      email: '',
      role: 'User'
    });

    act(() => {
      result.current.selectUser(result.current.users[0]);
    });

    await act(async () => {
      await result.current.updateUser('user-2', {
        name: '   ',
        email: 'updated@example.com',
        role: ''
      });
    });

    expect(result.current.users[0]).toMatchObject({
      name: 'updated@example.com',
      email: 'updated@example.com',
      role: 'User'
    });
    expect(result.current.currentUser).toMatchObject({
      id: 'user-2',
      name: 'updated@example.com'
    });

    await act(async () => {
      await result.current.deleteUser('user-2');
    });

    expect(deleteUserMock).toHaveBeenCalledWith('user-2');
    expect(result.current.users).toHaveLength(0);
    expect(result.current.currentUser).toBeNull();
  });
});
