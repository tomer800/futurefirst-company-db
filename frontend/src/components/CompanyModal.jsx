import { useState, useEffect } from 'react'
import { api } from '../api.js'
import styles from './CompanyModal.module.css'

const enrichmentCache = {}
const founderCache = {}

const FOUNDER_TYPE_CONFIG = {
  serial:       { label: 'Serial Entrepreneur', color: '#22c55e', icon: '🔁' },
  'second-time':{ label: 'Second-time Founder', color: '#3b82f6', icon: '2️⃣' },
  'first-time': { label: 'First-time Founder',  color: '#9999aa', icon: '🆕' },
  unknown:      { label: 'Founder',              color: '#9999aa', icon: '👤' },
}

export default function CompanyModal({ company, onClose }) {
  const [enrichment, setEnrichment] = useState(company ? enrichmentCache[company.id] || null : null)
  const [enrichLoading, setEnrichLoading] = useState(false)
  const [founderData, setFounderData] = useState(company ? founderCache[company.id] || null : null)
  const [founderLoading, setFounderLoading] = useState(false)

  async function fetchEnrichment(c) {
    setEnrichLoading(true)
    try {
      const data = await api.enrich(c.id)
      enrichmentCache[c.id] = data
      setEnrichment(data)
    } catch (e) {
      setEnrichment({ error: 'Search failed. Please try again.' })
    }
    setEnrichLoading(false)
  }

  async function fetchFounder(c) {
    if (!c.ceo) return
    setFounderLoading(true)
    try {
      const res = await fetch(`/api/founder/${c.id}`)
      const data = await res.json()
      founderCache[c.id] = data
      setFounderData(data)
    } catch (e) {}
    setFounderLoading(false)
  }

  useEffect(() => {
    if (!company) return
    // Founder enrichment
    if (founderCache[company.id]) {
      setFounderData(founderCache[company.id])
    } else {
      setFounderData(null)
      fetchFounder(company)
    }
    // News enrichment
    if (enrichmentCache[company.id]) {
      setEnrichment(enrichmentCache[company.id])
    } else {
      setEnrichment(null)
      fetchEnrichment(company)
    }
  }, [company?.id])

  useEffect(() => {
    function handleKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  if (!company) return null

  const investors = company.investors
    ? company.investors.split(',').map(s => s.trim()).filter(Boolean)
    : []

  const verticals = company.verticals
    ? company.verticals.split(',').map(s => s.trim()).filter(Boolean)
    : []

  function loadEnrichment() { fetchEnrichment(company) }

  const websiteUrl = company.website
    ? (company.website.startsWith('http') ? company.website : `https://${company.website}`)
    : null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button className={styles.close} onClick={onClose}>✕</button>

        <div className={styles.header}>
          <div className={styles.headerTop}>
            <h2 className={styles.name}>{company.name}</h2>
            {company.year && (
              <span className={styles.year}>Est. {Math.round(company.year)}</span>
            )}
          </div>
          {company.ceo && (
            <div className={styles.ceoRow}>
              <div className={styles.ceo}>CEO: {company.ceo}</div>
              {founderLoading && <span className={styles.founderLoading}>🔍</span>}
              {founderData && !founderData.error && (() => {
                const cfg = FOUNDER_TYPE_CONFIG[founderData.founder_type] || FOUNDER_TYPE_CONFIG.unknown
                return (
                  <div className={styles.founderBadges}>
                    <span className={styles.founderBadge} style={{ color: cfg.color, borderColor: `${cfg.color}30`, background: `${cfg.color}10` }}>
                      {cfg.icon} {cfg.label}
                    </span>
                    {founderData.elite_unit === 1 && (
                      <span className={styles.founderBadge} style={{ color: '#f59e0b', borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.1)' }}>
                        🎖️ Elite Unit
                      </span>
                    )}
                  </div>
                )
              })()}
            </div>
          )}
          {founderData && !founderData.error && (founderData.linkedin_url || founderData.past_companies || founderData.education) && (
            <div className={styles.founderDetails}>
              {founderData.linkedin_url && (
                <a href={founderData.linkedin_url} target="_blank" rel="noreferrer" className={styles.linkedinLink}>
                  LinkedIn ↗
                </a>
              )}
              {founderData.past_companies && (
                <span className={styles.founderMeta}>Past: {founderData.past_companies}</span>
              )}
              {founderData.education && (
                <span className={styles.founderMeta}>🎓 {founderData.education}</span>
              )}
            </div>
          )}
          <div className={styles.tags}>
            {company.vc_domain && (
              <span className={styles.domain}>{company.vc_domain}</span>
            )}
            {company.vc_subdomain && (
              <span className={styles.subdomain}>{company.vc_subdomain}</span>
            )}
            {company.round_type && (
              <span className={styles.round}>{company.round_type}</span>
            )}
          </div>
        </div>

        <div className={styles.body}>
          {company.blurb && (
            <section className={styles.section}>
              <div className={styles.sectionLabel}>About</div>
              <p className={styles.blurb}>{company.blurb}</p>
            </section>
          )}

          {verticals.length > 0 && (
            <section className={styles.section}>
              <div className={styles.sectionLabel}>Verticals</div>
              <div className={styles.pills}>
                {verticals.map(v => (
                  <span key={v} className={styles.pill}>{v}</span>
                ))}
              </div>
            </section>
          )}

          {investors.length > 0 && (
            <section className={styles.section}>
              <div className={styles.sectionLabel}>Investors</div>
              <div className={styles.pills}>
                {investors.map(inv => (
                  <span key={inv} className={`${styles.pill} ${styles.investor}`}>{inv}</span>
                ))}
              </div>
            </section>
          )}

          {websiteUrl && (
            <section className={styles.section}>
              <div className={styles.sectionLabel}>Website</div>
              <a href={websiteUrl} target="_blank" rel="noreferrer" className={styles.websiteLink}>
                {company.website} ↗
              </a>
            </section>
          )}

          <section className={styles.enrichSection}>
            <div className={styles.enrichHeader}>
              <span className={styles.sectionLabel}>Google Enrichment</span>
              {!enrichment && (
                <button
                  className={styles.enrichBtn}
                  onClick={loadEnrichment}
                  disabled={enrichLoading}
                >
                  {enrichLoading ? 'Loading...' : '⚡ Fetch live data'}
                </button>
              )}
            </div>

            {enrichment?.error && (
              <p className={styles.enrichError}>{enrichment.error}</p>
            )}

            {enrichment?.search_results?.length > 0 && (
              <div className={styles.enrichResults}>
                <div className={styles.enrichSubLabel}>Web results</div>
                {enrichment.search_results.map((r, i) => (
                  <a key={i} href={r.link} target="_blank" rel="noreferrer" className={styles.enrichItem}>
                    <div className={styles.enrichTitle}>{r.title}</div>
                    <div className={styles.enrichSnippet}>{r.snippet}</div>
                    <div className={styles.enrichLink}>{r.link}</div>
                  </a>
                ))}
              </div>
            )}

            {enrichment?.news?.length > 0 && (
              <div className={styles.enrichResults}>
                <div className={styles.enrichSubLabel}>Latest news</div>
                {enrichment.news.map((r, i) => (
                  <a key={i} href={r.link} target="_blank" rel="noreferrer" className={styles.enrichItem}>
                    <div className={styles.enrichTitle}>{r.title}</div>
                    <div className={styles.enrichSnippet}>{r.snippet}</div>
                  </a>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
