import { useState } from 'react'
import styles from './CompanyLogo.module.css'

function extractDomain(website) {
  if (!website) return null
  try {
    let url = website.trim()
    if (!url.startsWith('http')) url = 'https://' + url
    const domain = new URL(url).hostname.replace(/^www\./, '')
    if (!domain || domain === 'www.com' || domain === 'www') return null
    return domain
  } catch {
    // Fallback: strip common prefixes
    return website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] || null
  }
}

function getInitials(name) {
  if (!name) return '?'
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function stringToColor(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  const colors = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4','#ec4899','#6366f1','#22c55e','#f97316']
  return colors[Math.abs(hash) % colors.length]
}

export default function CompanyLogo({ website, name, size = 'sm' }) {
  const [stage, setStage] = useState('clearbit') // clearbit → favicon → initials
  const domain = extractDomain(website)
  const dim = size === 'lg' ? 56 : size === 'md' ? 36 : 28
  const fontSize = size === 'lg' ? 18 : size === 'md' ? 13 : 11

  const clearbitUrl = domain ? `https://logo.clearbit.com/${domain}` : null
  const faviconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : null

  if (!domain || stage === 'initials') {
    return (
      <div
        className={styles.initials}
        style={{ width: dim, height: dim, background: stringToColor(name || ''), fontSize }}
      >
        {getInitials(name)}
      </div>
    )
  }

  if (stage === 'clearbit') {
    return (
      <img
        src={clearbitUrl}
        alt={name}
        className={styles.logo}
        style={{ width: dim, height: dim }}
        onError={() => setStage('favicon')}
      />
    )
  }

  return (
    <img
      src={faviconUrl}
      alt={name}
      className={styles.logo}
      style={{ width: dim, height: dim }}
      onError={() => setStage('initials')}
    />
  )
}
