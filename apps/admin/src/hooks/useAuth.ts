import React, { useState, useCallback } from 'react';

interface AuthState {
  isAuthenticated: boolean;
  user: { id: string; email: string; name: string; role: string } | null;
  loading: boolean;
  error: string | null;
}

const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    loading: false,
    error: null
  });

  const login = useCallback(async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock validation
      if (email === 'admin@example.com' && password === 'password') {
        const user = { id: '1', email, name: 'Admin User', role: 'Administrator' };
        setAuthState({
          isAuthenticated: true,
          user,
          loading: false,
          error: null
        });
        // Save to localStorage for persistence
        localStorage.setItem('adminUser', JSON.stringify(user));
        return user;
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setAuthState({
        isAuthenticated: false,
        user: null,
        loading: false,
        error: errorMessage
      });
      return null;
    }
  }, []);

  const logout = useCallback(() => {
    setAuthState({
      isAuthenticated: false,
      user: null,
      loading: false,
      error: null
    });
    localStorage.removeItem('adminUser');
  }, []);

  const checkAuthStatus = useCallback(() => {
    const savedUser = localStorage.getItem('adminUser');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setAuthState({
          isAuthenticated: true,
          user,
          loading: false,
          error: null
        });
        return user;
      } catch (error) {
        localStorage.removeItem('adminUser');
      }
    }
    return null;
  }, []);

  return {
    ...authState,
    login,
    logout,
    checkAuthStatus
  };
};

export default useAuth;
