import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import useUserOrganizations from '../hooks/useUserOrganizations';
import { useOrganizationContext } from '../contexts/OrganizationContext';
import LoadingState from '../components/LoadingState';
import styles from './OrganizationSelectPage.module.css';

const OrganizationSelectPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectOrganization } = useOrganizationContext();
  const {
    organizations,
    loading,
    error,
    fetchOrganizations,
    clearError
  } = useUserOrganizations();

  useEffect(() => {
    fetchOrganizations(user?.id);
  }, [user?.id, fetchOrganizations]);

  const handleSelect = (organizationId: string) => {
    const organization = organizations.find((item) => item.id === organizationId);
    if (!organization) {
      return;
    }
    selectOrganization(organization);
    navigate('/services');
  };

  if (!user) {
    return null;
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div>
          <p className={styles.tag}>Organizations</p>
          <h2 className={styles.title}>Choose a workspace</h2>
          <p className={styles.subtitle}>
            Your Tessaro services are organized by organization. Pick one to continue.
          </p>
        </div>
        <button
          type="button"
          className={styles.refreshButton}
          onClick={() => {
            clearError();
            fetchOrganizations(user.id);
          }}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {loading && (
        <div className={styles.loadingRow}>
          <LoadingState label="Loading organizations" />
        </div>
      )}

      {error && (
        <div className={styles.errorBanner} role="alert">
          <span>{error}</span>
          <button type="button" onClick={clearError}>Dismiss</button>
        </div>
      )}

      <div className={styles.grid}>
        {organizations.map((organization) => (
          <button
            key={organization.id}
            type="button"
            className={styles.card}
            onClick={() => handleSelect(organization.id)}
          >
            <div className={styles.cardHeader}>
              <span className={styles.cardInitial}>{organization.name.slice(0, 2).toUpperCase()}</span>
              <span className={styles.cardStatus}>{organization.status}</span>
            </div>
            <h3 className={styles.cardTitle}>{organization.name}</h3>
            <p className={styles.cardPlan}>{organization.plan} plan</p>
          </button>
        ))}

        {organizations.length === 0 && !loading && !error && (
          <div className={styles.emptyState}>
            <h3>No organizations yet</h3>
            <p>
              Ask an administrator to invite you to an organization so you can access its services.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizationSelectPage;
