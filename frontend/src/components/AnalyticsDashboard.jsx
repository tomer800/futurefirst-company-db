import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from 'recharts'
import styles from './AnalyticsDashboard.module.css'

const DOMAIN_COLORS = [
  '#c9a84c','#3b82f6','#10b981','#ef4444','#8b5cf6',
  '#f59e0b','#06b6d4','#ec4899','#22c55e','#f97316',
  '#6366f1','#84cc16','#64748b','#a78bfa','#94a3b8',
  '#fbbf24','#4ade80','#818cf8','#34d399','#fb923c',
  '#e879f9',
]

const YEAR_COLORS = { '2023': '#6366f1', '2024': '#3b82f6', '2025': '#c9a84c', '2026': '#22c55e' }
const RADAR_COLORS = { 3: '#22c55e', 2: '#c9a84c', 1: '#6b7280', 0: '#374151' }

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'#1a1a1e', border:'1px solid #2a2a30', borderRadius:8, padding:'8px 14px' }}>
      {label && <div style={{ color:'#f0f0f2', fontSize:12, fontWeight:600, marginBottom:4 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || '#c9a84c', fontSize:12 }}>
          {p.name ? `${p.name}: ` : ''}{p.value}
        </div>
      ))}
    </div>
  )
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'#1a1a1e', border:'1px solid #2a2a30', borderRadius:8, padding:'8px 14px' }}>
      <div style={{ color:'#f0f0f2', fontSize:12, fontWeight:600 }}>{payload[0].name}</div>
      <div style={{ color:'#c9a84c', fontSize:12 }}>{payload[0].value} companies</div>
    </div>
  )
}

