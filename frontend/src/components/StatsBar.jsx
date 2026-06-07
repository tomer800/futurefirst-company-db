import styles from './StatsBar.module.css'

export default function StatsBar({ stats, searchActive, searchCount }) {
  if (!stats) return null

  const recentYears = stats.by_year?.filter(y => y.year >= 2023) || []
  const recentTotal = recentYears.reduce((s, y) => s + y.count, 0)

  return (
    <div className={styles.bar}>
      <div className={styles.stat}>
        <span className={styles.value}>{searchActive ? searchCount : stats.total}</span>
        <span className={styles.label}>{searchActive ? 'results' : 'companies'}</span>
      </div>
      {!searchActive && (
        <>
          <div className={styles.divider} />
          <div className={styles.stat}>
            <span className={styles.value}>{recentTotal}</span>
            <span className={styles.label}>founded 2023–2026</span>
          </div>
          <div className={styles.divider} />
          <div className={styles.stat}>
            <span className={styles.value}>{stats.by_domain?.length}</span>
            <span className={styles.label}>VC domains</span>
          </div>
          <div className={styles.divider} />
          {stats.by_year?.slice(-4).map(y => (
            <div key={y.year} className={styles.stat}>
              <span className={styles.value}>{y.count}</span>
              <span className={styles.label}>{Math.round(y.year)}</span>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
