import { useEffect, useState } from 'react'
import { addPack, fetchPack, getPacks, resolveUrl } from '../game/packStore'
import { PackError, readPack, type Pack } from '../game/packs'
import { t, tn } from '../i18n'

type State =
  | { s: 'idle' }
  | { s: 'loading' }
  | { s: 'error'; text: string }
  | { s: 'preview'; pack: Pack; source: string }

interface Props {
  /** a link to load right away (from #/import?url=...) */
  initialUrl?: string
  onClose: () => void
  onAdded: (pack: Pack) => void
}

/**
 * Load a level pack from a link: download, check, show what it is, and add it only when the
 * player says so. Everything from the file is shown as plain text.
 */
export function ImportDialog({ initialUrl, onClose, onAdded }: Props) {
  const [input, setInput] = useState(initialUrl ?? '')
  const [state, setState] = useState<State>({ s: 'idle' })

  const load = async (raw: string) => {
    let url: string
    try {
      url = resolveUrl(raw)
    } catch {
      setState({ s: 'error', text: t('packs.errors.link') })
      return
    }
    setState({ s: 'loading' })
    try {
      const source = await fetchPack(url)
      // checking makes the examples of every level, which takes a moment - let the spinner show first
      await new Promise((r) => setTimeout(r, 30))
      setState({ s: 'preview', pack: readPack(source, url), source })
    } catch (e) {
      if (e instanceof PackError) setState({ s: 'error', text: t('packs.errors.invalid', { problem: e.message }) })
      else setState({ s: 'error', text: t(`packs.errors.${(e as Error).message}`) })
    }
  }

  useEffect(() => {
    if (initialUrl) void load(initialUrl)
  }, [initialUrl])

  const replaces = state.s === 'preview' && getPacks().some((p) => p.url === state.pack.url)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal import" role="dialog" aria-label={t('packs.load')} onClick={(e) => e.stopPropagation()}>
        <h2>{t('packs.load')}</h2>
        <p className="muted">{t('packs.loadText')}</p>
        <form
          className="import-form"
          onSubmit={(e) => {
            e.preventDefault()
            void load(input)
          }}
        >
          <input
            type="url"
            inputMode="url"
            value={input}
            placeholder="https://.../my-levels.yaml"
            aria-label={t('packs.link')}
            onChange={(e) => setInput(e.target.value)}
            autoFocus
          />
          <button className="btn run" disabled={!input.trim() || state.s === 'loading'}>
            {t('packs.fetch')}
          </button>
        </form>

        {state.s === 'loading' && <p className="import-status">⏳ {t('packs.loading')}</p>}
        {state.s === 'error' && <p className="import-status error">⚠️ {state.text}</p>}
        {state.s === 'preview' && (
          <div className="import-preview">
            <h3>{state.pack.name}</h3>
            <div className="muted">{t('packs.by', { author: state.pack.author })}</div>
            {state.pack.description && <p>{state.pack.description}</p>}
            <div>{tn('packs.levelCount', state.pack.levels.length)}</div>
            <div className="muted import-url">{state.pack.url}</div>
            {replaces && <p className="import-status">{t('packs.replaces')}</p>}
            <p className="muted">{t('packs.trust')}</p>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>
            {t('packs.cancel')}
          </button>
          {state.s === 'preview' && (
            <button
              className="btn check"
              onClick={() => {
                addPack(state.pack.url, state.source)
                onAdded(state.pack)
              }}
            >
              {t('packs.add')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
