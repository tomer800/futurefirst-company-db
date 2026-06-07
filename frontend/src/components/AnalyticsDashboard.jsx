import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts'
import styles from './AnalyticsDashboard.module.css'

const DOMAIN_COLORS = [
  '#c9a84c','#3b82f6','#10b981','#ef4444','#8b5cf6',
  '#f59e0b','#06b6d4','#ec4899','#22c55e','#f97316',
  '#6366f1','#84cc16','#64748b','#a78bfa','#94a3b8',
  '#fbbf24','#4ade80','#818cf8','#34d399','#fb923c',
  '#e879f9',
]

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div style={{ background:'#1a1a1e', border:'1px solid #2a2a30', borderRadius:8, padding:'8px 14px' }}>
        <div style={{ color:'#f0f0f2', fontSize:13, fontWeight:600 }}>{label}</div>
        <div style={{ color:'#c9a84c', fontSize:13 }}>{payload[0].value} companies</div>
      </div>
    )
  }
  return null
}

function PieTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    return (
      <div style={{ background:'#1a1a1e', border:'1px solid #2a2a30', borderRadius:8, padding:'8px 14px' }}>
        <div style={{ color:'#f0f0f2', fontSize:12, fontWeight:600 }}>{payload[0].name}</div>
        <div style={{ color:'#c9a84c', fontSize:12 }}>{payload[0].value} companies</div>
      </div>
    )
  }
  return null
}

export default function AnalyticsDashboard({ stats, onBrowse }) {
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
      <div className={styles.hero}>
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <img src="/assets-static/logo_white.png" alt="FutureFirst Ventures" className={styles.heroLogo} />
          <h1 className={styles.heroTitle}>Vertical AI Companies Database</h1>
          <p className={styles.heroSub}>Israeli ecosystem · 2023–2026 · {stats.total} companies tracked</p>
          <button className={styles.browseBtn} onClick={onBrowse}>
            Browse Companies ↗
          </button>
        </div>
      </div>

      <div className={styles.kpis}>
        <div className={styles.kpi}>
          <div className={styles.kpiValue}>{stats.total}</div>
          <div className={styles.kpiLabel}>Total Companies</div>
        </div>
        <div className={styles.kpiDivider} />
        <div className={styles.kpi}>
          <div className={styles.kpiValue}>{totalRecent}</div>
          <div className={styles.kpiLabel}>Founded 2023–2026</div>
        </div>
        <div className={styles.kpiDivider} />
        <div className={styles.kpi}>
          <div className={styles.kpiValue}>{stats.by_domain?.length}</div>
          <div className={styles.kpiLabel}>VC Domains</div>
        </div>
        <div className={styles.kpiDivider} />
        <div className={styles.kpi}>
          <div className={styles.kpiValue}>{stats.by_year?.filter(y => y.year === 2025)[0]?.count || 0}</div>
          <div className={styles.kpiLabel}>Founded in 2025</div>
        </div>
        <div className={styles.kpiDivider} />
        <div className={styles.kpi}>
          <div className={styles.kpiValue}>{stats.by_year?.filter(y => y.year === 2024)[0]?.count || 0}</div>
          <div className={styles.kpiLabel}>Founded in 2024</div>
        </div>
      </div>

      <div className={styles.charts}>

        <div className={styles.chartCard} style={{ gridColumn: 'span 2' }}>
          <div className={styles.chartTitle}>Companies by VC Domain</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={domainData} margin={{ top: 4, right: 16, bottom: 80, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a30" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: '#9999aa', fontSize: 11 }}
                angle={-38}
                textAnchor="end"
                interval={0}
              />
              <YAxis tick={{ fill: '#9999aa', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(201,168,76,0.06)' }} />
              <Bar dataKey="count" radius={[4,4,0,0]}>
                {domainData.map((_, i) => (
                  <Cell key={i} fill={DOMAIN_COLORS[i % DOMAIN_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>Companies by Year Founded</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={yearData} margin={{ top: 4, right: 16, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a30" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#9999aa', fontSize: 12 }} axisLine={false} />
              <YAxis tick={{ fill: '#9999aa', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#c9a84c', strokeWidth: 1 }} />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#c9a84c"
                strokeWidth={2.5}
                dot={{ fill: '#c9a84c', r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>Companies by Round Type</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={roundData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
              >
                {roundData.map((_, i) => (
                  <Cell key={i} fill={DOMAIN_COLORS[i % DOMAIN_COLORS.length]} />
                ))}
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

        <div className={styles.chartCard} style={{ gridColumn: 'span 3' }}>
          <div className={styles.chartTitle}>Top Domains Breakdown</div>
          <div className={styles.domainGrid}>
            {stats.by_domain?.slice(0, 12).map((d, i) => {
              const pct = Math.round((d.count / stats.total) * 100)
              return (
                <div key={d.vc_domain} className={styles.domainRow}>
                  <div className={styles.domainName}>{d.vc_domain}</div>
                  <div className={styles.domainBar}>
                    <div
                      className={styles.domainFill}
                      style={{ width: `${pct}%`, background: DOMAIN_COLORS[i] }}
                    />
                  </div>
                  <div className={styles.domainCount}>{d.count}</div>
                </div>
              )
            })}
          </div>
        </div>

      </div>

      <div className={styles.footer}>
        <button className={styles.browseBtn2} onClick={onBrowse}>
          ✦ Browse All Companies
        </button>
      </div>
    </div>
  )
}
