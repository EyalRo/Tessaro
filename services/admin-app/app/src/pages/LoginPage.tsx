import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import styles from './LoginPage.module.css';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error, clearError } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = await login({ email, password });
    if (user) {
      navigate('/');
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.background}>
        <div className={styles.backgroundPrimary} />
        <div className={styles.backgroundSecondary} />
      </div>

      <div className={styles.card}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>TA</div>
          <h2 className={styles.brandTitle}>Tessaro Admin Portal</h2>
          <p className={styles.brandSubtitle}>Sign in to orchestrate organizations, services, and access.</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formFields}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="email-address">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  if (error) {
                    clearError();
                  }
                  setEmail(e.target.value);
                }}
                className={styles.input}
                placeholder="admin@example.com"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => {
                  if (error) {
                    clearError();
                  }
                  setPassword(e.target.value);
                }}
                className={styles.input}
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button type="submit" disabled={loading} className={styles.submitButton}>
            <span className={styles.submitHighlight} />
            <span className={styles.submitLabel}>{loading ? 'Signing in…' : 'Sign in'}</span>
          </button>
        </form>

        <div className={styles.demoNote}>
          Demo credentials: <span className={styles.demoStrong}>admin@example.com</span> /{' '}
          <span className={styles.demoStrong}>password</span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
