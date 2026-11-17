import { useEffect, useId, useRef, useState } from 'react'
import { DICTS, LANGS, getLang, t } from '../i18n'

/**
 * Flags drawn as SVG: flag emoji show as two letters on Windows. A language without a
 * drawing here falls back to the emoji in its `meta.flag`.
 */
function Flag({ lang }: { lang: string }) {
  const id = useId()
  if (lang === 'en') {
    // the British flag
    return (
      <svg className="flag" viewBox="0 0 60 30" aria-hidden>
        <clipPath id={`${id}s`}>
          <path d="M0,0 v30 h60 v-30 z" />
        </clipPath>
        <clipPath id={`${id}t`}>
          <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
        </clipPath>
        <g clipPath={`url(#${id}s)`}>
          <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
          <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
          <path d="M0,0 L60,30 M60,0 L0,30" clipPath={`url(#${id}t)`} stroke="#C8102E" strokeWidth="4" />
          <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
          <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
        </g>
      </svg>
    )
  }
  if (lang === 'pl') {
    return (
      <svg className="flag" viewBox="0 0 16 10" aria-hidden>
        <rect width="16" height="5" fill="#fff" />
        <rect y="5" width="16" height="5" fill="#dc143c" />
        <rect width="16" height="10" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="0.4" />
      </svg>
    )
  }
  const emoji = (DICTS[lang].meta as { flag?: string }).flag
  return emoji ? <span className="flag-emoji" aria-hidden>{emoji}</span> : null
}

const nameOf = (lang: string) => (DICTS[lang].meta as { name: string }).name

/** The language menu: the current flag and name; click to pick another language. */
export function LangPicker({ onLang }: { onLang: (lang: string) => void }) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const lang = getLang()

  useEffect(() => {
    if (!open) return
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !box.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  return (
    <div className="lang-picker" ref={box}>
      <button
        className="lang-btn lang-current"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={t('map.language')}
      >
        <Flag lang={lang} />
        {nameOf(lang)}
        <span className="caret" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <ul className="lang-menu" role="listbox" aria-label={t('map.language')}>
          {LANGS.map((l) => (
            <li key={l}>
              <button
                role="option"
                aria-selected={l === lang}
                className={l === lang ? 'on' : ''}
                onClick={() => {
                  setOpen(false)
                  onLang(l)
                }}
              >
                <Flag lang={l} />
                {nameOf(l)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
