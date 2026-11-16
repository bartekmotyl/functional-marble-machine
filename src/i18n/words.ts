import { t } from '.'

/** A value or property word shown in blocks: "red" -> "czerwony", "size" -> "rozmiar". */
export function word(v: string | number): string {
  if (typeof v === 'number') return String(v)
  return t(`words.${v}`)
}

/** A keyword of the language: "filter", "and", "becomes"... */
export function kw(k: string): string {
  return t(`kw.${k}`)
}

/**
 * The program as code, with the keywords in the current language.
 * (The real code is always English; this is only how it is shown.)
 */
export function localizeCode(source: string): string {
  return source
    .split('\n')
    .map((line) =>
      line
        .replace(/\bis not\b/g, '\u0000isnot\u0000')
        .replace(/\b[a-z]+\b/g, (w) => {
          const v = t(`code.${w}`)
          return v === `code.${w}` ? w : v
        })
        .replace(/\u0000isnot\u0000/g, t('code.isnot')),
    )
    .join('\n')
}
