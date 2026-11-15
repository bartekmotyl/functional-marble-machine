import { useEffect, useRef, useState, type ReactNode } from 'react'

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
}

/** A word in the program that you click to choose something else. */
export function Picker<T extends string | number>({ value, options, onPick, readOnly, className = '', grid }: Props<T>) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  const current = options.find((o) => o.value === value)
  const label = current?.label ?? String(value)
  if (readOnly || options.length <= 1)
    return <span className={`pick static ${current?.className ?? ''} ${className}`}>{label}</span>

  return (
    <span className="pick-wrap" ref={ref}>
      <button type="button" className={`pick ${current?.className ?? ''} ${className} ${open ? 'open' : ''}`} onClick={() => setOpen(!open)}>
        {label}
        <span className="caret">▾</span>
      </button>
      {open && (
        <div className={`pop ${grid ? 'grid' : ''}`} role="listbox">
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
        </div>
      )}
    </span>
  )
}
