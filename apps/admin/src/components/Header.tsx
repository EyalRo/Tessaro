import React, { useMemo } from 'react';
import useAuth from '../hooks/useAuth';
import styles from './Header.module.scss';

const Header = () => {
  const { user, logout } = useAuth();

  const initials = useMemo(() => {
    if (!user?.name) {
      return 'TA';
    }

    const matches = user.name.trim().split(/\s+/);
    const first = matches[0]?.[0] ?? '';
    const last = matches.length > 1 ? matches[matches.length - 1]?.[0] ?? '' : '';
    const candidate = `${first}${last}`.toUpperCase();

    if (candidate.trim().length > 0) {
      return candidate;
    }

    return user.email.slice(0, 2).toUpperCase();
  }, [user]);

  const handleLogout = React.useCallback(() => {
    void logout();
  }, [logout]);

  return (
    <header className={styles.header}>
      <div>
        <h1 className={styles.headerTitle}>Admin Dashboard</h1>
        <p className={styles.headerSubtitle}>
          Monitor Tessaro services, manage organizations, and keep the platform healthy.
        </p>
      </div>

      <div className={styles.controls}>
        <div className={styles.search}>
          <input
            className={styles.searchInput}
            placeholder="Search for users, organizations, or services"
            type="search"
          />
          <span className={styles.searchShortcut}>
            /
          </span>
        </div>

        <button
          className={styles.liveButton}
          type="button"
        >
          <span className={styles.liveIndicator} />
          Live Metrics
        </button>

        <div className={styles.quickActions}>
          <button
            className={styles.notificationButton}
            type="button"
            aria-label="Notifications"
          >
            <svg className={styles.icon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M15 18h5l-1.405-1.405A2.032 2.032 0 0118 15.158V11a6 6 0 00-12 0v4.159c0 .538-.214 1.055-.595 1.436L4 18h5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M9.354 21a2.5 2.5 0 004.292 0"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className={styles.notificationBadge} />
          </button>

          <button className={styles.profileButton}>
            <div className={styles.profileAvatar}>
              {initials}
            </div>
            <div className={styles.profileMeta}>
              <p>{user?.name ?? 'Admin User'}</p>
              <p>{user?.role ?? 'Administrator'}</p>
            </div>
            <svg className={styles.profileIcon} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <button className={styles.logoutButton} type="button" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
