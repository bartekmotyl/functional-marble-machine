import { useEffect, useState } from 'react'
import { t } from '../i18n'

export type Theme = 'light' | 'dark'

const KEY = 'marble-machine-theme'

/** The theme the player picked, or null to follow the system. */
function stored(): Theme | null {
  const v = localStorage.getItem(KEY)
  return v === 'light' || v === 'dark' ? v : null
}

/** The theme shown right now. */
export function currentTheme(): Theme {
  return stored() ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
}

/** Put the picked theme on <html>; the CSS reads it through color-scheme and light-dark(). */
export function applyTheme(theme: Theme | null = stored()) {
  if (theme) document.documentElement.dataset.theme = theme
  else delete document.documentElement.dataset.theme
}

export function ThemeSwitch() {
  const [theme, setTheme] = useState<Theme>(currentTheme)
  // until the player picks a theme, follow the system - also when it changes (e.g. at night)
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const follow = () => setTheme(currentTheme())
    mq.addEventListener('change', follow)
    return () => mq.removeEventListener('change', follow)
  }, [])
  const next: Theme = theme === 'dark' ? 'light' : 'dark'
  const pick = () => {
    localStorage.setItem(KEY, next)
    applyTheme(next)
    setTheme(next)
  }
  return (
    <button className="lang-btn theme-btn" onClick={pick} title={t('theme.label')}>
      {t(`theme.${next}`)}
    </button>
  )
}
