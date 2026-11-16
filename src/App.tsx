import { useEffect, useState } from 'react'
import { ALL_LEVELS, CHAPTERS, chapterOf, levelIndex } from './game/levels'
import { useProgress } from './game/progress'
import { examOf, isChapterOpen, isExamOpen, isUnlocked, practiceOf } from './game/progression'
import { getLang, setLang } from './i18n'
import { ChapterScreen } from './ui/ChapterScreen'
import { LevelScreen } from './ui/LevelScreen'
import { MapScreen } from './ui/MapScreen'
import { MarbleDefs } from './ui/Marble'

type Route = { page: 'map' } | { page: 'level'; id: string } | { page: 'chapter'; id: string }

function readHash(): Route {
  const m = window.location.hash.match(/^#\/(level|chapter)\/(\w+)/)
  return m ? { page: m[1] as 'level' | 'chapter', id: m[2] } : { page: 'map' }
}

export default function App() {
  const { progress, saveCode, award, setUnlockAll, reset } = useProgress()
  const [route, setRoute] = useState<Route>(readHash)
  const [lang, setLangState] = useState(getLang())

  useEffect(() => {
    const onHash = () => setRoute(readHash())
    window.addEventListener('hashchange', onHash)
    document.documentElement.lang = getLang()
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const go = (r: Route) => {
    window.location.hash = r.page === 'map' ? '' : `/${r.page}/${r.id}`
    setRoute(r)
    window.scrollTo(0, 0)
  }
  const openLevel = (id: string) => go({ page: 'level', id })
  const openChapter = (id: string) => go({ page: 'chapter', id })
  const changeLang = (l: string) => {
    setLang(l)
    setLangState(l)
  }

  let screen
  if (route.page === 'level' && levelIndex(route.id) >= 0 && isUnlocked(progress, route.id)) {
    const level = ALL_LEVELS[levelIndex(route.id)]
    const ch = chapterOf(level.id)
    const practice = practiceOf(ch)
    const pi = practice.indexOf(level)
    const nextPractice = pi >= 0 ? practice[pi + 1] : undefined
    const exam = examOf(ch)
    const nextChapter = CHAPTERS[CHAPTERS.indexOf(ch) + 1]
    screen = (
      <LevelScreen
        key={`${level.id}-${lang}`}
        level={level}
        savedCode={progress.code[level.id]}
        stars={progress.stars[level.id] ?? 0}
        onSaveCode={(c) => saveCode(level.id, c)}
        onSolved={(s) => award(level.id, s)}
        onBack={() => go({ page: 'map' })}
        onChapter={() => openChapter(ch.id)}
        onNext={nextPractice ? () => openLevel(nextPractice.id) : undefined}
        // the exam button appears once the exam is open (checked with the progress after this solve)
        examReady={(after) => !level.exam && isExamOpen(after, ch)}
        onExam={() => openLevel(exam.id)}
        onNextSection={level.exam && nextChapter ? () => openChapter(nextChapter.id) : undefined}
        progress={progress}
      />
    )
  } else if (route.page === 'chapter' && CHAPTERS.some((c) => c.id === route.id)) {
    const ch = CHAPTERS.find((c) => c.id === route.id)!
    screen = isChapterOpen(progress, ch) ? (
      <ChapterScreen
        key={lang}
        chapter={ch}
        progress={progress}
        onOpen={openLevel}
        onOpenChapter={openChapter}
        onBack={() => go({ page: 'map' })}
        onLang={changeLang}
      />
    ) : null
  }

  return (
    <>
      <MarbleDefs />
      {screen ?? (
        <MapScreen
          key={lang}
          progress={progress}
          onOpen={openLevel}
          onOpenChapter={openChapter}
          onUnlockAll={setUnlockAll}
          onReset={reset}
          onLang={changeLang}
        />
      )}
    </>
  )
}
