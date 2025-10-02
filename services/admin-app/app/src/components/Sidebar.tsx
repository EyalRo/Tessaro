import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import styles from './Sidebar.module.scss';

const navigation = [
  {
    name: 'Dashboard',
    path: '/',
    icon: (
      <svg
        className={styles.navSvg}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M3 9.75L12 3l9 6.75V20a1 1 0 01-1 1h-5.25v-6.75h-5.5V21H4a1 1 0 01-1-1V9.75z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  },
  {
    name: 'Users',
    path: '/users',
    icon: (
      <svg
        className={styles.navSvg}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M15 19.127A6 6 0 006 15"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M18 19.127A6 6 0 009 15"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M15 9a3 3 0 11-6 0 3 3 0 016 0z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M18 10.5a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  },
  {
    name: 'Organizations',
    path: '/organizations',
    icon: (
      <svg
        className={styles.navSvg}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M4 21v-6.75a1 1 0 01.553-.894l7-3.5a1 1 0 01.894 0l7 3.5a1 1 0 01.553.894V21"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 3l7 3.5-7 3.5-7-3.5 7-3.5z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  },
  {
    name: 'Services',
    path: '/services',
    icon: (
      <svg
        className={styles.navSvg}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 3v3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M7.5 21h9a1.5 1.5 0 001.5-1.5v-4.09a2 2 0 00-.586-1.414L13.5 9.5h-3l-4.914 4.496A2 2 0 005 15.41V19.5A1.5 1.5 0 006.5 21z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  },
  {
    name: 'Audit Logs',
    path: '/audit-logs',
    icon: (
      <svg
        className={styles.navSvg}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 9v4l2.5 2.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  },
  {
    name: 'Settings',
    path: '/settings',
    icon: (
      <svg
        className={styles.navSvg}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M19.4 15a1.5 1.5 0 010 1.5l-1.1 1.905a1.5 1.5 0 01-1.3.75h-1.8a1.5 1.5 0 00-1.412.99l-.568 1.62a1.5 1.5 0 01-1.42 1h-1.6a1.5 1.5 0 01-1.42-1l-.568-1.62A1.5 1.5 0 006.8 19.2H5a1.5 1.5 0 01-1.3-.75L2.6 16.5a1.5 1.5 0 010-1.5l1.1-1.905a1.5 1.5 0 000-1.5L2.6 9.69a1.5 1.5 0 010-1.5L3.7 6.285A1.5 1.5 0 015 5.535h1.8a1.5 1.5 0 001.412-.99l.568-1.62A1.5 1.5 0 0110.2 2h1.6a1.5 1.5 0 011.42 1l.568 1.62A1.5 1.5 0 0015.6 5.53H17.4a1.5 1.5 0 011.3.75l1.1 1.905a1.5 1.5 0 010 1.5l-1.1 1.905a1.5 1.5 0 000 1.5L19.4 15z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
];

const Sidebar = () => {
  const location = useLocation();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.brandBadge}>
          TA
        </div>
        <div className={styles.brandMeta}>
          <span>Tessaro</span>
          <p>Admin Console</p>
        </div>
      </div>

      <nav className={styles.nav}>
        {navigation.map((item) => {
          const active = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`${styles.navItem} ${active ? styles.navItemActive : ''}`.trim()}
            >
              <span
                className={`${styles.navIcon} ${active ? styles.navIconActive : ''}`.trim()}
              >
                {item.icon}
              </span>
              <span className={styles.navLabel}>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className={styles.statusCard}>
        <p className={styles.statusTitle}>System Status</p>
        <p className={styles.statusCopy}>All services operational.</p>
        <span className={styles.statusBadge}>
          <span className={styles.statusIndicator} />
          Live
        </span>
      </div>
    </aside>
  );
};

export default Sidebar;
