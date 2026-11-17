import { useSyncExternalStore } from 'react'
import { MAX_PACK_BYTES, readPack, type Pack, type PackLevel } from './packs'

/**
 * Custom packs the player added, kept in localStorage as the YAML they were loaded from.
 * They are checked again when read back, so a pack that the game no longer accepts is skipped.
 */
const KEY = 'marble-machine-packs-v1'

interface Stored {
  url: string
  source: string
  added: number
}

const listeners = new Set<() => void>()
let packs: Pack[] = load()

function stored(): Stored[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(raw) ? raw.filter((s) => typeof s?.url === 'string' && typeof s?.source === 'string') : []
  } catch {
    return []
  }
}

function load(): Pack[] {
  if (typeof localStorage === 'undefined') return []
  return stored().flatMap((s) => {
    try {
      // the examples were checked when the pack was added
      return [readPack(s.source, s.url, { checkExamples: false })]
    } catch {
      return []
    }
  })
}

function save(list: Stored[]) {
  localStorage.setItem(KEY, JSON.stringify(list))
  packs = load()
  listeners.forEach((l) => l())
}

/** Add a pack, or replace the one loaded from the same link. */
export function addPack(url: string, source: string) {
  save([...stored().filter((s) => s.url !== url), { url, source, added: Date.now() }])
}

export function removePack(url: string) {
  save(stored().filter((s) => s.url !== url))
}

export function getPacks(): Pack[] {
  return packs
}

export function usePacks(): Pack[] {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => packs,
  )
}

export function findPackLevel(id: string): { pack: Pack; level: PackLevel; index: number } | undefined {
  for (const pack of packs) {
    const index = pack.levels.findIndex((l) => l.id === id)
    if (index >= 0) return { pack, level: pack.levels[index], index }
  }
  return undefined
}

/** Turn what the player typed into a full http(s) link (relative links are read from this page). */
export function resolveUrl(input: string): string {
  const url = new URL(input.trim(), window.location.href)
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('protocol')
  url.hash = ''
  return url.href
}

/** Download a pack file. Errors are i18n keys under "packs.errors". */
export async function fetchPack(url: string): Promise<string> {
  let res: Response
  try {
    res = await fetch(url, { credentials: 'omit', redirect: 'follow' })
  } catch {
    throw new Error('network')
  }
  if (!res.ok) throw new Error('status')
  const length = Number(res.headers.get('content-length') ?? 0)
  if (length > MAX_PACK_BYTES) throw new Error('tooBig')
  const text = await res.text()
  if (/^\s*<(!doctype|html)/i.test(text)) throw new Error('html')
  return text
}
