import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import styles from './AuthWrapper.module.scss';

const AuthWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, checkAuthStatus, loading } = useAuth();

  useEffect(() => {
    const user = checkAuthStatus();
    
    // Redirect to login if not authenticated and not already on login page
    if (!user && location.pathname !== '/login') {
      navigate('/login');
    }
  }, [checkAuthStatus, navigate, location.pathname]);

  // Show loading state while checking auth
  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  // If user is not authenticated and not on login page, don't render children
  if (!isAuthenticated && location.pathname !== '/login') {
    return null;
  }

  return <>{children}</>;
};

export default AuthWrapper;
