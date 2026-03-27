import type { Suggestion } from '../lib/types'
import { SUGGESTION_ICONS } from '../lib/types'

type Props = {
  suggestion: Suggestion
  onPin: (id: string) => void
  onDismiss: (id: string) => void
}

export function SuggestionCard({ suggestion, onPin, onDismiss }: Props) {
  const icon = SUGGESTION_ICONS[suggestion.type] ?? '💬'
  const sourceLabel = suggestion.source === 'question' ? 'Q&A' : suggestion.source === 'panic' ? 'Panic' : suggestion.source === 'notification' ? 'Alert' : ''

  return (
    <div
      className="suggestion-card-enter mb-2 p-3"
      style={{
        background: suggestion.dmOnly ? 'var(--danger-muted)' : 'var(--surface-900)',
        border: `1px solid ${suggestion.dmOnly ? 'oklch(45% 0.12 25 / 50%)' : 'var(--surface-800)'}`,
        borderRadius: 'var(--radius-lg)',
        transition: 'transform var(--duration-normal) var(--ease-out), box-shadow var(--duration-normal) var(--ease-out), border-color var(--duration-normal) var(--ease-out)',
        boxShadow: suggestion.pinned ? '0 0 0 1px var(--amber-700)' : 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = suggestion.pinned
          ? '0 0 0 1px var(--amber-700), var(--shadow-md)'
          : 'var(--shadow-md)'
        e.currentTarget.style.borderColor = suggestion.dmOnly ? 'oklch(50% 0.15 25 / 60%)' : 'var(--surface-700)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = suggestion.pinned ? '0 0 0 1px var(--amber-700)' : 'none'
        e.currentTarget.style.borderColor = suggestion.dmOnly ? 'oklch(45% 0.12 25 / 50%)' : 'var(--surface-800)'
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <span>{icon}</span>
          <span className="font-semibold" style={{ color: 'var(--surface-100)' }}>{suggestion.title}</span>
          {suggestion.dmOnly && (
            <span
              className="text-xs font-semibold px-1.5 py-0.5"
              style={{
                background: 'oklch(40% 0.15 25)',
                color: 'oklch(80% 0.08 25)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              DM ONLY
            </span>
          )}
          {sourceLabel && (
            <span
              className="text-xs font-medium px-1.5 py-0.5"
              style={{
                background: 'var(--surface-800)',
                color: 'var(--surface-400)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {sourceLabel}
            </span>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => onPin(suggestion.id)}
            className="text-sm px-1"
            style={{
              color: 'var(--surface-500)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              transition: 'color var(--duration-fast) var(--ease-out)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--amber-400)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--surface-500)' }}
            title={suggestion.pinned ? 'Unpin' : 'Pin'}
          >
            {suggestion.pinned ? '📌' : '📍'}
          </button>
          <button
            onClick={() => onDismiss(suggestion.id)}
            className="text-sm px-1"
            style={{
              color: 'var(--surface-500)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              transition: 'color var(--duration-fast) var(--ease-out)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'oklch(65% 0.18 25)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--surface-500)' }}
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>
      <p className="text-sm mt-1.5 leading-relaxed" style={{ color: 'var(--surface-300)' }}>
        {suggestion.body}
      </p>
    </div>
  )
}
