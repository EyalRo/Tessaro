import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import OrganizationsPage from '../src/pages/OrganizationsPage';
import useOrganizationManagement from '../src/hooks/useOrganizationManagement';

// Mock the useOrganizationManagement hook
jest.mock('../src/hooks/useOrganizationManagement');

const mockUseOrganizationManagement = useOrganizationManagement as jest.MockedFunction<typeof useOrganizationManagement>;

describe('OrganizationsPage', () => {
  const mockOrgManagement = {
    organizations: [
      { id: '1', name: 'Acme Corp', plan: 'Enterprise', status: 'Active' },
      { id: '2', name: 'Globex Inc', plan: 'Professional', status: 'Active' }
    ],
    currentOrganization: null,
    loading: false,
    error: null,
    fetchOrganizations: jest.fn(),
    createOrganization: jest.fn(),
    updateOrganization: jest.fn(),
    deleteOrganization: jest.fn(),
    selectOrganization: jest.fn(),
    deselectOrganization: jest.fn(),
    clearError: jest.fn()
  };

  beforeEach(() => {
    mockUseOrganizationManagement.mockReturnValue(mockOrgManagement);
  });

  it('renders organizations table with correct data', () => {
    render(
      <BrowserRouter>
        <OrganizationsPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Organization Management')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Enterprise')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Globex Inc')).toBeInTheDocument();
    expect(screen.getByText('Professional')).toBeInTheDocument();
  });

  it('calls fetchOrganizations on component mount', async () => {
    render(
      <BrowserRouter>
        <OrganizationsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockOrgManagement.fetchOrganizations).toHaveBeenCalled();
    });
  });
});
