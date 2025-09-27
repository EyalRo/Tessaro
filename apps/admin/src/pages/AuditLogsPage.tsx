import React from 'react';
import styles from './AuditLogsPage.module.scss';

const AuditLogsPage = () => {
  return (
    <section className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.headingGroup}>
          <p className={styles.pageTag}>Observability</p>
          <h1 className={styles.pageTitle}>Audit Logs</h1>
          <p className={styles.pageSubtitle}>Trace every change made within Tessaro across users and tenants.</p>
        </div>
        <button
          className={styles.actionButton}
          type="button"
        >
          <span className={styles.actionIndicator} />
          Export Logs
        </button>
      </div>

      <div className={styles.tableCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Action</th>
                <th>User</th>
                <th>Target</th>
                <th>IP Address</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>User Created</td>
                <td>admin@example.com</td>
                <td>john@example.com</td>
                <td>192.168.1.100</td>
                <td>2023-05-15 14:30:22</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default AuditLogsPage;
