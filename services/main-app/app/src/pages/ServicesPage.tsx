import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useOrganizationContext } from '../contexts/OrganizationContext';
import useServices from '../hooks/useServices';
import LoadingState from '../components/LoadingState';
import styles from './ServicesPage.module.css';

const ServicesPage: React.FC = () => {
  const { organization } = useOrganizationContext();
  const {
    services,
    loading,
    error,
    fetchServices,
    clearError
  } = useServices();

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  if (!organization) {
    return <Navigate to="/organizations" replace />;
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div>
          <p className={styles.tag}>Services</p>
          <h2 className={styles.title}>Available for {organization.name}</h2>
          <p className={styles.subtitle}>
            Launch operational tools, integrations, and monitoring endpoints configured for this organization.
          </p>
        </div>
        <div className={styles.meta}>
          <span className={styles.badge}>{organization.plan} plan</span>
          <span className={styles.badgeSecondary}>{organization.status}</span>
        </div>
      </div>

      {loading && (
        <div className={styles.loadingRow}>
          <LoadingState label="Loading services" />
        </div>
      )}

      {error && (
        <div className={styles.errorBanner} role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => {
            clearError();
            fetchServices();
          }}>
            Retry
          </button>
        </div>
      )}

      <div className={styles.list}>
        {services.map((service) => (
          <article key={service.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardType}>{service.service_type}</span>
              <span className={styles.cardStatus}>{service.status}</span>
            </div>
            <h3 className={styles.cardTitle}>{service.name}</h3>
            <p className={styles.cardSummary}>
              Serving {service.organization_count} organizations across Tessaro.
            </p>
            <button type="button" className={styles.cardAction}>
              Open service
            </button>
          </article>
        ))}

        {services.length === 0 && !loading && !error && (
          <div className={styles.emptyState}>
            <h3>No services yet</h3>
            <p>
              Services will appear here once your organization provisions integrations or infrastructure in Tessaro.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServicesPage;
