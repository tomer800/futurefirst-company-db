import styles from './RadarBadge.module.css'

const TIER_CONFIG = {
  3: { label: 'Strong Match', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', icon: '✦✦✦' },
  2: { label: 'Worth Tracking', color: '#c9a84c', bg: 'rgba(201,168,76,0.12)', border: 'rgba(201,168,76,0.3)', icon: '✦✦' },
  1: { label: 'Adjacent', color: '#6b7280', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.2)', icon: '✦' },
  0: { label: 'Not Aligned', color: '#4b5563', bg: 'transparent', border: 'transparent', icon: '' },
}

export default function RadarBadge({ score, tier, size = 'sm' }) {
  if (tier === undefined || tier === null || tier === 0) return null
  const cfg = TIER_CONFIG[tier] || TIER_CONFIG[1]

  return (
    <div
      className={`${styles.badge} ${size === 'lg' ? styles.lg : ''}`}
      style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}
      title={`FF Deal Radar: ${cfg.label} (${score}/100)`}
    >
      <span className={styles.icon}>{cfg.icon}</span>
      <span className={styles.score}>{score}</span>
      {size === 'lg' && <span className={styles.label}>{cfg.label}</span>}
    </div>
  )
}
