import type { ProviderStatus, SessionState } from '../lib/types'

type Props = {
  sessionState: SessionState
  providerName: string
  providerStatus: ProviderStatus
  sessionElapsed: number
  suggestionCount: number
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

const STATUS_COLORS: Record<ProviderStatus, string> = {
  connected: 'var(--success)',
  disconnected: 'oklch(58% 0.22 25)',
  error: 'oklch(58% 0.22 25)',
  'no-model': 'var(--amber-500)',
  unconfigured: 'var(--surface-500)',
}

export function StatusBar({ sessionState, providerName, providerStatus, sessionElapsed, suggestionCount }: Props) {
  return (
    <div
      className="flex items-center justify-between px-4 py-1.5 text-xs"
      style={{
        background: 'var(--surface-900)',
        borderTop: '1px solid var(--surface-800)',
        color: 'var(--surface-500)',
      }}
    >
      <div className="flex items-center gap-4">
        <span>
          {sessionState === 'active' ? '🟢 Session Active' : sessionState === 'ended' ? '⏹️ Session Ended' : '⏸️ No Session'}
        </span>
        <span style={{ color: STATUS_COLORS[providerStatus] }}>
          {providerName === 'ollama' ? '🖥️' : providerName === 'mock' ? '🔧' : '☁️'} {providerName} — {providerStatus}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span>{suggestionCount} suggestions</span>
        {sessionState === 'active' && (
          <span style={{ fontFamily: 'var(--font-mono)' }}>
            ⏱️ {formatElapsed(sessionElapsed)}
          </span>
        )}
      </div>
    </div>
  )
}
