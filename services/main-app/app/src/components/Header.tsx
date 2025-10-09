import React from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { useOrganizationContext } from '../contexts/OrganizationContext';
import styles from './Header.module.css';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { organization, clearOrganization } = useOrganizationContext();

  const handleLogout = async () => {
    await logout();
    clearOrganization();
    navigate('/login', { replace: true });
  };

  const handleSwitchOrganization = () => {
    clearOrganization();
    navigate('/organizations');
  };

  return (
    <header className={styles.header}>
      <div className={styles.branding}>
        <span className={styles.dot} />
        <span className={styles.title}>Tessaro</span>
      </div>
      <div className={styles.meta}>
        {organization && (
          <button
            type="button"
            className={styles.organizationButton}
            onClick={handleSwitchOrganization}
          >
            <span className={styles.organizationLabel}>Organization</span>
            <span className={styles.organizationName}>{organization.name}</span>
          </button>
        )}
        {user && (
          <div className={styles.userBadge}>
            <span className={styles.userName}>{user.name}</span>
            <span className={styles.userEmail}>{user.email}</span>
          </div>
        )}
        <button type="button" className={styles.logoutButton} onClick={handleLogout}>
          Log out
        </button>
      </div>
    </header>
  );
};

export default Header;
