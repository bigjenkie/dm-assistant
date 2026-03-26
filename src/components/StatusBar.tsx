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
  connected: 'text-green-400',
  disconnected: 'text-red-400',
  error: 'text-red-400',
  'no-model': 'text-yellow-400',
  unconfigured: 'text-gray-500',
}

export function StatusBar({ sessionState, providerName, providerStatus, sessionElapsed, suggestionCount }: Props) {
  return (
    <div className="flex items-center justify-between bg-gray-900 border-t border-gray-800 px-4 py-1.5 text-xs text-gray-400">
      <div className="flex items-center gap-4">
        <span>
          {sessionState === 'active' ? '🟢 Session Active' : sessionState === 'ended' ? '⏹️ Session Ended' : '⏸️ No Session'}
        </span>
        <span className={STATUS_COLORS[providerStatus]}>
          {providerName === 'ollama' ? '🖥️' : '☁️'} {providerName} — {providerStatus}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span>{suggestionCount} suggestions</span>
        {sessionState === 'active' && <span>⏱️ {formatElapsed(sessionElapsed)}</span>}
      </div>
    </div>
  )
}
