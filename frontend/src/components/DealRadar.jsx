import { useState, useEffect } from 'react'
import { api } from '../api.js'
import RadarBadge from './RadarBadge.jsx'
import styles from './DealRadar.module.css'

const TIER_CONFIG = {
  3: { label: 'Strong Match', color: '#22c55e', desc: 'Core thesis fit — Vertical AI, regulated industry, right stage' },
  2: { label: 'Worth Tracking', color: '#c9a84c', desc: 'Adjacent to thesis — monitor for evolution' },
  1: { label: 'Adjacent', color: '#6b7280', desc: 'Some overlap — not a priority right now' },
}

function ScoreBar({ value, max = 100, color }) {
  return (
    <div style={{ background: '#2a2a30', borderRadius: 4, height: 6, overflow: 'hidden', flex: 1 }}>
      <div style={{ width: `${(value / max) * 100}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
    </div>
  )
}

function BreakdownRow({ label, value, max, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
      <span style={{ fontSize: 11, color: '#9999aa', width: 70, flexShrink: 0 }}>{label}</span>
      <ScoreBar value={value} max={max} color={color} />
      <span style={{ fontSize: 11, color: '#f0f0f2', width: 28, textAlign: 'right', flexShrink: 0 }}>{value}/{max}</span>
    </div>
  )
}

function CompanyRow({ company, onSelect }) {
  const tier = company.radar_tier
  const score = company.radar_score
  const colors = { 3: '#22c55e', 2: '#c9a84c', 1: '#6b7280' }
  const color = colors[tier] || '#6b7280'

  return (
    <div className={styles.row} onClick={() => onSelect(company)}>
      <div className={styles.rowLeft}>
        <div className={styles.scoreDot} style={{ background: color }}>
          {score}
        </div>
        <div className={styles.rowInfo}>
          <div className={styles.rowName}>{company.name}</div>
          <div className={styles.rowMeta}>
            <span>{company.vc_domain}</span>
            {company.vc_subdomain && <span className={styles.dot}>·</span>}
            {company.vc_subdomain && <span>{company.vc_subdomain}</span>}
          </div>
        </div>
      </div>
      <div className={styles.rowRight}>
        {company.round_type && <span className={styles.round}>{company.round_type}</span>}
        {company.year && <span className={styles.year}>{Math.round(company.year)}</span>}
        <RadarBadge score={score} tier={tier} />
      </div>
    </div>
  )
}

function RadarModal({ company, onClose }) {
  const [breakdown, setBreakdown] = useState(null)

  useEffect(() => {
    if (!company) return
    fetch(`/api/radar/score/${company.id}`).then(r => r.json()).then(setBreakdown)
  }, [company?.id])

  useEffect(() => {
    const fn = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  if (!company) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>✕</button>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalName}>{company.name}</h3>
          {breakdown && <RadarBadge score={breakdown.score} tier={company.radar_tier} size="lg" />}
        </div>

        <div className={styles.modalDomain}>{company.vc_domain} · {company.vc_subdomain}</div>

        {breakdown?.breakdown && (
          <div className={styles.breakdown}>
            <div className={styles.breakdownTitle}>Score Breakdown</div>
            <BreakdownRow label="Domain fit" value={breakdown.breakdown.domain} max={30} color="#3b82f6" />
            <BreakdownRow label="Stage" value={breakdown.breakdown.stage} max={25} color="#c9a84c" />
            <BreakdownRow label="Keywords" value={breakdown.breakdown.keywords} max={35} color="#22c55e" />
            <BreakdownRow label="Year" value={breakdown.breakdown.year} max={10} color="#8b5cf6" />
            <div className={styles.totalRow}>
              <span>Total</span>
              <span style={{ color: '#f0f0f2', fontWeight: 700 }}>{breakdown.score}/100</span>
            </div>
          </div>
        )}

        {company.blurb && (
          <div className={styles.blurb}>{company.blurb}</div>
        )}

        <div className={styles.modalMeta}>
          {company.round_type && <span className={styles.metaTag}>{company.round_type}</span>}
          {company.year && <span className={styles.metaTag}>Est. {Math.round(company.year)}</span>}
          {company.website && (
            <a href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
              target="_blank" rel="noreferrer" className={styles.metaLink}>
              {company.website} ↗
            </a>
          )}
        </div>

        {company.investors && (
          <div className={styles.investors}>
            <div className={styles.investorsLabel}>Investors</div>
            <div className={styles.investorsList}>
              {company.investors.split(',').map(i => i.trim()).filter(Boolean).map(inv => (
                <span key={inv} className={styles.investorTag}>{inv}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function DealRadar() {
  const [radarStats, setRadarStats] = useState(null)
  const [activeTier, setActiveTier] = useState(3)
  const [companies, setCompanies] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    fetch('/api/radar/stats').then(r => r.json()).then(setRadarStats)
  }, [])

  useEffect(() => {
    setLoading(true)
    fetch(`/api/radar?tier=${activeTier}&limit=100`)
      .then(r => r.json())
      .then(data => {
        setCompanies(data.companies)
        setTotal(data.total)
        setLoading(false)
      })
  }, [activeTier])

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.radarIcon}>◎</div>
          <div>
            <h2 className={styles.title}>Deal Radar</h2>
            <p className={styles.subtitle}>Companies scored against the FutureFirst thesis</p>
          </div>
        </div>
        <div className={styles.legend}>
          <div className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: '#22c55e' }} />
            <span>Strong Match · 78-100</span>
          </div>
          <div className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: '#c9a84c' }} />
            <span>Worth Tracking · 58-77</span>
          </div>
          <div className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: '#6b7280' }} />
            <span>Adjacent · 38-57</span>
          </div>
        </div>
      </div>

      <div className={styles.kpis}>
        {radarStats?.tiers?.filter(t => t.radar_tier > 0).map(t => {
          const cfg = TIER_CONFIG[t.radar_tier]
          return (
            <button
              key={t.radar_tier}
              className={`${styles.kpi} ${activeTier === t.radar_tier ? styles.kpiActive : ''}`}
              style={activeTier === t.radar_tier ? { borderColor: cfg.color, background: `${cfg.color}10` } : {}}
              onClick={() => setActiveTier(t.radar_tier)}
            >
              <div className={styles.kpiValue} style={{ color: cfg.color }}>{t.count}</div>
              <div className={styles.kpiLabel}>{cfg.label}</div>
              <div className={styles.kpiDesc}>{cfg.desc}</div>
            </button>
          )
        })}
      </div>

      <div className={styles.scoring}>
        <div className={styles.scoringTitle}>How we score</div>
        <div className={styles.scoringGrid}>
          <div className={styles.scoringItem}><span style={{ color: '#3b82f6' }}>Domain fit</span> /30 — AI Infra + financial subdomain = 30, FinTech = 28, Healthcare/Legal = 22, others 0-10</div>
          <div className={styles.scoringItem}><span style={{ color: '#c9a84c' }}>Stage</span> /25 — Seed & Pre-Seed = 25, Series A = 5, Series B+ = 0</div>
          <div className={styles.scoringItem}><span style={{ color: '#22c55e' }}>Keywords</span> /35 — regulated, compliance, banking, insurance, clinical, AI-native, enterprise</div>
          <div className={styles.scoringItem}><span style={{ color: '#8b5cf6' }}>Year</span> /10 — 2024+ = 10, 2023 = 8, 2022 = 4, earlier = 0-2</div>
        </div>
      </div>

      <div className={styles.list}>
        <div className={styles.listHeader}>
          <span>{total} companies · sorted by score</span>
        </div>
        {loading ? (
          <div className={styles.center}><div className="spinner" /></div>
        ) : (
          companies.map(c => (
            <CompanyRow key={c.id} company={c} onSelect={setSelected} />
          ))
        )}
      </div>

      <RadarModal company={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
