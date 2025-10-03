import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import UsersPage from '../src/pages/UsersPage';
import useUserManagement from '../src/hooks/useUserManagement';

jest.mock('../src/hooks/useUserManagement');

const mockUseUserManagement = useUserManagement as jest.MockedFunction<typeof useUserManagement>;

type UserManagementHook = ReturnType<typeof useUserManagement>;

const routerFutureFlags = {
  v7_startTransition: true,
  v7_relativeSplatPath: true
} as const;

const renderWithRouter = () =>
  render(
    <MemoryRouter future={routerFutureFlags}>
      <UsersPage />
    </MemoryRouter>
  );

const createHookMock = (overrides: Partial<UserManagementHook> = {}) => {
  const base: jest.Mocked<UserManagementHook> = {
    users: [
      { id: '1', email: 'john@example.com', name: 'John Doe', role: 'Administrator' },
      { id: '2', email: 'jane@example.com', name: 'Jane Smith', role: 'Manager' }
    ],
    currentUser: null,
    loading: false,
    error: null,
    fetchUsers: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
    selectUser: jest.fn(),
    deselectUser: jest.fn(),
    clearError: jest.fn()
  } as unknown as jest.Mocked<UserManagementHook>;

  return { ...base, ...overrides } as jest.Mocked<UserManagementHook>;
};

describe('UsersPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders users returned by the hook', () => {
    const hookValue = createHookMock();
    mockUseUserManagement.mockReturnValue(hookValue);

    renderWithRouter();

    expect(screen.getByText('User Management')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('Administrator')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('invokes fetchUsers on mount and shows loading state', async () => {
    const hookValue = createHookMock({ loading: true } as Partial<UserManagementHook>);
    mockUseUserManagement.mockReturnValue(hookValue);

    renderWithRouter();

    expect(await screen.findByTestId('users-loading')).toBeInTheDocument();
    expect(hookValue.fetchUsers).toHaveBeenCalled();
  });

  it('exposes error message returned by the hook', () => {
    const hookValue = createHookMock({ error: { message: 'Failed to fetch users' } as any });
    mockUseUserManagement.mockReturnValue(hookValue);

    renderWithRouter();

    expect(screen.getByText('Failed to fetch users')).toBeInTheDocument();
  });

  it('opens creation form and submits new user data', async () => {
    const hookValue = createHookMock();
    hookValue.createUser.mockResolvedValue({ id: '3', name: 'New User', email: 'new@example.com', role: 'User' } as any);
    mockUseUserManagement.mockReturnValue(hookValue);

    renderWithRouter();

    fireEvent.click(screen.getByTestId('open-create-user'));

    const initialDeselectCalls = hookValue.deselectUser.mock.calls.length;

    const formWrapper = await screen.findByTestId('user-form');
    expect(formWrapper).toBeInTheDocument();
    const form = formWrapper.querySelector('form') as HTMLFormElement;

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'New User' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@example.com' } });
    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'Manager' } });

    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(hookValue.createUser).toHaveBeenCalledWith({
        name: 'New User',
        email: 'new@example.com',
        role: 'Manager',
        avatar_url: undefined
      });
    });
  });

  it('keeps the form open when creating a user fails', async () => {
    const hookValue = createHookMock();
    hookValue.createUser.mockResolvedValue(null);
    mockUseUserManagement.mockReturnValue(hookValue);

    renderWithRouter();

    fireEvent.click(screen.getByTestId('open-create-user'));

    const initialDeselectCalls = hookValue.deselectUser.mock.calls.length;

    const formWrapper = await screen.findByTestId('user-form');
    const form = formWrapper.querySelector('form') as HTMLFormElement;

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'New User' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@example.com' } });

    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(hookValue.createUser).toHaveBeenCalled();
    });

    expect(screen.getByTestId('user-form')).toBeInTheDocument();
    expect(screen.getByText('Unable to save user. Please try again.')).toBeInTheDocument();
    expect(hookValue.deselectUser).toHaveBeenCalledTimes(initialDeselectCalls);
  });

  it('forwards edit and delete actions to the hook', async () => {
    const hookValue = createHookMock();
    mockUseUserManagement.mockReturnValue(hookValue);
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValueOnce(true);

    renderWithRouter();

    const firstRowEdit = screen.getAllByText('Edit')[0];
    fireEvent.click(firstRowEdit);
    expect(hookValue.selectUser).toHaveBeenCalledWith(expect.objectContaining({ id: '2' }));

    const firstRowDelete = screen.getAllByText('Delete')[0];
    fireEvent.click(firstRowDelete);

    await waitFor(() => {
      expect(hookValue.deleteUser).toHaveBeenCalledWith('2');
    });

    confirmSpy.mockRestore();
  });
});
