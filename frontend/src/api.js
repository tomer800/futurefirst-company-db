const BASE = '/api'

async function get(path, params = {}) {
  const url = new URL(BASE + path, window.location.origin)
  Object.entries(params).forEach(([k, v]) => v != null && v !== '' && url.searchParams.set(k, v))
  const res = await fetch(url)
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

export const api = {
  companies: (params) => get('/companies', params),
  company: (id) => get(`/companies/${id}`),
  search: (params) => get('/search', params),
  stats: () => get('/stats'),
  filters: () => get('/filters'),
  enrich: (id) => get(`/enrich/${id}`),
  googleSearch: (q) => get('/google-search', { q }),
  rebuildIndex: () => fetch(BASE + '/admin/rebuild-index', { method: 'POST' }).then(r => r.json()),
}
