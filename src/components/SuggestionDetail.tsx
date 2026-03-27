import type { Suggestion } from '../lib/types'
import { SUGGESTION_ICONS } from '../lib/types'

type Props = {
  suggestion: Suggestion
  onClose: () => void
  onFollowUp: (question: string) => void
}

export function SuggestionDetail({ suggestion, onClose, onFollowUp }: Props) {
  const icon = SUGGESTION_ICONS[suggestion.type] ?? '💬'

  const followUps = [
    { label: 'Tell me more', question: `Tell me more about "${suggestion.title}". What else should the DM know?` },
    { label: 'What happens next', question: `Based on "${suggestion.title}", what might happen next in this scene? Give me 2-3 possibilities.` },
    { label: 'Connect to backstory', question: `How does "${suggestion.title}" connect to any character backstories? Find a link the DM can use.` },
  ]

  const sectionStyle = {
    background: 'var(--surface-900)',
    border: '1px solid var(--surface-800)',
    borderRadius: 'var(--radius-md)',
    padding: '10px 12px',
  }

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{ background: 'var(--surface-950)' }}
    >
      {/* Header */}
      <div
        className="flex items-start justify-between gap-3 px-4 py-3 sticky top-0"
        style={{
          background: 'var(--surface-900)',
          borderBottom: '1px solid var(--surface-800)',
          zIndex: 10,
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--surface-100)' }}>
              {suggestion.title}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className="text-xs font-medium px-1.5 py-0.5"
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
              {suggestion.source !== 'suggest' && (
                <span
                  className="text-xs font-medium px-1.5 py-0.5"
                  style={{
                    background: 'var(--surface-800)',
                    color: 'var(--surface-400)',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  {suggestion.source === 'panic' ? 'Panic' : suggestion.source === 'question' ? 'Q&A' : 'Alert'}
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          aria-label="Close"
          onClick={onClose}
          className="text-sm px-2 py-1 shrink-0"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--surface-500)',
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div className="px-4 py-3 space-y-4">
        {/* Suggestion body */}
        <div>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--surface-200)' }}>
            {suggestion.body}
          </p>
        </div>

        {/* Trigger transcript */}
        {suggestion.triggerTranscript && (
          <div>
            <h4
              className="text-xs font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--surface-500)', letterSpacing: '0.08em' }}
            >
              What triggered this
            </h4>
            <div style={sectionStyle}>
              <p
                className="text-xs leading-relaxed whitespace-pre-wrap"
                style={{ color: 'var(--surface-400)', fontFamily: 'var(--font-mono)' }}
              >
                {suggestion.triggerTranscript}
              </p>
            </div>
          </div>
        )}

        {/* Raw response */}
        {suggestion.rawResponse && (
          <div>
            <h4
              className="text-xs font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--surface-500)', letterSpacing: '0.08em' }}
            >
              Full LLM Response
            </h4>
            <div style={sectionStyle}>
              <pre
                className="text-xs leading-relaxed whitespace-pre-wrap"
                style={{ color: 'var(--surface-400)', fontFamily: 'var(--font-mono)' }}
              >
                {suggestion.rawResponse}
              </pre>
            </div>
          </div>
        )}

        {/* Follow-up actions */}
        <div>
          <h4
            className="text-xs font-semibold uppercase tracking-wider mb-1.5"
            style={{ color: 'var(--surface-500)', letterSpacing: '0.08em' }}
          >
            Follow up
          </h4>
          <div className="flex flex-wrap gap-2">
            {followUps.map((f) => (
              <button
                key={f.label}
                aria-label={f.label}
                onClick={() => onFollowUp(f.question)}
                className="text-xs font-medium px-3 py-1.5"
                style={{
                  background: 'var(--surface-900)',
                  color: 'var(--surface-300)',
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
      </div>
    </div>
  )
}
