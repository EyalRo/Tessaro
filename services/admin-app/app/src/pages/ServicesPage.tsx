import React from 'react';
import styles from './ServicesPage.module.css';

const ServicesPage = () => {
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
        >
          <span className={styles.actionIndicator} />
          Add Service
        </button>
      </div>

      <div className={styles.tableCard}>
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
              <tr>
                <td>Email Service</td>
                <td>Communication</td>
                <td>15</td>
                <td>
                  <span className={styles.statusBadge}>
                    <span className={styles.statusIndicator} />
                    Active
                  </span>
                </td>
                <td>
                  <div className={styles.rowActions}>
                    <button className={styles.rowActionEdit} type="button">
                      Edit
                    </button>
                    <button className={styles.rowActionDelete} type="button">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default ServicesPage;
