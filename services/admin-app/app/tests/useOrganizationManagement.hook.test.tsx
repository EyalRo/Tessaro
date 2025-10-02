import { act, renderHook } from '@testing-library/react';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'org-123')
}));

describe('useOrganizationManagement hook', () => {
  it('manages lifecycle actions for organizations', async () => {
    const { default: useOrganizationManagement } = await import('../src/hooks/useOrganizationManagement');
    const { result } = renderHook(() => useOrganizationManagement());

    expect(result.current.organizations).toHaveLength(0);
    expect(result.current.currentOrganization).toBeNull();

    await act(async () => {
      await result.current.fetchOrganizations();
    });

    expect(result.current.organizations).toHaveLength(3);
    expect(result.current.loading).toBe(false);

    await act(async () => {
      await result.current.createOrganization({
        name: 'New Org',
        plan: 'Starter',
        status: 'Active'
      });
    });

    expect(result.current.organizations).toHaveLength(4);
    expect(result.current.organizations.find(org => org.id === 'org-123')).toMatchObject({
      name: 'New Org',
      plan: 'Starter',
      status: 'Active'
    });

    act(() => {
      const created = result.current.organizations.find(org => org.id === 'org-123');
      if (!created) {
        throw new Error('expected organization to exist');
      }
      result.current.selectOrganization(created);
    });

    expect(result.current.currentOrganization?.id).toBe('org-123');

    await act(async () => {
      await result.current.updateOrganization('org-123', { status: 'Suspended' });
    });

    expect(result.current.organizations.find(org => org.id === 'org-123')?.status).toBe('Suspended');
    expect(result.current.currentOrganization?.status).toBe('Suspended');

    await act(async () => {
      await result.current.deleteOrganization('org-123');
    });

    expect(result.current.organizations.find(org => org.id === 'org-123')).toBeUndefined();
    expect(result.current.currentOrganization).toBeNull();

    act(() => {
      result.current.deselectOrganization();
      result.current.clearError();
    });

    expect(result.current.currentOrganization).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
