import { useState } from 'react'

type Props = {
  onSave: (apiKey: string) => void
  onCancel: () => void
}

export function ApiKeySetup({ onSave, onCancel }: Props) {
  const [key, setKey] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = key.trim()
    if (trimmed) {
      onSave(trimmed)
    }
  }

  return (
    <div
      className="px-4 py-3"
      style={{
        background: 'var(--surface-900)',
        borderTop: '1px solid var(--surface-800)',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <h3
          className="text-sm font-semibold"
          style={{ color: 'var(--surface-200)' }}
        >
          Claude API Key
        </h3>
        <button
          aria-label="Cancel"
          onClick={onCancel}
          className="text-xs px-2 py-1"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--surface-500)',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="sk-ant-..."
          autoFocus
          className="flex-1 text-sm px-3 py-1.5"
          style={{
            background: 'var(--surface-950)',
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
          disabled={!key.trim()}
          className="text-sm px-4 py-1.5 font-medium disabled:opacity-35"
          style={{
            background: 'var(--accent)',
            color: 'var(--surface-950)',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: key.trim() ? 'pointer' : 'not-allowed',
            transition: 'background var(--duration-fast) var(--ease-out)',
          }}
        >
          Save
        </button>
      </form>
      <p className="text-xs mt-1.5" style={{ color: 'var(--surface-600)' }}>
        Get your key at console.anthropic.com. Stored in memory only — not persisted.
      </p>
    </div>
  )
}
