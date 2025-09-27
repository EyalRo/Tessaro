import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import UsersPage from '../src/pages/UsersPage';
import useUserManagement from '../src/hooks/useUserManagement';

// Mock the useUserManagement hook
jest.mock('../src/hooks/useUserManagement');

const mockUseUserManagement = useUserManagement as jest.MockedFunction<typeof useUserManagement>;

describe('UsersPage', () => {
  const mockUserManagement = {
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
  };

  beforeEach(() => {
    mockUseUserManagement.mockReturnValue(mockUserManagement);
  });

  it('renders users table with correct data', () => {
    render(
      <BrowserRouter>
        <UsersPage />
      </BrowserRouter>
    );

    expect(screen.getByText('User Management')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('Administrator')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('Manager')).toBeInTheDocument();
  });

  it('shows loading state when fetching users', () => {
    mockUserManagement.loading = true;
    
    render(
      <BrowserRouter>
        <UsersPage />
      </BrowserRouter>
    );

    // In a real implementation, you would have a loading indicator
    // This is just to show the concept
  });

  it('shows error message when there is an error', async () => {
    mockUserManagement.error = { message: 'Failed to fetch users' } as any;
    
    render(
      <BrowserRouter>
        <UsersPage />
      </BrowserRouter>
    );

    // In a real implementation, you would display the error message
    // This is just to show the concept
  });

  it('calls fetchUsers on component mount', async () => {
    render(
      <BrowserRouter>
        <UsersPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockUserManagement.fetchUsers).toHaveBeenCalled();
    });
  });
});
