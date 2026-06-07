import styles from './Header.module.css'

export default function Header({ stats, view, onViewChange }) {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <img src="/assets-static/logo_white.png" alt="FutureFirst Ventures" className={styles.logo} />
        <div className={styles.divider} />
        <span className={styles.title}>Vertical AI Companies Database</span>
      </div>
      <div className={styles.right}>
        <nav className={styles.nav}>
          <button className={`${styles.navBtn} ${view === 'analytics' ? styles.navActive : ''}`} onClick={() => onViewChange('analytics')}>Analytics</button>
          <button className={`${styles.navBtn} ${view === 'companies' ? styles.navActive : ''}`} onClick={() => onViewChange('companies')}>Companies</button>
          <button className={`${styles.navBtn} ${styles.radarBtn} ${view === 'radar' ? styles.navActive : ''}`} onClick={() => onViewChange('radar')}>◎ Deal Radar</button>
          <button className={`${styles.navBtn} ${styles.networkBtn} ${view === 'network' ? styles.navActive : ''}`} onClick={() => onViewChange('network')}>◈ Network</button>
        </nav>
        {stats && (
          <div className={styles.pill}>
            <span className={styles.star}>✦</span>
            {stats.total} companies
          </div>
        )}
        <a href="https://futurefirst.vc" target="_blank" rel="noreferrer" className={styles.link}>
          futurefirst.vc ↗
        </a>
      </div>
    </header>
  )
}
