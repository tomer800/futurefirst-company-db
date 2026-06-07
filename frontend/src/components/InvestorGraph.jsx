import { useEffect, useRef, useState, useCallback } from 'react'
import styles from './InvestorGraph.module.css'

const d3 = window.d3

const DOMAIN_OPTIONS = [
  'All domains',
  'AI Infrastructure & Developer Tools',
  'Enterprise Software & AI',
  'Healthcare & Life Sciences',
  'FinTech',
  'Cybersecurity',
  'LegalTech',
  'Cloud Infrastructure & DevOps',
]

function InvestorPanel({ investor, onClose }) {
  if (!investor) return null
  const domainEntries = Object.entries(investor.domains).sort((a, b) => b[1] - a[1])
  return (
    <div className={styles.panel}>
      <button className={styles.panelClose} onClick={onClose}>✕</button>
      <div className={styles.panelName}>{investor.id}</div>
      <div className={styles.panelDeals}>
        <span className={styles.panelDealsNum}>{investor.deals}</span> investments
      </div>
      <div className={styles.panelDot} style={{ background: investor.color }} />

      <div className={styles.panelSection}>
        <div className={styles.panelLabel}>Domains</div>
        {domainEntries.map(([domain, count]) => (
          <div key={domain} className={styles.panelDomainRow}>
            <span className={styles.panelDomainName}>{domain}</span>
            <span className={styles.panelDomainCount}>{count}</span>
          </div>
        ))}
      </div>

      {investor.companies?.length > 0 && (
        <div className={styles.panelSection}>
          <div className={styles.panelLabel}>Portfolio ({investor.companies.length})</div>
          <div className={styles.panelCompanies}>
            {investor.companies.map(c => (
              <div key={c.id} className={styles.panelCompany}>
                <span className={styles.panelCompanyName}>{c.name}</span>
                <span className={styles.panelCompanyDomain}>{c.domain}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function InvestorGraph() {
  const svgRef = useRef()
  const containerRef = useRef()
  const simulationRef = useRef()
  const [networkData, setNetworkData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [minDeals, setMinDeals] = useState(3)
  const [minEdge, setMinEdge] = useState(2)
  const [domainFilter, setDomainFilter] = useState('All domains')
  const [search, setSearch] = useState('')
  const [stats, setStats] = useState(null)

  const fetchNetwork = useCallback(async () => {
    setLoading(true)
    setSelected(null)
    const domain = domainFilter !== 'All domains' ? `&domain=${encodeURIComponent(domainFilter)}` : ''
    const res = await fetch(`/api/investors/network?min_deals=${minDeals}&min_edge_weight=${minEdge}${domain}`)
    const data = await res.json()
    setNetworkData(data)
    setStats(data.stats)
    setLoading(false)
  }, [minDeals, minEdge, domainFilter])

  useEffect(() => { fetchNetwork() }, [fetchNetwork])

  useEffect(() => {
    if (!networkData || loading) return
    drawGraph(networkData)
  }, [networkData, loading])

  function drawGraph(data) {
    const container = containerRef.current
    if (!container) return
    const width = container.clientWidth
    const height = container.clientHeight || 620

    // Clear previous
    d3.select(svgRef.current).selectAll('*').remove()
    if (simulationRef.current) simulationRef.current.stop()

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)

    // Zoom
    const g = svg.append('g')
    svg.call(d3.zoom()
      .scaleExtent([0.2, 4])
      .on('zoom', e => g.attr('transform', e.transform))
    )

    // Scale node radius by deal count
    const maxDeals = d3.max(data.nodes, d => d.deals) || 1
    const rScale = d3.scaleSqrt().domain([1, maxDeals]).range([5, 28])

    // Scale edge width by weight
    const maxWeight = d3.max(data.edges, d => d.weight) || 1
    const wScale = d3.scaleLinear().domain([1, maxWeight]).range([0.5, 4])

    const nodes = data.nodes.map(d => ({ ...d }))
    const edges = data.edges.map(d => ({ ...d }))

    // Draw edges
    const link = g.append('g').selectAll('line')
      .data(edges)
      .join('line')
      .attr('stroke', '#2a2a38')
      .attr('stroke-width', d => wScale(d.weight))
      .attr('stroke-opacity', 0.6)

    // Draw nodes
    const node = g.append('g').selectAll('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(d3.drag()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart()
          d.fx = d.x; d.fy = d.y
        })
        .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0)
          d.fx = null; d.fy = null
        })
      )
      .on('click', (event, d) => {
        event.stopPropagation()
        setSelected(d)
      })

    // Circle
    node.append('circle')
      .attr('r', d => rScale(d.deals))
      .attr('fill', d => d.color)
      .attr('fill-opacity', 0.85)
      .attr('stroke', d => d.color)
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.4)

    // Label (only for bigger nodes)
    node.filter(d => d.deals >= 4)
      .append('text')
      .text(d => d.id.length > 18 ? d.id.slice(0, 16) + '…' : d.id)
      .attr('text-anchor', 'middle')
      .attr('dy', d => rScale(d.deals) + 10)
      .attr('font-size', d => Math.min(10, 7 + d.deals * 0.3))
      .attr('fill', '#9999aa')
      .attr('pointer-events', 'none')

    // Tooltip
    const tooltip = d3.select('body').select('#inv-tooltip').node()
      ? d3.select('#inv-tooltip')
      : d3.select('body').append('div').attr('id', 'inv-tooltip')
          .style('position', 'fixed').style('background', '#1a1a1e')
          .style('border', '1px solid #2a2a30').style('border-radius', '8px')
          .style('padding', '8px 12px').style('pointer-events', 'none')
          .style('font-size', '12px').style('color', '#f0f0f2')
          .style('z-index', '9999').style('display', 'none')

    node
      .on('mouseenter', (event, d) => {
        tooltip.style('display', 'block')
          .html(`<strong>${d.id}</strong><br/>${d.deals} investments<br/>${d.primary_domain}`)
      })
      .on('mousemove', event => {
        tooltip.style('left', (event.clientX + 14) + 'px').style('top', (event.clientY - 28) + 'px')
      })
      .on('mouseleave', () => tooltip.style('display', 'none'))

    // Simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(edges).id(d => d.id).strength(0.3).distance(d => 80 / d.weight))
      .force('charge', d3.forceManyBody().strength(d => -80 - d.deals * 8))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => rScale(d.deals) + 4))

    simulationRef.current = simulation

    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y)
      node.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    // Click background to deselect
    svg.on('click', () => setSelected(null))
  }

  const filteredStats = networkData ? {
    nodes: networkData.nodes.filter(n =>
      !search || n.id.toLowerCase().includes(search.toLowerCase())
    )
  } : null

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.icon}>◈</div>
          <div>
            <h2 className={styles.title}>Investor Network</h2>
            <p className={styles.subtitle}>Co-investment relationships across the Israeli ecosystem</p>
          </div>
        </div>
        {stats && (
          <div className={styles.headerStats}>
            <div className={styles.stat}><span className={styles.statVal}>{stats.total_investors}</span><span className={styles.statLabel}>investors</span></div>
            <div className={styles.statDiv} />
            <div className={styles.stat}><span className={styles.statVal}>{stats.total_edges}</span><span className={styles.statLabel}>connections</span></div>
            <div className={styles.statDiv} />
            <div className={styles.stat}><span className={styles.statVal}>{stats.total_deals_tracked}</span><span className={styles.statLabel}>companies tracked</span></div>
          </div>
        )}
      </div>

      <div className={styles.controls}>
        <div className={styles.controlGroup}>
          <label className={styles.controlLabel}>Min investments</label>
          <div className={styles.controlRow}>
            <input type="range" min={1} max={10} value={minDeals}
              onChange={e => setMinDeals(+e.target.value)} className={styles.slider} />
            <span className={styles.controlVal}>{minDeals}+</span>
          </div>
        </div>
        <div className={styles.controlGroup}>
          <label className={styles.controlLabel}>Min co-investments</label>
          <div className={styles.controlRow}>
            <input type="range" min={1} max={5} value={minEdge}
              onChange={e => setMinEdge(+e.target.value)} className={styles.slider} />
            <span className={styles.controlVal}>{minEdge}+</span>
          </div>
        </div>
        <div className={styles.controlGroup}>
          <label className={styles.controlLabel}>Domain</label>
          <select className={styles.select} value={domainFilter} onChange={e => setDomainFilter(e.target.value)}>
            {DOMAIN_OPTIONS.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div className={styles.controlGroup}>
          <label className={styles.controlLabel}>Search investor</label>
          <input className={styles.searchInput} placeholder="e.g. Angular..." value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <div className={styles.legend}>
          <span className={styles.legendItem}><span style={{ background: '#3b82f6' }} className={styles.dot} />AI Infra</span>
          <span className={styles.legendItem}><span style={{ background: '#8b5cf6' }} className={styles.dot} />Enterprise</span>
          <span className={styles.legendItem}><span style={{ background: '#10b981' }} className={styles.dot} />Healthcare</span>
          <span className={styles.legendItem}><span style={{ background: '#f59e0b' }} className={styles.dot} />FinTech</span>
          <span className={styles.legendItem}><span style={{ background: '#ef4444' }} className={styles.dot} />Cyber</span>
        </div>
      </div>

      <div className={styles.graphArea}>
        <div ref={containerRef} className={styles.graphContainer}>
          {loading ? (
            <div className={styles.center}><div className="spinner" /></div>
          ) : (
            <svg ref={svgRef} className={styles.svg} />
          )}
        </div>

        <InvestorPanel investor={selected} onClose={() => setSelected(null)} />
      </div>

      {search && filteredStats && (
        <div className={styles.searchResults}>
          {filteredStats.nodes.slice(0, 8).map(n => (
            <button key={n.id} className={styles.searchResult} onClick={() => setSelected(n)}>
              <span className={styles.searchDot} style={{ background: n.color }} />
              <span className={styles.searchName}>{n.id}</span>
              <span className={styles.searchDeals}>{n.deals} deals</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
