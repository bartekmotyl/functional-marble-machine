/** Small inline icons (emoji has no funnel). */
export function FunnelIcon({ size = 16 }: { size?: number }) {
  return (
    <svg className="icon funnel" width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M3 4h18l-7 8.5V19l-4 2v-8.5L3 4z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

export function KindIcon({ kind, size }: { kind: 'filter' | 'map' | 'reduce'; size?: number }) {
  if (kind === 'filter') return <FunnelIcon size={size} />
  return <span aria-hidden>{kind === 'map' ? '🎨' : '🧮'}</span>
}
