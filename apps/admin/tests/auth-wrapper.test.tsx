import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import AuthWrapper from '../src/components/AuthWrapper';
import useAuth from '../src/hooks/useAuth';

jest.mock('../src/hooks/useAuth');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockNavigate = jest.fn();
const mockUseLocation = jest.fn();

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockUseLocation()
  };
});

describe('AuthWrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockReset();
    mockUseLocation.mockReset();
  });

  const renderWrapper = () =>
    render(
      <AuthWrapper>
        <div>Protected Content</div>
      </AuthWrapper>
    );

  it('renders a loading indicator while authentication state initializes', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      initializing: true,
      session: null,
      user: null,
      loading: false,
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
      clearError: jest.fn()
    } as any);
    mockUseLocation.mockReturnValue({ pathname: '/dashboard' });

    renderWrapper();

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('redirects unauthenticated users away from protected routes', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      initializing: false,
      session: null,
      user: null,
      loading: false,
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
      clearError: jest.fn()
    } as any);
    mockUseLocation.mockReturnValue({ pathname: '/settings' });

    renderWrapper();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
    });

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('redirects authenticated users away from the login route', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      initializing: false,
      session: null,
      user: { id: 'admin-1' },
      loading: false,
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
      clearError: jest.fn()
    } as any);
    mockUseLocation.mockReturnValue({ pathname: '/login' });

    renderWrapper();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('renders children when viewing the login page unauthenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      initializing: false,
      session: null,
      user: null,
      loading: false,
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
      clearError: jest.fn()
    } as any);
    mockUseLocation.mockReturnValue({ pathname: '/login' });

    renderWrapper();

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
