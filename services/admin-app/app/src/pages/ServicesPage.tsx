import React, { useEffect, useMemo, useState } from 'react';
import useServiceManagement from '../hooks/useServiceManagement';
import styles from './ServicesPage.module.css';

type ServiceFormState = {
  name: string;
  service_type: string;
  status: string;
  organization_count: string;
};

const defaultFormState: ServiceFormState = {
  name: '',
  service_type: '',
  status: 'Active',
  organization_count: ''
};

const ServicesPage = () => {
  const {
    services,
    loading,
    error,
    fetchServices,
    createService,
    clearError
  } = useServiceManagement();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formState, setFormState] = useState<ServiceFormState>(defaultFormState);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetchServices();
    return () => {
      clearError();
    };
  }, [fetchServices, clearError]);

  const sortedServices = useMemo(() => {
    return [...services].sort((a, b) => a.name.localeCompare(b.name));
  }, [services]);

  const handleOpenForm = () => {
    setIsFormOpen(true);
    setFormError(null);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setFormError(null);
    setFormState(defaultFormState);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formState.name.trim() || !formState.service_type.trim()) {
      setFormError('Name and type are required.');
      return;
    }

    const parsedCount = formState.organization_count.trim();
    if (parsedCount && (!/^[0-9]+$/.test(parsedCount) || Number(parsedCount) < 0)) {
      setFormError('Organizations must be a non-negative number.');
      return;
    }

    setFormError(null);

    const payload = {
      name: formState.name.trim(),
      service_type: formState.service_type.trim(),
      status: formState.status.trim() || 'Active',
      organization_count: parsedCount ? Number(parsedCount) : 0
    };

    const result = await createService(payload);
    if (result) {
      handleCloseForm();
    } else if (!error) {
      setFormError('Unable to save service. Please try again.');
    }
  };

  return (
    <section className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.headingGroup}>
          <p className={styles.pageTag}>Services</p>
          <h1 className={styles.pageTitle}>Service Management</h1>
          <p className={styles.pageSubtitle}>Monitor integrations and roll out updates across every tenant.</p>
        </div>
        <button
          className={styles.actionButton}
          type="button"
          onClick={handleOpenForm}
        >
          <span className={styles.actionIndicator} />
          Add Service
        </button>
      </div>

      <div className={styles.tableCard}>
        {(error || formError) && (
          <div className={styles.errorBanner} role="alert">
            <span>{formError || error?.message}</span>
            {error && (
              <button
                type="button"
                className={styles.errorDismiss}
                onClick={() => clearError()}
              >
                Dismiss
              </button>
            )}
          </div>
        )}
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Organizations</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedServices.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className={styles.emptyRow}>
                    No services configured yet.
                  </td>
                </tr>
              )}
              {sortedServices.map(service => (
                <tr key={service.id}>
                  <td>{service.name}</td>
                  <td>{service.service_type}</td>
                  <td>{service.organization_count}</td>
                  <td>
                    <span className={styles.statusBadge}>
                      <span className={styles.statusIndicator} />
                      {service.status}
                    </span>
                  </td>
                  <td>
                    <div className={styles.rowActions}>
                      <button className={styles.rowActionEdit} type="button" disabled>
                        Edit
                      </button>
                      <button className={styles.rowActionDelete} type="button" disabled>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading && (
          <div className={styles.loadingRow}>Loading services...</div>
        )}
        {error && (
          <div className={styles.errorRow}>{error.message}</div>
        )}
      </div>

      {isFormOpen && (
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <div>
              <p className={styles.formTag}>Create</p>
              <h2 className={styles.formTitle}>Add Service</h2>
            </div>
            <button className={styles.formDismiss} type="button" onClick={handleCloseForm}>
              Cancel
            </button>
          </div>
          <form className={styles.formGrid} onSubmit={handleSubmit}>
            <div className={styles.formField}>
              <label htmlFor="service-name" className={styles.formLabel}>Name</label>
              <input
                id="service-name"
                name="name"
                type="text"
                value={formState.name}
                onChange={handleChange}
                className={styles.formControl}
              />
            </div>
            <div className={styles.formField}>
              <label htmlFor="service-type" className={styles.formLabel}>Type</label>
              <input
                id="service-type"
                name="service_type"
                type="text"
                value={formState.service_type}
                onChange={handleChange}
                className={styles.formControl}
              />
            </div>
            <div className={styles.formField}>
              <label htmlFor="service-status" className={styles.formLabel}>Status</label>
              <select
                id="service-status"
                name="status"
                value={formState.status}
                onChange={handleChange}
                className={styles.formControl}
              >
                <option value="Active">Active</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Suspended">Suspended</option>
              </select>
            </div>
            <div className={styles.formField}>
              <label htmlFor="service-organizations" className={styles.formLabel}>Organizations</label>
              <input
                id="service-organizations"
                name="organization_count"
                type="number"
                min="0"
                value={formState.organization_count}
                onChange={handleChange}
                className={styles.formControl}
                placeholder="0"
              />
            </div>
            <div className={styles.formActions}>
              <button
                type="button"
                className={styles.formButtonGhost}
                onClick={handleCloseForm}
              >
                Cancel
              </button>
              <button type="submit" className={styles.formButtonPrimary}>
                Create Service
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
};

export default ServicesPage;
