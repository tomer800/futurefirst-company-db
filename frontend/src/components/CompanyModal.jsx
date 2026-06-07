import { useState, useEffect } from 'react'
import { api } from '../api.js'
import styles from './CompanyModal.module.css'

const enrichmentCache = {}

export default function CompanyModal({ company, onClose }) {
  const [enrichment, setEnrichment] = useState(company ? enrichmentCache[company.id] || null : null)
  const [enrichLoading, setEnrichLoading] = useState(false)

  useEffect(() => {
    if (company) setEnrichment(enrichmentCache[company.id] || null)
  }, [company?.id])

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
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

  async function loadEnrichment() {
    setEnrichLoading(true)
    try {
      const data = await api.enrich(company.id)
      enrichmentCache[company.id] = data
      setEnrichment(data)
    } catch (e) {
      setEnrichment({ error: 'Search failed. Please try again.' })
    }
    setEnrichLoading(false)
  }

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
            <div className={styles.ceo}>CEO: {company.ceo}</div>
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
