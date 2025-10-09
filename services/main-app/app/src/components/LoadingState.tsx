import React from 'react';
import styles from './LoadingState.module.css';

const LoadingState: React.FC<{ label?: string }> = ({ label = 'Loading...' }) => {
  return (
    <div className={styles.loading} role="status" aria-live="polite">
      <span className={styles.spinner} />
      <span>{label}</span>
    </div>
  );
};

export default LoadingState;
