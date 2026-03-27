import type { Suggestion } from '../lib/types'
import { SuggestionCard } from './SuggestionCard'

type Props = {
  suggestions: Suggestion[]
  onPin: (id: string) => void
  onDismiss: (id: string) => void
}

export function SuggestionPanel({ suggestions, onPin, onDismiss }: Props) {
  const pinned = suggestions.filter((s) => s.pinned && !s.dismissed)
  const unpinned = suggestions.filter((s) => !s.pinned && !s.dismissed)

  return (
    <div className="flex flex-col h-full">
      <h2
        className="text-xs font-semibold uppercase tracking-wider mb-2"
        style={{ color: 'var(--surface-500)', letterSpacing: '0.08em' }}
      >
        Suggestions
      </h2>
      <div className="flex-1 overflow-y-auto">
        {pinned.length > 0 && (
          <div className="mb-3">
            <div className="text-xs font-medium mb-1" style={{ color: 'var(--amber-500)' }}>
              Pinned
            </div>
            {pinned.map((s) => (
              <SuggestionCard key={s.id} suggestion={s} onPin={onPin} onDismiss={onDismiss} />
            ))}
          </div>
        )}
        {unpinned.map((s) => (
          <SuggestionCard key={s.id} suggestion={s} onPin={onPin} onDismiss={onDismiss} />
        ))}
        {suggestions.filter((s) => !s.dismissed).length === 0 && (
          <p className="text-sm italic" style={{ color: 'var(--surface-600)' }}>
            Suggestions will appear here once the session is active...
          </p>
        )}
      </div>
    </div>
  )
}
