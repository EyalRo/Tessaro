import React, { useEffect, useMemo, useState } from 'react';
import useOrganizationManagement from '../hooks/useOrganizationManagement';

type OrganizationFormState = {
  name: string;
  plan: string;
  status: string;
};

const defaultForm: OrganizationFormState = {
  name: '',
  plan: 'Professional',
  status: 'Active'
};

const planOptions = ['Starter', 'Professional', 'Enterprise'];
const statusOptions = ['Active', 'Suspended'];

const OrganizationsPage: React.FC = () => {
  const {
    organizations,
    currentOrganization,
    loading,
    error,
    fetchOrganizations,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    selectOrganization,
    deselectOrganization,
    clearError
  } = useOrganizationManagement();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formState, setFormState] = useState<OrganizationFormState>(defaultForm);

  useEffect(() => {
    fetchOrganizations();
    return () => clearError();
  }, [fetchOrganizations, clearError]);

  useEffect(() => {
    if (currentOrganization) {
      setFormState({
        name: currentOrganization.name,
        plan: currentOrganization.plan,
        status: currentOrganization.status
      });
      setIsFormOpen(true);
    }
  }, [currentOrganization]);

  const sortedOrganizations = useMemo(() => {
    return [...organizations].sort((a, b) => a.name.localeCompare(b.name));
  }, [organizations]);

  const openCreateForm = () => {
    deselectOrganization();
    setFormState(defaultForm);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setFormState(defaultForm);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formState.name.trim()) {
      return;
    }

    if (currentOrganization) {
      await updateOrganization(currentOrganization.id, {
        name: formState.name.trim(),
        plan: formState.plan,
        status: formState.status
      });
    } else {
      await createOrganization({
        name: formState.name.trim(),
        plan: formState.plan,
        status: formState.status
      });
    }

    closeForm();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this organization?')) {
      await deleteOrganization(id);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Organization Management</h1>
          <p className="text-sm text-gray-500">
            Configure customer tenants, subscription tiers, and lifecycle states.
          </p>
        </div>
        <button
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          onClick={openCreateForm}
          data-testid="open-create-organization"
        >
          Add Organization
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex items-start">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error.message}</h3>
              <button className="mt-2 text-sm text-red-700 underline" onClick={() => clearError()}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200" data-testid="organizations-table-body">
              {sortedOrganizations.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                    No organizations configured yet.
                  </td>
                </tr>
              )}
              {sortedOrganizations.map(org => (
                <tr key={org.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{org.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{org.plan}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      org.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {org.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-2">
                    <button className="text-indigo-600 hover:text-indigo-900" onClick={() => selectOrganization(org)}>
                      Edit
                    </button>
                    <button className="text-red-600 hover:text-red-900" onClick={() => handleDelete(org.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading && (
          <div className="px-6 py-4 text-sm text-gray-500" data-testid="organizations-loading">
            Loading organizations...
          </div>
        )}
      </div>

      {isFormOpen && (
        <div className="bg-white shadow rounded-lg p-6" data-testid="organization-form">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-700">
              {currentOrganization ? 'Edit Organization' : 'Create Organization'}
            </h2>
            <button className="text-sm text-gray-500 underline" onClick={closeForm}>
              Cancel
            </button>
          </div>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formState.name}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="plan" className="block text-sm font-medium text-gray-700">
                Plan
              </label>
              <select
                id="plan"
                name="plan"
                value={formState.plan}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                {planOptions.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={formState.status}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                {statusOptions.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={closeForm}
                className="px-4 py-2 rounded-md border border-gray-300 text-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
              >
                {currentOrganization ? 'Save Changes' : 'Create Organization'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default OrganizationsPage;
