import { useState } from 'react'
import type { Suggestion } from '../lib/types'
import { SUGGESTION_ICONS } from '../lib/types'

type Props = {
  suggestion: Suggestion
  onPin: (id: string) => void
  onDismiss: (id: string) => void
  onFollowUp?: (question: string) => void
}

export function SuggestionCard({ suggestion, onPin, onDismiss, onFollowUp }: Props) {
  const icon = SUGGESTION_ICONS[suggestion.type] ?? '💬'
  const triggerLabel = suggestion.trigger ?? (
    suggestion.source === 'question' ? 'Question' : suggestion.source === 'panic' ? 'Panic' : suggestion.source === 'notification' ? 'Alert' : 'Suggest'
  )
  const [expanded, setExpanded] = useState(false)
  const [showRaw, setShowRaw] = useState(false)

  const followUps = [
    { label: 'More', question: `Tell me more about "${suggestion.title}". What else should the DM know?` },
    { label: 'Next', question: `Based on "${suggestion.title}", what might happen next? Give 2-3 possibilities.` },
    { label: 'Backstory link', question: `How does "${suggestion.title}" connect to character backstories?` },
  ]

  return (
    <div
      className="suggestion-card-enter mb-2"
      style={{
        background: suggestion.dmOnly ? 'var(--danger-muted)' : 'var(--surface-900)',
        border: `1px solid ${expanded ? 'var(--amber-700)' : suggestion.dmOnly ? 'oklch(45% 0.12 25 / 50%)' : 'var(--surface-800)'}`,
        borderRadius: 'var(--radius-lg)',
        transition: 'border-color var(--duration-normal) var(--ease-out), box-shadow var(--duration-normal) var(--ease-out)',
        boxShadow: suggestion.pinned ? '0 0 0 1px var(--amber-700)' : 'none',
      }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 p-3 pb-0">
        <div className="flex items-center gap-2 text-sm">
          <span>{icon}</span>
          <span className="font-semibold" style={{ color: 'var(--surface-100)' }}>{suggestion.title}</span>
          {suggestion.dmOnly && (
            <span
              className="text-xs font-semibold px-1.5 py-0.5"
              style={{ background: 'oklch(40% 0.15 25)', color: 'oklch(80% 0.08 25)', borderRadius: 'var(--radius-sm)' }}
            >
              DM ONLY
            </span>
          )}
          <span
            className="text-xs font-medium px-1.5 py-0.5"
            style={{ background: 'var(--surface-800)', color: 'var(--surface-400)', borderRadius: 'var(--radius-sm)' }}
          >
            {triggerLabel}
          </span>
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => onPin(suggestion.id)}
            className="text-sm px-1"
            style={{ color: 'var(--surface-500)', background: 'none', border: 'none', cursor: 'pointer', transition: 'color var(--duration-fast) var(--ease-out)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--amber-400)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--surface-500)' }}
            title={suggestion.pinned ? 'Unpin' : 'Pin'}
          >
            {suggestion.pinned ? '📌' : '📍'}
          </button>
          <button
            onClick={() => onDismiss(suggestion.id)}
            className="text-sm px-1"
            style={{ color: 'var(--surface-500)', background: 'none', border: 'none', cursor: 'pointer', transition: 'color var(--duration-fast) var(--ease-out)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'oklch(65% 0.18 25)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--surface-500)' }}
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Body — click to toggle detail */}
      <div
        className="px-3 py-2 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <p
          className="text-sm leading-relaxed"
          style={{ color: 'var(--surface-100)', lineHeight: '1.6' }}
        >
          {suggestion.body}
        </p>
        {!expanded && suggestion.reasoning && (
          <p className="text-xs mt-1" style={{ color: 'var(--surface-500)' }}>
            Tap for details
          </p>
        )}
      </div>

      {/* Expanded detail — inline dropdown */}
      {expanded && (
        <div
          className="px-3 pb-3 space-y-2"
          style={{ borderTop: '1px solid var(--surface-800)' }}
        >
          {/* Follow-up buttons */}
          {onFollowUp && (
            <div className="flex flex-wrap gap-1.5 pt-2">
              {followUps.map((f) => (
                <button
                  key={f.label}
                  aria-label={f.label}
                  onClick={() => onFollowUp(f.question)}
                  className="text-xs font-medium px-2.5 py-1"
                  style={{
                    background: 'var(--surface-850)',
                    color: 'var(--amber-400)',
                    border: '1px solid var(--surface-700)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    transition: 'background var(--duration-fast) var(--ease-out), border-color var(--duration-fast) var(--ease-out)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-800)'; e.currentTarget.style.borderColor = 'var(--amber-700)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface-850)'; e.currentTarget.style.borderColor = 'var(--surface-700)' }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {/* Reasoning — why this was suggested */}
          {suggestion.reasoning && (
            <div
              className="text-xs px-2.5 py-1.5"
              style={{
                background: 'var(--surface-950)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--surface-400)',
                borderLeft: '2px solid var(--amber-800)',
              }}
            >
              <span style={{ color: 'var(--amber-500)', fontWeight: 600 }}>Why: </span>
              {suggestion.reasoning}
            </div>
          )}

          {/* Trigger context — compact one-liner */}
          {suggestion.triggerTranscript && (
            <div
              className="text-xs px-2.5 py-1.5"
              style={{
                background: 'var(--surface-950)',
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

          {/* Raw response toggle */}
          {suggestion.rawResponse && (
            <div>
              <button
                onClick={() => setShowRaw(!showRaw)}
                className="text-xs"
                style={{ background: 'none', border: 'none', color: 'var(--surface-600)', cursor: 'pointer', padding: 0 }}
              >
                {showRaw ? '▾ Hide raw' : '▸ Raw response'}
              </button>
              {showRaw && (
                <pre
                  className="text-xs mt-1 px-2.5 py-1.5 whitespace-pre-wrap"
                  style={{
                    background: 'var(--surface-950)',
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
      )}
    </div>
  )
}
