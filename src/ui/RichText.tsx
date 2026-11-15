import type { ReactNode } from 'react'

/** Tiny markdown: paragraphs, ``` code blocks, `code`, **bold**, *italic*. */
function inline(text: string): ReactNode[] {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g)
  return parts.map((p, i) => {
    if (p.startsWith('`') && p.length > 1) return <code key={i}>{p.slice(1, -1)}</code>
    if (p.startsWith('**') && p.length > 4) return <strong key={i}>{p.slice(2, -2)}</strong>
    if (p.startsWith('*') && p.length > 2) return <em key={i}>{p.slice(1, -1)}</em>
    return p
  })
}

interface Props {
  text: string
  /** how to show ``` code blocks (e.g. as read-only program blocks) */
  renderCode?: (code: string) => ReactNode
}

export function RichText({ text, renderCode }: Props) {
  const blocks = text.split(/```\n?([\s\S]*?)```/g)
  return (
    <div className="rich">
      {blocks.map((b, i) => {
        if (i % 2 === 1) {
          const code = b.replace(/\n$/, '')
          return renderCode ? (
            <div key={i}>{renderCode(code)}</div>
          ) : (
            <pre key={i} className="code-sample">
              {code}
            </pre>
          )
        }
        return b
          .split(/\n\s*\n/)
          .map((p) => p.trim())
          .filter(Boolean)
          .map((p, j) => <p key={`${i}-${j}`}>{inline(p)}</p>)
      })}
    </div>
  )
}
