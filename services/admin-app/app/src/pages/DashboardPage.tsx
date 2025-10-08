import React from 'react';
import styles from './DashboardPage.module.css';

const stats = [
  { label: 'Active Users', value: '1,284', change: '+12.1%' },
  { label: 'Organizations', value: '86', change: '+4 this week' },
  { label: 'Services Online', value: '12', change: '100% uptime' },
  { label: 'Open Incidents', value: '0', change: 'Stable' }
];

const activity = [
  { title: 'New organization onboarded', actor: 'Atlas Labs', time: '2m ago' },
  { title: 'Admin access granted', actor: 'jamie@tessaro', time: '28m ago' },
  { title: 'Service deploy promoted', actor: 'Realtime Events', time: '1h ago' }
];

const healthChecks = [
  { name: 'Authentication', status: 'Operational' },
  { name: 'Cassandra Cluster', status: 'Operational' },
  { name: 'File Storage', status: 'Operational' }
];

const DashboardPage: React.FC = () => {
  return (
    <section className={styles.dashboard}>
      <div className={styles.header}>
        <div className={styles.headerGroup}>
          <p className={styles.headerTag}>Overview</p>
          <h1 className={styles.headerTitle}>Welcome back, Admin</h1>
          <p className={styles.headerSubtitle}>
            Here is a snapshot of Tessaro platform activity over the last 24 hours.
          </p>
        </div>
        <button
          className={styles.ctaButton}
          type="button"
        >
          <span className={styles.ctaIndicator} />
          Refresh Data
        </button>
      </div>

      <div className={styles.stats}>
        {stats.map((item) => (
          <div
            key={item.label}
            className={styles.statCard}
          >
            <p className={styles.statLabel}>{item.label}</p>
            <p className={styles.statValue}>{item.value}</p>
            <p className={styles.statChange}>{item.change}</p>
          </div>
        ))}
      </div>

      <div className={styles.chartsRow}>
        <div className={`${styles.chartCard} ${styles.chartCardWide}`.trim()}>
          <div className={styles.chartHeader}>
            <div>
              <h2 className={styles.chartTitle}>Platform Throughput</h2>
              <p className={styles.chartMeta}>Requests / 5 min</p>
            </div>
            <span className={styles.chartStatus}>Healthy</span>
          </div>
          <div className={styles.chartBars}>
            {[45, 52, 64, 60, 72, 80, 90, 96, 84, 88, 92, 120].map((value, idx) => (
              <div
                key={idx}
                className={styles.chartBar}
                style={{ height: `${value}%` }}
              />
            ))}
          </div>
          <p className={styles.chartNote}>Synthetic chart data illustrates relative load across the fleet.</p>
        </div>

        <div className={styles.sidebarColumn}>
          <div className={styles.activityCard}>
            <h2 className={styles.activityTitle}>Recent Activity</h2>
            <div className={styles.activityList}>
              {activity.map((item) => (
                <div key={item.title} className={styles.activityItem}>
                  <p className={styles.activityPrimary}>{item.title}</p>
                  <p className={styles.activitySecondary}>{item.actor}</p>
                  <p className={styles.activityTime}>{item.time}</p>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.healthCard}>
            <h2 className={styles.healthTitle}>System Health</h2>
            <div className={styles.healthList}>
              {healthChecks.map((item) => (
                <div key={item.name} className={styles.healthItem}>
                  <span className={styles.healthLabel}>{item.name}</span>
                  <span className={styles.healthBadge}>
                    <span className={styles.healthIndicator} />
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DashboardPage;
