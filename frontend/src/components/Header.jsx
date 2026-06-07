import styles from './Header.module.css'

export default function Header({ stats }) {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <img src="/assets-static/logo_white.png" alt="FutureFirst Ventures" className={styles.logo} />
        <div className={styles.divider} />
        <span className={styles.title}>Company Database</span>
      </div>
      <div className={styles.right}>
        {stats && (
          <div className={styles.pill}>
            <span className={styles.star}>✦</span>
            {stats.total} companies
          </div>
        )}
        <a
          href="https://futurefirst.vc"
          target="_blank"
          rel="noreferrer"
          className={styles.link}
        >
          futurefirst.vc ↗
        </a>
      </div>
    </header>
  )
}
