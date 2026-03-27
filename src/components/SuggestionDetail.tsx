import { useState } from 'react'
import type { Suggestion } from '../lib/types'
import { SUGGESTION_ICONS } from '../lib/types'

type Props = {
  suggestion: Suggestion
  onClose: () => void
  onFollowUp: (question: string) => void
}

export function SuggestionDetail({ suggestion, onClose, onFollowUp }: Props) {
  const icon = SUGGESTION_ICONS[suggestion.type] ?? '💬'
  const [showRaw, setShowRaw] = useState(false)

  const followUps = [
    { label: 'Tell me more', question: `Tell me more about "${suggestion.title}". What else should the DM know?` },
    { label: 'What happens next', question: `Based on "${suggestion.title}", what might happen next in this scene? Give me 2-3 possibilities.` },
    { label: 'Connect to backstory', question: `How does "${suggestion.title}" connect to any character backstories? Find a link the DM can use.` },
  ]

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{ background: 'var(--surface-950)' }}
    >
      {/* Header — compact */}
      <div
        className="flex items-center justify-between gap-2 px-3 py-2 sticky top-0"
        style={{
          background: 'var(--surface-900)',
          borderBottom: '1px solid var(--surface-800)',
          zIndex: 10,
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span>{icon}</span>
          <span className="text-sm font-semibold truncate" style={{ color: 'var(--surface-100)' }}>
            {suggestion.title}
          </span>
          <span
            className="text-xs px-1.5 py-0.5 shrink-0"
            style={{
              background: 'var(--surface-800)',
              color: 'var(--surface-400)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            {suggestion.type}
          </span>
          {suggestion.dmOnly && (
            <span
              className="text-xs font-semibold px-1.5 py-0.5 shrink-0"
              style={{
                background: 'oklch(40% 0.15 25)',
                color: 'oklch(80% 0.08 25)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              DM ONLY
            </span>
          )}
        </div>
        <button
          aria-label="Close"
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--surface-500)',
            cursor: 'pointer',
            fontSize: '14px',
            padding: '2px 6px',
          }}
        >
          ✕
        </button>
      </div>

      {/* Body — the hero, large and scannable */}
      <div className="px-3 py-3">
        <p
          className="text-sm leading-relaxed"
          style={{ color: 'var(--surface-100)', lineHeight: '1.6' }}
        >
          {suggestion.body}
        </p>
      </div>

      {/* Follow-ups — immediately accessible */}
      <div className="px-3 pb-2">
        <div className="flex flex-wrap gap-1.5">
          {followUps.map((f) => (
            <button
              key={f.label}
              aria-label={f.label}
              onClick={() => onFollowUp(f.question)}
              className="text-xs font-medium px-2.5 py-1"
              style={{
                background: 'var(--surface-900)',
                color: 'var(--amber-400)',
                border: '1px solid var(--surface-700)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                transition: 'background var(--duration-fast) var(--ease-out), border-color var(--duration-fast) var(--ease-out)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--surface-850)'
                e.currentTarget.style.borderColor = 'var(--amber-700)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--surface-900)'
                e.currentTarget.style.borderColor = 'var(--surface-700)'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Context — compact, collapsed */}
      <div className="px-3 pb-3 space-y-1.5">
        {suggestion.triggerTranscript && (
          <div
            className="text-xs px-2.5 py-1.5"
            style={{
              background: 'var(--surface-900)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--surface-500)',
              borderLeft: '2px solid var(--surface-700)',
            }}
          >
            <span style={{ color: 'var(--surface-400)' }}>Triggered by: </span>
            {suggestion.triggerTranscript.split('\n').slice(-2).join(' ').slice(0, 120)}
            {suggestion.triggerTranscript.length > 120 ? '...' : ''}
          </div>
        )}

        {/* Raw response — hidden behind toggle */}
        {suggestion.rawResponse && (
          <div>
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="text-xs"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--surface-600)',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              {showRaw ? '▾ Hide raw response' : '▸ Show raw response'}
            </button>
            {showRaw && (
              <pre
                className="text-xs mt-1 px-2.5 py-1.5 whitespace-pre-wrap"
                style={{
                  background: 'var(--surface-900)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--surface-500)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {suggestion.rawResponse}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
