import { useEffect, useState } from 'react'
import { ALL_LEVELS, CHAPTERS, chapterOf, conceptsUpTo, levelIndex, type Concept } from './game/levels'
import { useProgress } from './game/progress'
import { examOf, isChapterOpen, isExamOpen, isUnlocked, levelNumber, practiceOf } from './game/progression'
import { findPackLevel, removePack, usePacks } from './game/packStore'
import { textsFor } from './game/packs'
import { getLang, has, setLang, t, tl } from './i18n'
import { ChapterScreen } from './ui/ChapterScreen'
import { ImportDialog } from './ui/ImportDialog'
import { SectionIcon } from './ui/skin'
import { LevelScreen } from './ui/LevelScreen'
import { MapScreen } from './ui/MapScreen'
import { MarbleDefs } from './ui/Marble'

type Route = { page: 'map' } | { page: 'level'; id: string } | { page: 'chapter'; id: string } | { page: 'import'; url: string }

function readHash(): Route {
  const imp = window.location.hash.match(/^#\/import\?url=(.*)$/)
  if (imp) {
    try {
      return { page: 'import', url: decodeURIComponent(imp[1]) }
    } catch {
      return { page: 'import', url: '' }
    }
  }
  const m = window.location.hash.match(/^#\/(level|chapter)\/(\w+)/)
  return m ? { page: m[1] as 'level' | 'chapter', id: m[2] } : { page: 'map' }
}

/** Custom levels may use every block the game has. */
const ALL_CONCEPTS: Concept[] = [...new Set(ALL_LEVELS.flatMap((l) => l.unlocks ?? []))]

export default function App() {
  const { progress, saveCode, award, setUnlockAll, reset, forget } = useProgress()
  const packs = usePacks()
  const [importing, setImporting] = useState(false)
  const [route, setRoute] = useState<Route>(readHash)
  const [lang, setLangState] = useState(getLang())

  useEffect(() => {
    const onHash = () => setRoute(readHash())
    window.addEventListener('hashchange', onHash)
    document.documentElement.lang = getLang()
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const go = (r: Route) => {
    window.location.hash = r.page === 'map' || r.page === 'import' ? '' : `/${r.page}/${r.id}`
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
        texts={{ goal: t(`levels.${level.id}.goal`), intro: has(`levels.${level.id}.intro`) ? t(`levels.${level.id}.intro`) : undefined, hints: tl(`levels.${level.id}.hints`) }}
        concepts={conceptsUpTo(level.id)}
        title={level.exam ? t('level.exam') : t('level.name', { n: levelNumber(level.id) })}
        section={{ title: t(`chapters.${ch.id}.title`), icon: <SectionIcon chapter={ch} /> }}
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
  } else if (route.page === 'level' && findPackLevel(route.id)) {
    // a level from a custom pack: every level is open, there are no exams
    const { pack, level, index } = findPackLevel(route.id)!
    const next = pack.levels[index + 1]
    screen = (
      <LevelScreen
        key={`${level.id}-${lang}-${level.solution}`}
        level={level}
        texts={textsFor(level, lang)}
        concepts={ALL_CONCEPTS}
        title={t('level.name', { n: index + 1 })}
        section={{ title: pack.name, icon: '🧪' }}
        savedCode={progress.code[level.id]}
        stars={progress.stars[level.id] ?? 0}
        onSaveCode={(c) => saveCode(level.id, c)}
        onSolved={(s) => award(level.id, s)}
        onBack={() => go({ page: 'map' })}
        onChapter={() => go({ page: 'map' })}
        onNext={next ? () => openLevel(next.id) : undefined}
        examReady={() => false}
        onExam={() => {}}
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
          packs={packs}
          onImport={() => setImporting(true)}
          onRemovePack={(pack) => {
            removePack(pack.url)
            forget(`${pack.id}_`)
          }}
        />
      )}
      {(importing || route.page === 'import') && (
        <ImportDialog
          initialUrl={route.page === 'import' ? route.url : undefined}
          onClose={() => {
            setImporting(false)
            go({ page: 'map' })
          }}
          onAdded={() => {
            setImporting(false)
            go({ page: 'map' })
          }}
        />
      )}
    </>
  )
}
