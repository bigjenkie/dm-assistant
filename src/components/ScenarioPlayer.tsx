import { useState, useRef, useEffect, useCallback } from 'react'
import type { Scenario, ScenarioEntry } from '../lib/scenarios'
import { SCENARIOS } from '../lib/scenarios'

type Props = {
  onLoad: (scenario: Scenario, playedEntries: ScenarioEntry[]) => void
  onEntry: (entry: ScenarioEntry) => void
  onComplete: () => void
}

export function ScenarioPlayer({ onLoad, onEntry, onComplete }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [entryIndex, setEntryIndex] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scenarioRef = useRef<Scenario | null>(null)

  const scenario = selectedId ? SCENARIOS.find((s) => s.id === selectedId) ?? null : null

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // Schedule next entry
  const scheduleNext = useCallback((index: number, sc: Scenario, spd: number) => {
    clearTimer()
    if (index >= sc.entries.length) {
      setPlaying(false)
      onComplete()
      return
    }

    const entry = sc.entries[index]
    const prevDelay = index > 0 ? sc.entries[index - 1].delay : 0
    const gap = Math.max((entry.delay - prevDelay) * 1000 / spd, 200)

    timerRef.current = setTimeout(() => {
      onEntry(entry)
      setEntryIndex(index + 1)
      scheduleNext(index + 1, sc, spd)
    }, gap)
  }, [clearTimer, onEntry, onComplete])

  // Play/pause toggle
  useEffect(() => {
    if (playing && scenario) {
      scheduleNext(entryIndex, scenario, speed)
    } else {
      clearTimer()
    }
    return clearTimer
  }, [playing, speed]) // intentionally limited deps — scheduleNext handles the rest

  function handleStart(id: string) {
    const sc = SCENARIOS.find((s) => s.id === id)
    if (!sc) return
    scenarioRef.current = sc
    setSelectedId(id)
    setEntryIndex(0)
    setPlaying(true)
    onLoad(sc, [])
  }

  function handleToggle() {
    if (!scenario) return
    if (playing) {
      setPlaying(false)
    } else {
      setPlaying(true)
    }
  }

  const isComplete = scenario ? entryIndex >= scenario.entries.length : false
  const progress = scenario ? Math.round((entryIndex / scenario.entries.length) * 100) : 0

  // Not started — show scenario picker
  if (!selectedId) {
    return (
      <div className="space-y-2">
        <h3
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--surface-500)', letterSpacing: '0.08em' }}
        >
          Scenarios
        </h3>
        {SCENARIOS.map((sc) => (
          <button
            key={sc.id}
            onClick={() => handleStart(sc.id)}
            className="w-full text-left px-3 py-2 text-xs"
            style={{
              background: 'var(--surface-900)',
              border: '1px solid var(--surface-800)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--surface-200)',
              cursor: 'pointer',
              transition: 'border-color var(--duration-fast) var(--ease-out), background var(--duration-fast) var(--ease-out)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--amber-700)'; e.currentTarget.style.background = 'var(--surface-850)' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--surface-800)'; e.currentTarget.style.background = 'var(--surface-900)' }}
          >
            <div className="font-medium" style={{ color: 'var(--surface-100)' }}>
              {sc.name}
            </div>
            <div style={{ color: 'var(--surface-500)' }}>
              {sc.system} — {sc.entries.length} lines
            </div>
          </button>
        ))}
      </div>
    )
  }

  // Playing / paused — show controls
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {/* Play/Pause */}
        <button
          onClick={handleToggle}
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

        {/* Speed */}
        {[1, 2, 4].map((s) => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
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

        {/* Progress */}
        <span className="text-xs" style={{ color: 'var(--surface-500)' }}>
          {entryIndex}/{scenario?.entries.length ?? 0}
        </span>

        {/* Reset */}
        <button
          onClick={() => { clearTimer(); setSelectedId(null); setPlaying(false); setEntryIndex(0) }}
          className="text-xs px-1.5 py-0.5"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--surface-600)',
            cursor: 'pointer',
          }}
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

      {/* Scenario name */}
      <div className="text-xs" style={{ color: 'var(--surface-500)' }}>
        {scenario?.name}
      </div>
    </div>
  )
}
