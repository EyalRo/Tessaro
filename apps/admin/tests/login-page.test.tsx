import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '../src/pages/LoginPage';
import useAuth from '../src/hooks/useAuth';

jest.mock('../src/hooks/useAuth');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

const routerFutureFlags = {
  v7_startTransition: true,
  v7_relativeSplatPath: true
} as const;

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockReset();
  });

  const renderLoginPage = () =>
    render(
      <MemoryRouter future={routerFutureFlags}>
        <LoginPage />
      </MemoryRouter>
    );

  it('submits credentials and redirects on success', async () => {
    const loginSpy = jest.fn().mockResolvedValue({
      id: 'admin-1',
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'Administrator'
    });

    mockUseAuth.mockReturnValue({
      login: loginSpy,
      logout: jest.fn(),
      loading: false,
      error: null,
      session: null,
      user: null,
      isAuthenticated: false,
      initializing: false,
      clearError: jest.fn()
    } as any);

    renderLoginPage();

    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'admin@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password' } });

    fireEvent.submit(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(loginSpy).toHaveBeenCalledWith({
        email: 'admin@example.com',
        password: 'password'
      });
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('shows an error message when authentication fails', async () => {
    const loginSpy = jest.fn().mockResolvedValue(null);
    mockUseAuth.mockReturnValue({
      login: loginSpy,
      logout: jest.fn(),
      loading: false,
      error: 'Invalid credentials provided',
      session: null,
      user: null,
      isAuthenticated: false,
      initializing: false,
      clearError: jest.fn()
    } as any);

    renderLoginPage();

    fireEvent.submit(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Invalid credentials provided')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('clears the error when the user edits input fields', () => {
    const clearError = jest.fn();
    mockUseAuth.mockReturnValue({
      login: jest.fn(),
      logout: jest.fn(),
      loading: false,
      error: 'Invalid credentials provided',
      session: null,
      user: null,
      isAuthenticated: false,
      initializing: false,
      clearError
    } as any);

    renderLoginPage();

    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'admin@example.com' } });

    expect(clearError).toHaveBeenCalled();
  });
});
