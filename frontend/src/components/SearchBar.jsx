import { useState, useRef } from 'react'
import styles from './SearchBar.module.css'

const EXAMPLES = [
  'AI for insurance compliance',
  'cloud security for banks',
  'healthcare automation platform',
  'data infrastructure for enterprises',
  'vertical AI for legal workflows',
  'fintech fraud detection AI',
]

export default function SearchBar({ onSearch, loading }) {
  const [value, setValue] = useState('')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef()

  function submit(q) {
    const query = q ?? value
    if (!query.trim()) return
    setValue(query)
    onSearch(query)
    inputRef.current?.blur()
    setFocused(false)
  }

  function handleKey(e) {
    if (e.key === 'Enter') submit()
  }

  function clear() {
    setValue('')
    onSearch('')
    inputRef.current?.focus()
  }

  return (
    <div className={styles.wrap}>
      <div className={`${styles.box} ${focused ? styles.focused : ''}`}>
        <span className={styles.icon}>
          {loading ? <span className={styles.miniSpinner} /> : '⌕'}
        </span>
        <input
          ref={inputRef}
          className={styles.input}
          placeholder="Search in natural language — e.g. &quot;AI for insurance underwriting&quot;"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKey}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
        />
        {value && (
          <button className={styles.clear} onClick={clear}>✕</button>
        )}
        <button className={styles.btn} onClick={() => submit()}>Search</button>
      </div>
      {focused && !value && (
        <div className={styles.examples}>
          <span className={styles.examplesLabel}>Try:</span>
          {EXAMPLES.map(ex => (
            <button key={ex} className={styles.example} onMouseDown={() => submit(ex)}>
              {ex}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
