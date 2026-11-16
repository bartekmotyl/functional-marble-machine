import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export interface Option<T> {
  value: T
  label: ReactNode
  className?: string
}

interface Props<T> {
  value: T
  options: Option<T>[]
  onPick: (v: T) => void
  readOnly?: boolean
  className?: string
  /** wide grid popover, e.g. for numbers */
  grid?: boolean
  title?: string
}

/**
 * A word in the program that you click to choose something else.
 * The list opens in a layer above the whole page, so no panel can hide it.
 */
export function Picker<T extends string | number>({ value, options, onPick, readOnly, className = '', grid, title }: Props<T>) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<CSSProperties>({})
  const btn = useRef<HTMLButtonElement>(null)
  const pop = useRef<HTMLDivElement>(null)

  // place the list under the button; flip up / shift left when it would leave the window
  useLayoutEffect(() => {
    if (!open || !btn.current || !pop.current) return
    const b = btn.current.getBoundingClientRect()
    const p = pop.current.getBoundingClientRect()
    let top = b.bottom + 4
    if (top + p.height > window.innerHeight - 8) top = Math.max(8, b.top - p.height - 4)
    const left = Math.max(8, Math.min(b.left, window.innerWidth - p.width - 8))
    setPos({ top, left, visibility: 'visible' })
  }, [open])

  useEffect(() => {
    if (!open) return
    const close = (e: Event) => {
      const target = e.target as Node
      if (btn.current?.contains(target) || pop.current?.contains(target)) return
      setOpen(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    const onScroll = (e: Event) => {
      if (pop.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open])

  const current = options.find((o) => o.value === value)
  const label = current?.label ?? String(value)
  if (readOnly || options.length <= 1)
    return <span className={`pick static ${current?.className ?? ''} ${className}`}>{label}</span>

  return (
    <span className="pick-wrap">
      <button
        ref={btn}
        type="button"
        title={title}
        className={`pick ${current?.className ?? ''} ${className} ${open ? 'open' : ''}`}
        onClick={() => {
          setPos({ visibility: 'hidden' })
          setOpen(!open)
        }}
      >
        {label}
        <span className="caret">▾</span>
      </button>
      {open &&
        createPortal(
          <div ref={pop} className={`pop ${grid ? 'grid' : ''}`} role="listbox" style={{ position: 'fixed', ...pos }}>
            {options.map((o) => (
              <button
                type="button"
                key={String(o.value)}
                role="option"
                aria-selected={o.value === value}
                className={`pop-opt ${o.className ?? ''} ${o.value === value ? 'sel' : ''}`}
                onClick={() => {
                  onPick(o.value)
                  setOpen(false)
                }}
              >
                {o.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </span>
  )
}
