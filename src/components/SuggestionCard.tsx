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
      className={`rounded-lg border p-3 mb-2 ${
        suggestion.dmOnly
          ? 'border-red-500/50 bg-red-950/20'
          : 'border-gray-700 bg-gray-900'
      } ${suggestion.pinned ? 'ring-1 ring-yellow-500/50' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <span>{icon}</span>
          <span className="font-medium text-gray-200">{suggestion.title}</span>
          {suggestion.dmOnly && (
            <span className="text-xs bg-red-800 text-red-200 px-1.5 py-0.5 rounded font-medium">
              DM ONLY
            </span>
          )}
          {sourceLabel && (
            <span className="text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">
              {sourceLabel}
            </span>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => onPin(suggestion.id)}
            className="text-gray-500 hover:text-yellow-400 text-sm px-1"
            title={suggestion.pinned ? 'Unpin' : 'Pin'}
          >
            {suggestion.pinned ? '📌' : '📍'}
          </button>
          <button
            onClick={() => onDismiss(suggestion.id)}
            className="text-gray-500 hover:text-red-400 text-sm px-1"
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>
      <p className="text-sm text-gray-300 mt-1.5 leading-relaxed">{suggestion.body}</p>
    </div>
  )
}
