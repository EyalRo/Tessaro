import React, { useEffect, useMemo, useState } from 'react';
import useOrganizationManagement from '../hooks/useOrganizationManagement';
import styles from './OrganizationsPage.module.scss';

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
    <section className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.headingGroup}>
          <p className={styles.pageTag}>Tenants</p>
          <h1 className={styles.pageTitle}>Organization Management</h1>
          <p className={styles.pageSubtitle}>
            Configure customer tenants, subscription tiers, and lifecycle states.
          </p>
        </div>
        <button
          className={styles.actionButton}
          onClick={openCreateForm}
          data-testid="open-create-organization"
          type="button"
        >
          <span className={styles.actionIndicator} />
          Add Organization
        </button>
      </div>

      {error && (
        <div className={styles.errorCard}>
          <div className={styles.errorContent}>
            <p>{error.message}</p>
            <button
              className={styles.errorDismiss}
              onClick={() => clearError()}
              type="button"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className={styles.tableCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody data-testid="organizations-table-body">
              {sortedOrganizations.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className={styles.emptyState}>
                    No organizations configured yet.
                  </td>
                </tr>
              )}
              {sortedOrganizations.map((org) => {
                const isActive = org.status === 'Active';
                const badgeClass = `${styles.statusBadge} ${
                  isActive ? styles.statusBadgeActive : styles.statusBadgeSuspended
                }`;
                const indicatorClass = `${styles.statusIndicator} ${
                  isActive ? styles.statusIndicatorActive : styles.statusIndicatorSuspended
                }`;

                return (
                  <tr key={org.id}>
                    <td>{org.name}</td>
                    <td>{org.plan}</td>
                    <td>
                      <span className={badgeClass}>
                        <span className={indicatorClass} />
                        {org.status}
                      </span>
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        <button
                          className={styles.rowActionEdit}
                          onClick={() => selectOrganization(org)}
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          className={styles.rowActionDelete}
                          onClick={() => handleDelete(org.id)}
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
          <div className={styles.loadingRow} data-testid="organizations-loading">
            Loading organizations...
          </div>
        )}
      </div>

      {isFormOpen && (
        <div className={styles.formCard} data-testid="organization-form">
          <div className={styles.formHeader}>
            <div>
              <p className={styles.formTag}>{currentOrganization ? 'Update' : 'Create'}</p>
              <h2 className={styles.formTitle}>
                {currentOrganization ? 'Edit Organization' : 'Create Organization'}
              </h2>
            </div>
            <button className={styles.formDismiss} onClick={closeForm} type="button">
              Cancel
            </button>
          </div>
          <form className={styles.formGrid} onSubmit={handleSubmit}>
            <div className={`${styles.formField} ${styles.formFieldWide}`.trim()}>
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
              <label htmlFor="plan" className={styles.formLabel}>
                Plan
              </label>
              <select
                id="plan"
                name="plan"
                value={formState.plan}
                onChange={handleChange}
                className={styles.formControl}
              >
                {planOptions.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.formField}>
              <label htmlFor="status" className={styles.formLabel}>
                Status
              </label>
              <select
                id="status"
                name="status"
                value={formState.status}
                onChange={handleChange}
                className={styles.formControl}
              >
                {statusOptions.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
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
                {currentOrganization ? 'Save Changes' : 'Create Organization'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
};

export default OrganizationsPage;
