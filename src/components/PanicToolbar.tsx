import { PANIC_BUTTONS } from '../lib/types'
import type { PanicButtonId } from '../lib/types'

type Props = {
  onPanic: (id: PanicButtonId) => void
  disabled: boolean
  loading: PanicButtonId | null
}

export function PanicToolbar({ onPanic, disabled, loading }: Props) {
  return (
    <div className="flex gap-2">
      {PANIC_BUTTONS.map((btn) => {
        const isLoading = loading === btn.id
        const isDisabled = disabled || isLoading

        return (
          <button
            key={btn.id}
            onClick={() => onPanic(btn.id)}
            disabled={isDisabled}
            title={btn.description}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm disabled:opacity-35 disabled:cursor-not-allowed"
            style={{
              background: 'var(--surface-900)',
              color: 'var(--surface-200)',
              border: '1px solid var(--surface-700)',
              borderRadius: 'var(--radius-md)',
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              transition: 'background var(--duration-fast) var(--ease-out), border-color var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out)',
            }}
            onMouseEnter={(e) => {
              if (!isDisabled) {
                e.currentTarget.style.background = 'var(--surface-850)'
                e.currentTarget.style.borderColor = 'var(--surface-600)'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--surface-900)'
              e.currentTarget.style.borderColor = 'var(--surface-700)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <span>{btn.icon}</span>
            <span>{btn.label}</span>
            {isLoading && (
              <span className="animate-pulse-glow text-xs">⏳</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
