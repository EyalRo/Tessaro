import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import styles from './AuthWrapper.module.css';

const AuthWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, initializing } = useAuth();

  useEffect(() => {
    if (initializing) {
      return;
    }

    if (!isAuthenticated && location.pathname !== '/login') {
      navigate('/login', { replace: true });
    }

    if (isAuthenticated && location.pathname === '/login') {
      navigate('/', { replace: true });
    }
  }, [initializing, isAuthenticated, location.pathname, navigate]);

  if (initializing) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!isAuthenticated && location.pathname !== '/login') {
    return null;
  }

  return <>{children}</>;
};

export default AuthWrapper;
