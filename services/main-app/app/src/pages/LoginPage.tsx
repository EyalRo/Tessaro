import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import styles from './LoginPage.module.css';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, loading, error, clearError } = useAuth();
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('admin');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setFormError('Email and password are required.');
      return;
    }

    setFormError(null);
    const user = await login({ email: email.trim(), password });
    if (user) {
      navigate('/organizations', { replace: true });
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <p className={styles.tag}>Welcome</p>
        <h1 className={styles.title}>Access your Tessaro workspace</h1>
        <p className={styles.subtitle}>
          Sign in to choose an organization and explore its services.
        </p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.label} htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className={styles.input}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />

          <label className={styles.label} htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            className={styles.input}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />

          {(formError || error) && (
            <div className={styles.error} role="alert">
              {formError || error}
            </div>
          )}

          <button className={styles.submitButton} type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className={styles.helper}>
          Try <span>admin@example.com / admin</span> or <span>owner@example.com / owner</span>.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
