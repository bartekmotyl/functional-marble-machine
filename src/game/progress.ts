import { useCallback, useEffect, useState } from 'react'
import { MAX_STARS } from './check'

export interface Progress {
  /** level id -> stars (1 = solved, 2 = solved in few lines) */
  stars: Record<string, number>
  code: Record<string, string>
  unlockAll?: boolean
  /** stars per level when saved; progress from before 5-star levels (3) is moved up */
  maxStars?: number
}

const KEY = 'marble-machine-progress-v1'

/** Levels used to give 3 stars, now 5: 3 → 5, 2 → 4, 1 → 3 (the stars lost stay lost). */
export function upgrade(p: Progress): Progress {
  if ((p.maxStars ?? 3) >= MAX_STARS) return p
  const lost = MAX_STARS - (p.maxStars ?? 3)
  const stars = Object.fromEntries(Object.entries(p.stars).map(([id, s]) => [id, s > 0 ? s + lost : s]))
  return { ...p, stars, maxStars: MAX_STARS }
}

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return upgrade({ stars: {}, code: {}, ...JSON.parse(raw) })
  } catch {
    /* ignore broken storage */
  }
  return { stars: {}, code: {}, maxStars: MAX_STARS }
}

export function useProgress() {
  const [progress, setProgress] = useState<Progress>(load)
  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(progress))
  }, [progress])

  const saveCode = useCallback((id: string, code: string) => {
    setProgress((p) => ({ ...p, code: { ...p.code, [id]: code } }))
  }, [])
  const award = useCallback((id: string, stars: number) => {
    setProgress((p) => ({ ...p, stars: { ...p.stars, [id]: Math.max(p.stars[id] ?? 0, stars) } }))
  }, [])
  const setUnlockAll = useCallback((v: boolean) => setProgress((p) => ({ ...p, unlockAll: v })), [])
  const reset = useCallback(() => setProgress({ stars: {}, code: {}, maxStars: MAX_STARS }), [])

  return { progress, saveCode, award, setUnlockAll, reset }
}
