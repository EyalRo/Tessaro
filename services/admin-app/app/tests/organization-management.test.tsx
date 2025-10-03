import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OrganizationsPage from '../src/pages/OrganizationsPage';
import useOrganizationManagement from '../src/hooks/useOrganizationManagement';

jest.mock('../src/hooks/useOrganizationManagement');

const mockUseOrganizationManagement = useOrganizationManagement as jest.MockedFunction<typeof useOrganizationManagement>;

type OrganizationManagementHook = ReturnType<typeof useOrganizationManagement>;

const routerFutureFlags = {
  v7_startTransition: true,
  v7_relativeSplatPath: true
} as const;

const renderWithRouter = () =>
  render(
    <MemoryRouter future={routerFutureFlags}>
      <OrganizationsPage />
    </MemoryRouter>
  );

const createHookMock = (overrides: Partial<OrganizationManagementHook> = {}) => {
  const base: jest.Mocked<OrganizationManagementHook> = {
    organizations: [
      { id: '1', name: 'Acme Corp', plan: 'Enterprise', status: 'Active' },
      { id: '2', name: 'Globex Inc', plan: 'Professional', status: 'Suspended' }
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
  } as unknown as jest.Mocked<OrganizationManagementHook>;

  return { ...base, ...overrides } as jest.Mocked<OrganizationManagementHook>;
};

describe('OrganizationsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders organizations returned by the hook', () => {
    const hookValue = createHookMock();
    mockUseOrganizationManagement.mockReturnValue(hookValue);

    renderWithRouter();

    expect(screen.getByText('Organization Management')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Enterprise')).toBeInTheDocument();
    expect(screen.getByText('Suspended')).toBeInTheDocument();
  });

  it('invokes fetchOrganizations on mount and displays loading state', async () => {
    const hookValue = createHookMock({ loading: true } as Partial<OrganizationManagementHook>);
    mockUseOrganizationManagement.mockReturnValue(hookValue);

    renderWithRouter();

    expect(await screen.findByTestId('organizations-loading')).toBeInTheDocument();
    expect(hookValue.fetchOrganizations).toHaveBeenCalled();
  });

  it('opens creation form and submits organization data', async () => {
    const hookValue = createHookMock();
    hookValue.createOrganization.mockResolvedValue({ id: '3', name: 'Wayne Enterprises', plan: 'Enterprise', status: 'Active' } as any);
    mockUseOrganizationManagement.mockReturnValue(hookValue);

    renderWithRouter();

    fireEvent.click(screen.getByTestId('open-create-organization'));

    const initialDeselectCalls = hookValue.deselectOrganization.mock.calls.length;

    const formWrapper = await screen.findByTestId('organization-form');
    const form = formWrapper.querySelector('form') as HTMLFormElement;
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Wayne Enterprises' } });
    fireEvent.change(screen.getByLabelText('Plan'), { target: { value: 'Enterprise' } });
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'Active' } });

    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(hookValue.createOrganization).toHaveBeenCalledWith({
        name: 'Wayne Enterprises',
        plan: 'Enterprise',
        status: 'Active'
      });
    });
  });

  it('shows an error and keeps the drawer open when creation fails', async () => {
    const hookValue = createHookMock();
    hookValue.createOrganization.mockResolvedValue(null);
    mockUseOrganizationManagement.mockReturnValue(hookValue);

    renderWithRouter();

    fireEvent.click(screen.getByTestId('open-create-organization'));

    const initialDeselectCalls = hookValue.deselectOrganization.mock.calls.length;

    const formWrapper = await screen.findByTestId('organization-form');
    const form = formWrapper.querySelector('form') as HTMLFormElement;

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'New Org' } });

    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(hookValue.createOrganization).toHaveBeenCalled();
    });

    expect(screen.getByTestId('organization-form')).toBeInTheDocument();
    expect(screen.getByText('Unable to save organization. Please try again.')).toBeInTheDocument();
    expect(hookValue.deselectOrganization).toHaveBeenCalledTimes(initialDeselectCalls);
  });

  it('delegates edit and delete actions to the hook', async () => {
    const hookValue = createHookMock();
    mockUseOrganizationManagement.mockReturnValue(hookValue);
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValueOnce(true);

    renderWithRouter();

    fireEvent.click(screen.getAllByText('Edit')[0]);
    expect(hookValue.selectOrganization).toHaveBeenCalledWith(hookValue.organizations[0]);

    fireEvent.click(screen.getAllByText('Delete')[0]);

    await waitFor(() => {
      expect(hookValue.deleteOrganization).toHaveBeenCalledWith('1');
    });

    confirmSpy.mockRestore();
  });
});
