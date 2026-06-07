import styles from './CompanyCard.module.css'
import RadarBadge from './RadarBadge.jsx'
import CompanyLogo from './CompanyLogo.jsx'

const DOMAIN_COLORS = {
  'Healthcare & Life Sciences': '#10b981',
  'AI Infrastructure & Developer Tools': '#3b82f6',
  'Enterprise Software & AI': '#8b5cf6',
  'Cybersecurity': '#ef4444',
  'FinTech': '#f59e0b',
  'Climate & Energy': '#22c55e',
  'Consumer, Media & Entertainment': '#ec4899',
  'Agriculture & Food': '#84cc16',
  'Industrial & Manufacturing': '#64748b',
  'Mobility & Logistics': '#06b6d4',
  'Cloud Infrastructure & DevOps': '#6366f1',
  'Commerce & Retail': '#f97316',
  'Construction & Real Estate': '#a78bfa',
  'Defense, Aerospace & Dual-Use': '#94a3b8',
  'Education': '#fbbf24',
  'GovTech': '#4ade80',
  'LegalTech': '#818cf8',
}

function getDomainColor(domain) {
  return DOMAIN_COLORS[domain] || '#9999aa'
}

function formatRound(round) {
  if (!round) return null
  const map = {
    'Pre-Seed': 'Pre-Seed',
    'Seed Round': 'Seed',
    'Accelerator/lncubator': 'Accelerator',
    'A': 'Series A',
    'B': 'Series B',
    'Angel Round': 'Angel',
    'Early Stage VC': 'Early VC',
    'Grant': 'Grant',
  }
  return map[round] || round
}

export default function CompanyCard({ company, onClick }) {
  const color = getDomainColor(company.vc_domain)
  const round = formatRound(company.round_type)

  return (
    <article className={styles.card} onClick={() => onClick(company)}>
      <div className={styles.top}>
        <div className={styles.nameRow}>
          <div className={styles.nameLeft}>
            <CompanyLogo website={company.website} name={company.name} size="sm" />
            <h3 className={styles.name}>{company.name}</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {company.radar_tier >= 2 && <RadarBadge score={company.radar_score} tier={company.radar_tier} />}
            {company.year && <span className={styles.year}>{Math.round(company.year)}</span>}
          </div>
        </div>
        <div className={styles.domains}>
          <span className={styles.domain} style={{ color, borderColor: `${color}30`, background: `${color}10` }}>
            {company.vc_domain}
          </span>
          {company.vc_subdomain && (
            <span className={styles.subdomain}>{company.vc_subdomain}</span>
          )}
        </div>
      </div>

      <p className={styles.blurb}>{company.blurb}</p>

      <div className={styles.footer}>
        <div className={styles.footerLeft}>
          {round && <span className={styles.round}>{round}</span>}
          {company.investors && (
            <span className={styles.investors} title={company.investors}>
              {company.investors.split(',').slice(0, 2).join(', ')}
              {company.investors.split(',').length > 2 ? ` +${company.investors.split(',').length - 2}` : ''}
            </span>
          )}
        </div>
        {company.website && (
          <a
            className={styles.website}
            href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
            target="_blank"
            rel="noreferrer"
            onClick={e => e.stopPropagation()}
          >
            ↗
          </a>
        )}
      </div>
    </article>
  )
}