export default function AnalyticsDashboard({ stats, onBrowse }) {
  const [extended, setExtended] = useState(null)

  useEffect(() => {
    fetch('/api/stats/extended').then(r => r.json()).then(setExtended)
  }, [])

  if (!stats) return <div className={styles.loading}><div className="spinner" /></div>

  const domainData = stats.by_domain?.slice(0, 12).map(d => ({
    name: d.vc_domain?.replace(' & ', ' &\n') || '',
    count: d.count,
  })) || []

  const yearData = stats.by_year?.filter(y => y.year >= 2022).map(y => ({
    name: Math.round(y.year).toString(),
    count: y.count,
  })) || []

  const roundData = stats.by_round?.slice(0, 7).map(r => ({
    name: r.round_type === 'Accelerator/lncubator' ? 'Accelerator' : r.round_type,
    value: r.count,
  })) || []

  const totalRecent = stats.by_year?.filter(y => y.year >= 2023).reduce((s, y) => s + y.count, 0) || 0

  return (
    <div className={styles.page}>
      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <img src="/assets-static/logo_white.png" alt="FutureFirst Ventures" className={styles.heroLogo} />
          <h1 className={styles.heroTitle}>Vertical AI Companies Database</h1>
          <p className={styles.heroSub}>Israeli ecosystem · 2023–2026 · {stats.total} companies tracked</p>
          <button className={styles.browseBtn} onClick={onBrowse}>Browse Companies ↗</button>
        </div>
      </div>

      {/* KPIs */}
      <div className={styles.kpis}>
        <div className={styles.kpi}><div className={styles.kpiValue}>{stats.total}</div><div className={styles.kpiLabel}>Total Companies</div></div>
        <div className={styles.kpiDivider} />
        <div className={styles.kpi}><div className={styles.kpiValue}>{totalRecent}</div><div className={styles.kpiLabel}>Founded 2023–2026</div></div>
        <div className={styles.kpiDivider} />
        <div className={styles.kpi}><div className={styles.kpiValue}>{stats.by_domain?.length}</div><div className={styles.kpiLabel}>VC Domains</div></div>
        <div className={styles.kpiDivider} />
        <div className={styles.kpi}><div className={styles.kpiValue}>{stats.by_year?.find(y => y.year === 2025)?.count || 0}</div><div className={styles.kpiLabel}>Founded in 2025</div></div>
        <div className={styles.kpiDivider} />
        <div className={styles.kpi}><div className={styles.kpiValue}>{stats.by_year?.find(y => y.year === 2024)?.count || 0}</div><div className={styles.kpiLabel}>Founded in 2024</div></div>
        <div className={styles.kpiDivider} />
        <div className={styles.kpi}>
          <div className={styles.kpiValue} style={{ color: '#22c55e' }}>
            {extended?.radar_distribution?.find(r => r.radar_tier === 3)?.count || '—'}
          </div>
          <div className={styles.kpiLabel}>FF Strong Matches</div>
        </div>
      </div>

      {/* Row 1 */}
      <div className={styles.charts}>
        <div className={styles.chartCard} style={{ gridColumn: 'span 2' }}>
          <div className={styles.chartTitle}>Companies by VC Domain</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={domainData} margin={{ top:4, right:16, bottom:80, left:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a30" vertical={false} />
              <XAxis dataKey="name" tick={{ fill:'#9999aa', fontSize:11 }} angle={-38} textAnchor="end" interval={0} />
              <YAxis tick={{ fill:'#9999aa', fontSize:11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill:'rgba(201,168,76,0.06)' }} />
              <Bar dataKey="count" radius={[4,4,0,0]}>
                {domainData.map((_, i) => <Cell key={i} fill={DOMAIN_COLORS[i % DOMAIN_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>Companies by Year Founded</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={yearData} margin={{ top:4, right:16, bottom:8, left:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a30" vertical={false} />
              <XAxis dataKey="name" tick={{ fill:'#9999aa', fontSize:12 }} axisLine={false} />
              <YAxis tick={{ fill:'#9999aa', fontSize:11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="count" stroke="#c9a84c" strokeWidth={2.5} dot={{ fill:'#c9a84c', r:5 }} activeDot={{ r:7 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2 */}
      <div className={styles.charts}>
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>Round Type Distribution</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={roundData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                {roundData.map((_, i) => <Cell key={i} fill={DOMAIN_COLORS[i % DOMAIN_COLORS.length]} />)}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className={styles.legend}>
            {roundData.map((r, i) => (
              <div key={r.name} className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: DOMAIN_COLORS[i] }} />
                <span className={styles.legendLabel}>{r.name}</span>
                <span className={styles.legendVal}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>FF Deal Radar — Thesis Fit</div>
          {extended?.radar_distribution ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={extended.radar_distribution.map(r => ({ name: r.radar_label, value: r.count }))}
                    cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value"
                  >
                    {extended.radar_distribution.map((r, i) => (
                      <Cell key={i} fill={RADAR_COLORS[r.radar_tier] || '#6b7280'} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className={styles.legend}>
                {extended.radar_distribution.map((r) => (
                  <div key={r.radar_tier} className={styles.legendItem}>
                    <span className={styles.legendDot} style={{ background: RADAR_COLORS[r.radar_tier] }} />
                    <span className={styles.legendLabel}>{r.radar_label}</span>
                    <span className={styles.legendVal}>{r.count}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <div className={styles.loading}><div className="spinner" /></div>}
        </div>

        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>Top 12 Investors by Deal Count</div>
          {extended?.top_investors ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={extended.top_investors} layout="vertical" margin={{ top:0, right:40, bottom:0, left:0 }}>
                <XAxis type="number" tick={{ fill:'#9999aa', fontSize:10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill:'#9999aa', fontSize:10 }} width={160} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill:'rgba(201,168,76,0.06)' }} />
                <Bar dataKey="count" radius={[0,4,4,0]}>
                  {extended.top_investors.map((_, i) => <Cell key={i} fill={DOMAIN_COLORS[i % DOMAIN_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className={styles.loading}><div className="spinner" /></div>}
        </div>
      </div>

      {/* Row 3 */}
      <div className={styles.charts}>
        <div className={styles.chartCard} style={{ gridColumn: 'span 2' }}>
          <div className={styles.chartTitle}>Domain Growth by Year (2023–2026)</div>
          {extended?.domain_growth ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={extended.domain_growth} margin={{ top:4, right:16, bottom:80, left:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a30" vertical={false} />
                <XAxis dataKey="domain" tick={{ fill:'#9999aa', fontSize:11 }} angle={-35} textAnchor="end" interval={0} />
                <YAxis tick={{ fill:'#9999aa', fontSize:11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill:'rgba(201,168,76,0.06)' }} />
                <Legend wrapperStyle={{ paddingTop: 80, fontSize: 11 }} />
                <Bar dataKey="2023" stackId="a" fill={YEAR_COLORS['2023']} name="2023" />
                <Bar dataKey="2024" stackId="a" fill={YEAR_COLORS['2024']} name="2024" />
                <Bar dataKey="2025" stackId="a" fill={YEAR_COLORS['2025']} name="2025" />
                <Bar dataKey="2026" stackId="a" fill={YEAR_COLORS['2026']} name="2026" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className={styles.loading}><div className="spinner" /></div>}
        </div>

        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>Funding Stage Trend by Year</div>
          {extended?.stage_by_year ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={extended.stage_by_year} margin={{ top:4, right:16, bottom:20, left:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a30" vertical={false} />
                <XAxis dataKey="stage" tick={{ fill:'#9999aa', fontSize:10 }} angle={-30} textAnchor="end" interval={0} />
                <YAxis tick={{ fill:'#9999aa', fontSize:11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill:'rgba(201,168,76,0.06)' }} />
                <Legend wrapperStyle={{ paddingTop: 40, fontSize: 11 }} />
                <Bar dataKey="2023" fill={YEAR_COLORS['2023']} name="2023" radius={[2,2,0,0]} />
                <Bar dataKey="2024" fill={YEAR_COLORS['2024']} name="2024" radius={[2,2,0,0]} />
                <Bar dataKey="2025" fill={YEAR_COLORS['2025']} name="2025" radius={[2,2,0,0]} />
                <Bar dataKey="2026" fill={YEAR_COLORS['2026']} name="2026" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className={styles.loading}><div className="spinner" /></div>}
        </div>
      </div>

      {/* Domain breakdown */}
      <div className={styles.charts}>
        <div className={styles.chartCard} style={{ gridColumn: 'span 3' }}>
          <div className={styles.chartTitle}>Full Domain Breakdown</div>
          <div className={styles.domainGrid}>
            {stats.by_domain?.slice(0, 14).map((d, i) => {
              const pct = Math.round((d.count / stats.total) * 100)
              return (
                <div key={d.vc_domain} className={styles.domainRow}>
                  <div className={styles.domainName}>{d.vc_domain}</div>
                  <div className={styles.domainBar}>
                    <div className={styles.domainFill} style={{ width:`${pct}%`, background: DOMAIN_COLORS[i] }} />
                  </div>
                  <div className={styles.domainCount}>{d.count}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <button className={styles.browseBtn2} onClick={onBrowse}>✦ Browse All Companies</button>
      </div>
    </div>
  )
}
