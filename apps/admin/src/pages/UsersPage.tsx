import React, { useEffect, useMemo, useState } from 'react';
import useUserManagement from '../hooks/useUserManagement';

type UserFormState = {
  name: string;
  email: string;
  role: string;
  avatar_url?: string;
};

const emptyForm: UserFormState = {
  name: '',
  email: '',
  role: 'User',
  avatar_url: ''
};

const UsersPage: React.FC = () => {
  const {
    users,
    currentUser,
    loading,
    error,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    selectUser,
    deselectUser,
    clearError
  } = useUserManagement();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formState, setFormState] = useState<UserFormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
    return () => {
      clearError();
    };
  }, [fetchUsers, clearError]);

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => a.name.localeCompare(b.name));
  }, [users]);

  useEffect(() => {
    if (currentUser) {
      setFormState({
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
        avatar_url: currentUser.avatar_url || ''
      });
      setIsFormOpen(true);
    }
  }, [currentUser]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const openCreateForm = () => {
    deselectUser();
    setFormState(emptyForm);
    setFormError(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setFormState(emptyForm);
    setFormError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formState.name.trim() || !formState.email.trim()) {
      setFormError('Name and email are required.');
      return;
    }

    if (currentUser) {
      await updateUser(currentUser.id, {
        name: formState.name.trim(),
        email: formState.email.trim(),
        role: formState.role,
        avatar_url: formState.avatar_url?.trim() || undefined
      });
    } else {
      await createUser({
        name: formState.name.trim(),
        email: formState.email.trim(),
        role: formState.role,
        avatar_url: formState.avatar_url?.trim() || undefined
      });
    }

    closeForm();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      await deleteUser(id);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
          <p className="text-sm text-gray-500">Manage administrator access and organization owners.</p>
        </div>
        <button
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          onClick={openCreateForm}
          data-testid="open-create-user"
        >
          Add User
        </button>
      </div>

      {(error || formError) && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{formError || error?.message}</h3>
              {error && (
                <button
                  className="mt-2 text-sm text-red-700 underline"
                  onClick={() => clearError()}
                >
                  Dismiss
                </button>
              )}
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
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200" data-testid="users-table-body">
              {sortedUsers.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                    No users found. Create the first administrator to get started.
                  </td>
                </tr>
              )}
              {sortedUsers.map(user => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {user.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.role}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-2">
                    <button
                      className="text-indigo-600 hover:text-indigo-900"
                      onClick={() => selectUser(user)}
                    >
                      Edit
                    </button>
                    <button
                      className="text-red-600 hover:text-red-900"
                      onClick={() => handleDelete(user.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading && (
          <div className="px-6 py-4 text-sm text-gray-500" data-testid="users-loading">
            Loading users...
          </div>
        )}
      </div>

      {isFormOpen && (
        <div className="bg-white shadow rounded-lg p-6" data-testid="user-form">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-700">
              {currentUser ? 'Edit User' : 'Create New User'}
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
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formState.email}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                Role
              </label>
              <select
                id="role"
                name="role"
                value={formState.role}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="Administrator">Administrator</option>
                <option value="Manager">Manager</option>
                <option value="User">User</option>
              </select>
            </div>
            <div>
              <label htmlFor="avatar_url" className="block text-sm font-medium text-gray-700">
                Avatar URL (optional)
              </label>
              <input
                id="avatar_url"
                name="avatar_url"
                type="url"
                value={formState.avatar_url || ''}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
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
                {currentUser ? 'Save Changes' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
