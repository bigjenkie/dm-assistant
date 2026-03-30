type Props = {
  playing: boolean
  speed: number
  progress: number  // 0-100
  total: number
  current: number
  scenarioName: string
  onToggle: () => void
  onSpeedChange: (speed: number) => void
  onReset: () => void
}

export function PlaybackControls({
  playing, speed, progress, total, current,
  scenarioName, onToggle, onSpeedChange, onReset,
}: Props) {
  const isComplete = current >= total

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <button
          onClick={onToggle}
          disabled={isComplete}
          className="text-sm px-2 py-1"
          style={{
            background: 'var(--surface-900)',
            border: '1px solid var(--surface-700)',
            borderRadius: 'var(--radius-sm)',
            color: isComplete ? 'var(--surface-600)' : 'var(--amber-400)',
            cursor: isComplete ? 'default' : 'pointer',
          }}
        >
          {isComplete ? '✓' : playing ? '⏸' : '▶'}
        </button>

        {[1, 2, 4].map((s) => (
          <button
            key={s}
            onClick={() => onSpeedChange(s)}
            className="text-xs px-1.5 py-0.5"
            style={{
              background: speed === s ? 'var(--amber-900)' : 'transparent',
              border: speed === s ? '1px solid var(--amber-700)' : '1px solid var(--surface-800)',
              borderRadius: 'var(--radius-sm)',
              color: speed === s ? 'var(--amber-400)' : 'var(--surface-500)',
              cursor: 'pointer',
            }}
          >
            {s}x
          </button>
        ))}

        <span className="text-xs" style={{ color: 'var(--surface-500)' }}>
          {current}/{total}
        </span>

        <button
          onClick={onReset}
          className="text-xs px-1.5 py-0.5"
          style={{ background: 'none', border: 'none', color: 'var(--surface-600)', cursor: 'pointer' }}
        >
          ✕
        </button>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: '2px',
          background: 'var(--surface-800)',
          borderRadius: '1px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: 'var(--amber-500)',
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      <div className="text-xs truncate" style={{ color: 'var(--surface-600)' }}>
        {scenarioName}
      </div>
    </div>
  )
}
