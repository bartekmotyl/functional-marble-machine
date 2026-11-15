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

export function RichText({ text }: { text: string }) {
  const blocks = text.split(/```\n?([\s\S]*?)```/g)
  return (
    <div className="rich">
      {blocks.map((b, i) =>
        i % 2 === 1 ? (
          <pre key={i} className="code-sample">
            {b.replace(/\n$/, '')}
          </pre>
        ) : (
          b
            .split(/\n\s*\n/)
            .map((p) => p.trim())
            .filter(Boolean)
            .map((p, j) => <p key={`${i}-${j}`}>{inline(p)}</p>)
        ),
      )}
    </div>
  )
}
