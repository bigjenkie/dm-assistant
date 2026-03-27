import { useState, useRef, useEffect } from 'react'
import type { ProviderStatus, ProviderType, SessionState } from '../lib/types'

type Props = {
  sessionState: SessionState
  providerName: string
  providerStatus: ProviderStatus
  sessionElapsed: number
  suggestionCount: number
  onProviderSwitch?: (provider: ProviderType) => void
  onConfigureAnthropic?: () => void
  anthropicKeyConfigured?: boolean
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

export function StatusBar({
  sessionState,
  providerName,
  providerStatus,
  sessionElapsed,
  suggestionCount,
  onProviderSwitch,
  onConfigureAnthropic,
  anthropicKeyConfigured = false,
}: Props) {
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const switcherRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!switcherOpen) return

    function handleClick(e: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [switcherOpen])

  const providerIcon = providerName === 'ollama' ? '🖥️' : providerName === 'mock' ? '🔧' : '☁️'

  function handleSelect(provider: ProviderType) {
    onProviderSwitch?.(provider)
    setSwitcherOpen(false)
  }

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

        {/* Provider indicator — clickable */}
        <div className="relative" ref={switcherRef}>
          <button
            aria-label={`${providerName} — ${providerStatus}`}
            onClick={() => setSwitcherOpen(!switcherOpen)}
            className="text-xs"
            style={{
              color: STATUS_COLORS[providerStatus],
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)',
              transition: 'background var(--duration-fast) var(--ease-out)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-800)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
          >
            {providerIcon} {providerName} — {providerStatus}
          </button>

          {/* Switcher popover */}
          {switcherOpen && (
            <div
              className="absolute bottom-full left-0 mb-1 py-1"
              style={{
                background: 'var(--surface-850)',
                border: '1px solid var(--surface-700)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                minWidth: '200px',
                zIndex: 100,
              }}
            >
              {/* Ollama option */}
              <div
                data-active={providerName === 'ollama' ? 'true' : 'false'}
                onClick={() => handleSelect('ollama')}
                className="px-3 py-1.5 text-xs cursor-pointer flex items-center justify-between"
                style={{
                  color: providerName === 'ollama' ? 'var(--amber-400)' : 'var(--surface-300)',
                  background: providerName === 'ollama' ? 'var(--accent-muted)' : 'transparent',
                  transition: 'background var(--duration-fast) var(--ease-out)',
                }}
                onMouseEnter={(e) => { if (providerName !== 'ollama') e.currentTarget.style.background = 'var(--surface-800)' }}
                onMouseLeave={(e) => { if (providerName !== 'ollama') e.currentTarget.style.background = 'transparent' }}
              >
                <span>🖥️ Local (Ollama)</span>
                {providerName === 'ollama' && <span>✓</span>}
              </div>

              {/* Anthropic option */}
              <div
                data-active={providerName === 'anthropic' ? 'true' : 'false'}
                onClick={() => {
                  if (anthropicKeyConfigured) {
                    handleSelect('anthropic')
                  } else {
                    onConfigureAnthropic?.()
                    setSwitcherOpen(false)
                  }
                }}
                className="px-3 py-1.5 text-xs cursor-pointer flex items-center justify-between"
                style={{
                  color: providerName === 'anthropic' ? 'var(--amber-400)' : 'var(--surface-300)',
                  background: providerName === 'anthropic' ? 'var(--accent-muted)' : 'transparent',
                  transition: 'background var(--duration-fast) var(--ease-out)',
                }}
                onMouseEnter={(e) => { if (providerName !== 'anthropic') e.currentTarget.style.background = 'var(--surface-800)' }}
                onMouseLeave={(e) => { if (providerName !== 'anthropic') e.currentTarget.style.background = 'transparent' }}
              >
                <span>☁️ Claude (Anthropic)</span>
                {providerName === 'anthropic' && <span>✓</span>}
                {!anthropicKeyConfigured && (
                  <span className="text-xs" style={{ color: 'var(--amber-500)' }}>Set up</span>
                )}
              </div>
            </div>
          )}
        </div>
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
