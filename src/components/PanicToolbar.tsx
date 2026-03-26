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
      {PANIC_BUTTONS.map((btn) => (
        <button
          key={btn.id}
          onClick={() => onPanic(btn.id)}
          disabled={disabled || loading === btn.id}
          title={btn.description}
          className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <span>{btn.icon}</span>
          <span>{btn.label}</span>
          {loading === btn.id && (
            <span className="animate-spin text-xs">⏳</span>
          )}
        </button>
      ))}
    </div>
  )
}
