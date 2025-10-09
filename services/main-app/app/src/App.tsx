import React, { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { OrganizationProvider, useOrganizationContext } from './contexts/OrganizationContext';
import useAuth from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import OrganizationSelectPage from './pages/OrganizationSelectPage';
import ServicesPage from './pages/ServicesPage';
import Header from './components/Header';
import LoadingState from './components/LoadingState';
import styles from './App.module.css';

const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className={styles.container}>
      <Header />
      <div className={styles.content}>{children}</div>
    </div>
  );
};

const RouteSwitch: React.FC = () => {
  const { isAuthenticated, initializing } = useAuth();
  const { clearOrganization } = useOrganizationContext();

  useEffect(() => {
    if (!isAuthenticated) {
      clearOrganization();
    }
  }, [isAuthenticated, clearOrganization]);

  if (initializing) {
    return (
      <div className={styles.initializing}>
        <LoadingState label="Preparing Tessaro..." />
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/organizations" replace /> : <LoginPage />
        }
      />
      <Route
        path="/organizations"
        element={
          isAuthenticated
            ? (
              <AppShell>
                <OrganizationSelectPage />
              </AppShell>
            )
            : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/services"
        element={
          isAuthenticated
            ? (
              <AppShell>
                <ServicesPage />
              </AppShell>
            )
            : <Navigate to="/login" replace />
        }
      />
      <Route
        path="*"
        element={<Navigate to={isAuthenticated ? '/organizations' : '/login'} replace />}
      />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <OrganizationProvider>
        <BrowserRouter>
          <RouteSwitch />
        </BrowserRouter>
      </OrganizationProvider>
    </AuthProvider>
  );
};

export default App;
