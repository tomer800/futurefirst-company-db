import styles from './FilterPanel.module.css'

export default function FilterPanel({ filters, active, onChange, stats }) {
  if (!filters) return null

  const { domains, round_types, years } = filters

  function toggle(key, value) {
    onChange({ ...active, [key]: active[key] === value ? '' : value })
  }

  const activeCount = Object.values(active).filter(Boolean).length

  return (
    <aside className={styles.panel}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>Filters</span>
        {activeCount > 0 && (
          <button className={styles.clearAll} onClick={() => onChange({ domain: '', round_type: '', year_min: '', year_max: '' })}>
            Clear all
          </button>
        )}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>Year Founded</div>
        <div className={styles.yearRow}>
          <select
            className={styles.select}
            value={active.year_min || ''}
            onChange={e => onChange({ ...active, year_min: e.target.value })}
          >
            <option value="">From</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <span className={styles.yearDash}>—</span>
          <select
            className={styles.select}
            value={active.year_max || ''}
            onChange={e => onChange({ ...active, year_max: e.target.value })}
          >
            <option value="">To</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>VC Domain</div>
        <div className={styles.tagList}>
          {domains.map(d => {
            const count = stats?.by_domain?.find(s => s.vc_domain === d)?.count
            return (
              <button
                key={d}
                className={`${styles.tag} ${active.domain === d ? styles.tagActive : ''}`}
                onClick={() => toggle('domain', d)}
              >
                {d}
                {count && <span className={styles.tagCount}>{count}</span>}
              </button>
            )
          })}
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>Round Type</div>
        <div className={styles.tagList}>
          {round_types.map(r => (
            <button
              key={r}
              className={`${styles.tag} ${active.round_type === r ? styles.tagActive : ''}`}
              onClick={() => toggle('round_type', r)}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
    </aside>
  )
}
