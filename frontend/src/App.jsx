import { useState, useEffect, useCallback } from 'react'
import { api } from './api.js'
import Header from './components/Header.jsx'
import SearchBar from './components/SearchBar.jsx'
import FilterPanel from './components/FilterPanel.jsx'
import CompanyCard from './components/CompanyCard.jsx'
import CompanyModal from './components/CompanyModal.jsx'
import StatsBar from './components/StatsBar.jsx'
import AnalyticsDashboard from './components/AnalyticsDashboard.jsx'
import DealRadar from './components/DealRadar.jsx'
import InvestorGraph from './components/InvestorGraph.jsx'
import styles from './App.module.css'

const DEFAULT_FILTERS = { domain: '', round_type: '', year_min: '2023', year_max: '' }

export default function App() {
  const [view, setView] = useState('analytics')
  const [stats, setStats] = useState(null)
  const [filterOptions, setFilterOptions] = useState(null)
  const [companies, setCompanies] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [selected, setSelected] = useState(null)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const LIMIT = 48

  useEffect(() => {
    api.stats().then(setStats)
    api.filters().then(setFilterOptions)
  }, [])

  const fetchCompanies = useCallback(async (q, f, off = 0) => {
    const isSearch = q && q.trim()
    if (isSearch) {
      setSearchLoading(true)
      try {
        const data = await api.search({
          q,
          domain: f.domain || undefined,
          year_min: f.year_min || undefined,
          year_max: f.year_max || undefined,
          round_type: f.round_type || undefined,
          limit: LIMIT,
        })
        setCompanies(data.companies)
        setTotal(data.total)
        setHasMore(false)
      } finally {
        setSearchLoading(false)
      }
    } else {
      setLoading(off === 0)
      try {
        const data = await api.companies({
          domain: f.domain || undefined,
          year_min: f.year_min || undefined,
          year_max: f.year_max || undefined,
          round_type: f.round_type || undefined,
          limit: LIMIT,
          offset: off,
        })
        setCompanies(prev => off === 0 ? data.companies : [...prev, ...data.companies])
        setTotal(data.total)
        setHasMore(off + LIMIT < data.total)
      } finally {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    if (view === 'companies') {
      setOffset(0)
      fetchCompanies(query, filters, 0)
    }
  }, [query, filters, view])

  function handleSearch(q) { setQuery(q); setOffset(0) }
  function handleFilterChange(f) { setFilters(f); setOffset(0) }
  function loadMore() {
    const next = offset + LIMIT
    setOffset(next)
    fetchCompanies(query, filters, next)
  }

  function goToCompanies() { setView('companies') }

  return (
    <div className={styles.app}>
      <Header stats={stats} view={view} onViewChange={setView} />

      {view === 'radar' && <DealRadar />}
      {view === 'network' && <InvestorGraph />}

      {view === 'analytics' && (
        <AnalyticsDashboard stats={stats} onBrowse={goToCompanies} />
      )}

      {view === 'companies' && (
        <>
          <div className={styles.hero}>
            <div className={styles.heroText}>
              <span className={styles.star}>✦</span>
              <h1 className={styles.heroTitle}>Vertical AI Companies Database</h1>
              <span className={styles.heroBadge}>Israeli Ecosystem</span>
            </div>
            <SearchBar onSearch={handleSearch} loading={searchLoading} />
          </div>

          <div className={styles.main}>
            {/* Desktop filter panel */}
            <div className={styles.desktopFilter}>
              <FilterPanel filters={filterOptions} active={filters} onChange={handleFilterChange} stats={stats} />
            </div>

            {/* Mobile filter toggle */}
            <button className={styles.filterToggle} onClick={() => setFilterOpen(true)}>
              ⚙ Filters {Object.values(filters).filter(Boolean).length > 0 ? `(${Object.values(filters).filter(Boolean).length})` : ''}
            </button>
            {filterOpen && (
              <div className={styles.filterDrawerOverlay} onClick={() => setFilterOpen(false)}>
                <div className={styles.filterDrawer} onClick={e => e.stopPropagation()}>
                  <div className={styles.filterDrawerClose}>
                    <button className={styles.filterDrawerCloseBtn} onClick={() => setFilterOpen(false)}>Done</button>
                  </div>
                  <FilterPanel filters={filterOptions} active={filters} onChange={(f) => { handleFilterChange(f); }} stats={stats} />
                </div>
              </div>
            )}

            <div className={styles.content}>
              <div className={styles.contentHeader}>
                <StatsBar stats={stats} searchActive={!!query} searchCount={total} />
                {query && (
                  <div className={styles.searchInfo}>
                    <span className={styles.searchQuery}>"{query}"</span>
                    <button className={styles.clearSearch} onClick={() => handleSearch('')}>Clear search</button>
                  </div>
                )}
              </div>

              {loading && offset === 0 ? (
                <div className={styles.center}><div className="spinner" /></div>
              ) : companies.length === 0 ? (
                <div className={styles.empty}>
                  <div className={styles.emptyIcon}>⌕</div>
                  <div className={styles.emptyText}>No companies found</div>
                  <div className={styles.emptySub}>Try adjusting your search or filters</div>
                </div>
              ) : (
                <>
                  <div className={styles.grid}>
                    {companies.map(company => (
                      <CompanyCard key={company.id} company={company} onClick={setSelected} />
                    ))}
                  </div>
                  {hasMore && (
                    <div className={styles.loadMore}>
                      <button className={styles.loadMoreBtn} onClick={loadMore}>Load more companies</button>
                      <span className={styles.loadMoreCount}>Showing {companies.length} of {total}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}

      <CompanyModal company={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
