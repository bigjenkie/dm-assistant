import { SCENARIOS } from '../lib/scenarios'
import type { Scenario } from '../lib/scenarios'

type Props = {
  onSelect: (scenario: Scenario) => void
}

export function ScenarioPicker({ onSelect }: Props) {
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
          onClick={() => onSelect(sc)}
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
