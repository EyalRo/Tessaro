import React from 'react';
import styles from './SettingsPage.module.css';

const SettingsPage = () => {
  return (
    <section className={styles.page}>
      <div className={styles.headerGroup}>
        <p className={styles.pageTag}>Configuration</p>
        <h1 className={styles.pageTitle}>System Settings</h1>
        <p className={styles.pageSubtitle}>Fine-tune the Tessaro control plane and platform defaults.</p>
      </div>

      <div className={styles.settingsCard}>
        <div className={styles.settingsGrid}>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>General Settings</h2>
            <p className={styles.sectionSubtitle}>Update platform identity and default communication channels.</p>
            <div className={styles.fieldGroup}>
              <div className={styles.field}>
                <label className={styles.label}>System Name</label>
                <input className={styles.control} type="text" defaultValue="Tessaro Admin" />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Admin Email</label>
                <input className={styles.control} type="email" defaultValue="admin@tessaro.example" />
              </div>
            </div>
          </div>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Profile Picture Settings</h2>
            <p className={styles.sectionSubtitle}>Control avatar upload policies and supported formats.</p>
            <div className={styles.fieldGroup}>
              <div className={styles.field}>
                <label className={styles.label}>Max File Size (MB)</label>
                <input className={styles.control} type="number" defaultValue="5" />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Allowed Formats</label>
                <input className={styles.control} type="text" defaultValue="JPG, PNG, GIF" />
              </div>
            </div>
          </div>
        </div>
        <div className={styles.actions}>
          <button className={styles.saveButton} type="button">
            Save Settings
          </button>
        </div>
      </div>
    </section>
  );
};

export default SettingsPage;
