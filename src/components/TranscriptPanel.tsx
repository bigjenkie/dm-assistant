import type { TranscriptEntry } from '../lib/types'

type Props = {
  entries: TranscriptEntry[]
  onAddEntry: (text: string) => void
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function TranscriptPanel({ entries, onAddEntry }: Props) {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const input = form.elements.namedItem('transcript-input') as HTMLInputElement
    const text = input.value.trim()
    if (text) {
      onAddEntry(text)
      input.value = ''
    }
  }

  return (
    <div className="flex flex-col h-full">
      <h2
        className="text-xs font-semibold uppercase tracking-wider mb-2"
        style={{ color: 'var(--surface-500)', letterSpacing: '0.08em' }}
      >
        Transcript
      </h2>
      <div className="flex-1 overflow-y-auto space-y-1 mb-2">
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
          <p className="text-sm italic" style={{ color: 'var(--surface-600)' }}>
            Type table conversation below to simulate transcription...
          </p>
        )}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          name="transcript-input"
          type="text"
          placeholder="Type what's being said at the table..."
          className="flex-1 text-sm px-3 py-1.5"
          style={{
            background: 'var(--surface-900)',
            border: '1px solid var(--surface-700)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--surface-200)',
            outline: 'none',
            transition: 'border-color var(--duration-fast) var(--ease-out)',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--amber-700)' }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--surface-700)' }}
        />
        <button
          type="submit"
          className="text-sm px-3 py-1.5"
          style={{
            background: 'var(--surface-800)',
            color: 'var(--surface-300)',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            transition: 'background var(--duration-fast) var(--ease-out)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-700)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface-800)' }}
        >
          Add
        </button>
      </form>
    </div>
  )
}
