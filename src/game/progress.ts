import { useCallback, useEffect, useState } from 'react'

export interface Progress {
  /** level id -> stars (1 = solved, 2 = solved in few lines) */
  stars: Record<string, number>
  code: Record<string, string>
  unlockAll?: boolean
}

const KEY = 'marble-machine-progress-v1'

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { stars: {}, code: {}, ...JSON.parse(raw) }
  } catch {
    /* ignore broken storage */
  }
  return { stars: {}, code: {} }
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
  const reset = useCallback(() => setProgress({ stars: {}, code: {} }), [])

  return { progress, saveCode, award, setUnlockAll, reset }
}
