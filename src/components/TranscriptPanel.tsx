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
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
        Transcript
      </h2>
      <div className="flex-1 overflow-y-auto space-y-1 mb-2">
        {entries.map((entry) => (
          <div key={entry.id} className="text-sm">
            <span className="text-gray-500 font-mono text-xs mr-2">
              [{formatTime(entry.ts)}]
            </span>
            <span className="text-gray-300">{entry.text}</span>
          </div>
        ))}
        {entries.length === 0 && (
          <p className="text-gray-600 text-sm italic">
            Type table conversation below to simulate transcription...
          </p>
        )}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          name="transcript-input"
          type="text"
          placeholder="Type what's being said at the table..."
          className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-gray-500"
        />
        <button
          type="submit"
          className="bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm px-3 py-1.5 rounded"
        >
          Add
        </button>
      </form>
    </div>
  )
}
