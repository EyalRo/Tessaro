import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import styles from './DashboardLayout.module.css';

const DashboardLayout = () => {
  return (
    <div className={styles.layout}>
      <div className={styles.background}>
        <div className={styles.backgroundPrimary} />
        <div className={styles.backgroundSecondary} />
      </div>
      <Sidebar />
      <div className={styles.content}>
        <Header />
        <main className={styles.main}>
          <div className={styles.mainInner}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
