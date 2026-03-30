import { useRef, useEffect } from 'react'
import type { TranscriptEntry } from '../lib/types'

type Props = {
  entries: TranscriptEntry[]
  maxLines?: number
  onTap?: () => void
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function MiniTranscript({ entries, maxLines = 4, onTap }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const recent = entries.slice(-maxLines)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [entries.length])

  if (entries.length === 0) return null

  return (
    <div
      ref={scrollRef}
      onClick={onTap}
      className="overflow-hidden"
      style={{
        background: 'var(--surface-900)',
        borderRadius: 'var(--radius-md)',
        padding: '6px 8px',
        cursor: onTap ? 'pointer' : 'default',
        maxHeight: '80px',
        borderLeft: '2px solid var(--amber-800)',
      }}
    >
      {recent.map((entry) => (
        <div key={entry.id} className="text-xs truncate" style={{ color: 'var(--surface-400)' }}>
          <span style={{ color: 'var(--surface-600)', fontFamily: 'var(--font-mono)', marginRight: '4px' }}>
            {formatTime(entry.ts)}
          </span>
          {entry.text}
        </div>
      ))}
    </div>
  )
}
