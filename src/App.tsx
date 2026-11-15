import { useEffect, useState } from 'react'
import { ALL_LEVELS, levelIndex } from './game/levels'
import { useProgress } from './game/progress'
import { LevelScreen } from './ui/LevelScreen'
import { isUnlocked, MapScreen } from './ui/MapScreen'
import { MarbleDefs } from './ui/Marble'

function readHash(): string | null {
  const m = window.location.hash.match(/^#\/level\/(\w+)/)
  return m ? m[1] : null
}

export default function App() {
  const { progress, saveCode, award, setUnlockAll, reset } = useProgress()
  const [levelId, setLevelId] = useState<string | null>(readHash)

  useEffect(() => {
    const onHash = () => setLevelId(readHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const open = (id: string | null) => {
    window.location.hash = id ? `/level/${id}` : ''
    setLevelId(id)
    window.scrollTo(0, 0)
  }

  const idx = levelId ? levelIndex(levelId) : -1
  const level = idx >= 0 && isUnlocked(progress, ALL_LEVELS[idx].id) ? ALL_LEVELS[idx] : null
  const next = idx >= 0 ? ALL_LEVELS[idx + 1] : undefined

  return (
    <>
      <MarbleDefs />
      {level ? (
        <LevelScreen
          key={level.id}
          level={level}
          levelNumber={idx + 1}
          savedCode={progress.code[level.id]}
          stars={progress.stars[level.id] ?? 0}
          onSaveCode={(c) => saveCode(level.id, c)}
          onSolved={(s) => award(level.id, s)}
          onBack={() => open(null)}
          onNext={next ? () => open(next.id) : undefined}
        />
      ) : (
        <MapScreen progress={progress} onOpen={open} onUnlockAll={setUnlockAll} onReset={reset} />
      )}
    </>
  )
}
