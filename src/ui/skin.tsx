import { useSyncExternalStore } from 'react'
import skins from 'virtual:skins'
import type { Chapter } from '../game/levels'
import { getLang, t } from '../i18n'

/** The skins from skins/*.yaml, checked and turned into CSS at build time. The first is the default. */
export const SKINS = skins

const KEY = 'marble-machine-skin'
const listeners = new Set<() => void>()

function stored(): string {
  const id = localStorage.getItem(KEY)
  return SKINS.some((s) => s.id === id) ? id! : SKINS[0].id
}

let current = stored()

/** Put the skins' CSS on the page once and switch to the saved skin. */
export function installSkins() {
  const style = document.createElement('style')
  style.id = 'skins'
  style.textContent = SKINS.map((s) => s.css).join('\n')
  document.head.append(style)
  document.documentElement.dataset.skin = current
}

export function setSkin(id: string) {
  current = id
  localStorage.setItem(KEY, id)
  document.documentElement.dataset.skin = id
  listeners.forEach((l) => l())
}

export function useSkin() {
  const id = useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => current,
  )
  return SKINS.find((s) => s.id === id) ?? SKINS[0]
}

/** The icon of a section in the current skin. */
export function useSectionIcon(ch: Chapter): string {
  return useSkin().icons[ch.id] ?? ch.emoji
}

export function SectionIcon({ chapter }: { chapter: Chapter }) {
  return <>{useSectionIcon(chapter)}</>
}

export function SkinSwitch() {
  const skin = useSkin()
  if (SKINS.length < 2) return null
  return (
    <label className="lang-btn skin-pick" title={t('skin.label')}>
      🎨
      <select value={skin.id} onChange={(e) => setSkin(e.target.value)} aria-label={t('skin.label')}>
        {SKINS.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name[getLang()] ?? s.name.en}
          </option>
        ))}
      </select>
    </label>
  )
}
