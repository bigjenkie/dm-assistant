import { useRef, useEffect } from 'react'
import type { TranscriptEntry } from '../lib/types'

type Props = {
  entries: TranscriptEntry[]
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function TranscriptPanel({ entries }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [entries.length])

  return (
    <div className="flex flex-col h-full">
      <h2
        className="text-xs font-semibold uppercase tracking-wider mb-2"
        style={{ color: 'var(--surface-500)', letterSpacing: '0.08em' }}
      >
        Transcript
      </h2>
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-1">
        {entries.map((entry) => (
          <div key={entry.id} className="text-sm">
            <span
              className="text-xs mr-2"
              style={{ color: 'var(--surface-600)', fontFamily: 'var(--font-mono)' }}
            >
              [{formatTime(entry.ts)}]
            </span>
            <span style={{ color: 'var(--surface-300)' }}>{entry.text}</span>
          </div>
        ))}
        {entries.length === 0 && (
          <p className="text-xs italic" style={{ color: 'var(--surface-600)' }}>
            Pick a scenario to start, or connect a mic for live transcription.
          </p>
        )}
      </div>

      {/* Source indicator */}
      {entries.length > 0 && (
        <div
          className="flex items-center gap-1.5 pt-2 mt-2 text-xs"
          style={{ borderTop: '1px solid var(--surface-800)', color: 'var(--surface-600)' }}
        >
          <span>🎬</span>
          <span>Demo / Testing</span>
          <span style={{ color: 'var(--surface-700)' }}>·</span>
          <span>{entries.length} lines</span>
        </div>
      )}
    </div>
  )
}
