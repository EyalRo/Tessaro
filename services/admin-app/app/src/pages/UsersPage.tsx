import React, { useEffect, useMemo, useState } from 'react';
import useUserManagement from '../hooks/useUserManagement';
import styles from './UsersPage.module.css';

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

  const getSafeName = (userName: unknown, fallback: unknown): string => {
    if (typeof userName === 'string' && userName.trim().length > 0) {
      return userName;
    }

    if (typeof fallback === 'string' && fallback.trim().length > 0) {
      return fallback;
    }

    return 'Unnamed user';
  };

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const safeA = getSafeName(a.name, a.email);
      const safeB = getSafeName(b.name, b.email);
      return safeA.localeCompare(safeB);
    });
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

  useEffect(() => {
    if (error) {
      setFormError(null);
    }
  }, [error]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formState.name.trim() || !formState.email.trim()) {
      setFormError('Name and email are required.');
      return;
    }

    setFormError(null);

    const payload = {
      name: formState.name.trim(),
      email: formState.email.trim(),
      role: formState.role,
      avatar_url: formState.avatar_url?.trim() || null
    };

    const result = currentUser
      ? await updateUser(currentUser.id, payload)
      : await createUser(payload);

    if (result) {
      deselectUser();
      closeForm();
    } else if (!error) {
      setFormError('Unable to save user. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      await deleteUser(id);
    }
  };

  return (
    <section className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.headingGroup}>
          <p className={styles.pageTag}>People</p>
          <h1 className={styles.pageTitle}>User Management</h1>
          <p className={styles.pageSubtitle}>Manage administrator access and organization owners.</p>
        </div>
        <button
          className={styles.actionButton}
          onClick={openCreateForm}
          data-testid="open-create-user"
          type="button"
        >
          <span className={styles.actionIndicator} />
          Add User
        </button>
      </div>

      {(error || formError) && (
        <div className={styles.errorCard}>
          <div className={styles.errorContent}>
            <p>{formError || error?.message}</p>
            {error && (
              <button
                className={styles.errorDismiss}
                onClick={() => clearError()}
                type="button"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      )}

      <div className={styles.tableCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody data-testid="users-table-body">
              {sortedUsers.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className={styles.emptyState}>
                    No users found. Create the first administrator to get started.
                  </td>
                </tr>
              )}
              {sortedUsers.map((user) => {
                const displayName = getSafeName(user.name, user.email);
                return (
                  <tr key={user.id}>
                    <td>{displayName}</td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td>
                      <div className={styles.rowActions}>
                        <button
                          className={styles.rowActionEdit}
                          onClick={() => selectUser(user)}
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          className={styles.rowActionDelete}
                          onClick={() => handleDelete(user.id)}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {loading && (
          <div className={styles.loadingRow} data-testid="users-loading">
            Loading users...
          </div>
        )}
      </div>

      {isFormOpen && (
        <div className={styles.formCard} data-testid="user-form">
          <div className={styles.formHeader}>
            <div>
              <p className={styles.formTag}>{currentUser ? 'Update' : 'Create'}</p>
              <h2 className={styles.formTitle}>{currentUser ? 'Edit User' : 'Create New User'}</h2>
            </div>
            <button className={styles.formDismiss} onClick={closeForm} type="button">
              Cancel
            </button>
          </div>
          <form className={styles.formGrid} onSubmit={handleSubmit}>
            <div className={styles.formField}>
              <label htmlFor="name" className={styles.formLabel}>
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formState.name}
                onChange={handleChange}
                className={styles.formControl}
              />
            </div>
            <div className={styles.formField}>
              <label htmlFor="email" className={styles.formLabel}>
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formState.email}
                onChange={handleChange}
                className={styles.formControl}
              />
            </div>
            <div className={styles.formField}>
              <label htmlFor="role" className={styles.formLabel}>
                Role
              </label>
              <select
                id="role"
                name="role"
                value={formState.role}
                onChange={handleChange}
                className={styles.formControl}
              >
                <option value="Administrator">Administrator</option>
                <option value="Manager">Manager</option>
                <option value="User">User</option>
              </select>
            </div>
            <div className={styles.formField}>
              <label htmlFor="avatar_url" className={styles.formLabel}>
                Avatar URL (optional)
              </label>
              <input
                id="avatar_url"
                name="avatar_url"
                type="url"
                value={formState.avatar_url || ''}
                onChange={handleChange}
                className={styles.formControl}
              />
            </div>
            <div className={styles.formActions}>
              <button
                type="button"
                onClick={closeForm}
                className={styles.formButtonGhost}
              >
                Cancel
              </button>
              <button type="submit" className={styles.formButtonPrimary}>
                {currentUser ? 'Save Changes' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
};

export default UsersPage;
