import { useState, useMemo } from 'react'

type ReferenceEntry = {
  name: string
  category: 'character' | 'npc' | 'location' | 'hook' | 'encounter'
  content: string
}

type Props = {
  context: string
  backstories: string
  onAskAbout?: (question: string) => void
}

const CATEGORY_ICONS: Record<string, string> = {
  character: '⚔️',
  npc: '👤',
  location: '📍',
  hook: '🧵',
  encounter: '⚔️',
}

const CATEGORY_LABELS: Record<string, string> = {
  character: 'PCs',
  npc: 'NPCs',
  location: 'Locations',
  hook: 'Plot Hooks',
  encounter: 'Encounters',
}

function parseEntries(context: string, backstories: string): ReferenceEntry[] {
  const entries: ReferenceEntry[] = []

  // Parse backstories — split by "# " headers or double newlines with names
  if (backstories.trim()) {
    const sections = backstories.split(/^# /m).filter(Boolean)
    if (sections.length > 1 || backstories.startsWith('# ')) {
      for (const section of sections) {
        const lines = section.trim().split('\n')
        const name = lines[0].trim().replace(/^#+\s*/, '')
        entries.push({ name, category: 'character', content: section.trim() })
      }
    } else {
      // Fallback: split by double newline
      const blocks = backstories.split(/\n\n+/).filter((b) => b.trim())
      for (const block of blocks) {
        const firstLine = block.trim().split('\n')[0]
        const name = firstLine.replace(/^[#*_]+\s*/, '').split(/[:(—–-]/)[0].trim()
        entries.push({ name: name.slice(0, 40), category: 'character', content: block.trim() })
      }
    }
  }

  // Parse context for NPCs, locations, hooks, encounters
  if (context.trim()) {
    const lines = context.split('\n')
    let currentSection = ''

    for (const line of lines) {
      const trimmed = line.trim()
      const lower = trimmed.toLowerCase()

      // Detect section headers — strip markdown bold/heading markers first
      const stripped = lower.replace(/^[#*\s]+/, '').replace(/\*+$/, '')
      if (stripped.match(/^(npcs?|characters?|cast)[:\s]/)) { currentSection = 'npc'; continue }
      if (stripped.match(/^(locations?|places?|key locations?)[:\s]/)) { currentSection = 'location'; continue }
      if (stripped.match(/^(plot hooks?|hooks?|active|unresolved)[:\s]/)) { currentSection = 'hook'; continue }
      if (stripped.match(/^(encounters?|planned encounters?|combat)[:\s]/)) { currentSection = 'encounter'; continue }
      if (trimmed.startsWith('##') || trimmed.startsWith('**') && trimmed.endsWith('**')) {
        // New section header — reset if not recognized
        if (!['npc', 'location', 'hook', 'encounter'].includes(currentSection)) {
          currentSection = ''
        }
      }

      // Parse list items in known sections
      if (currentSection && trimmed.startsWith('-')) {
        const content = trimmed.replace(/^-\s*/, '')
        const name = content.split(/[:(—–]/)[0].replace(/\*\*/g, '').trim()
        if (name.length > 1 && name.length < 60) {
          entries.push({
            name,
            category: currentSection as ReferenceEntry['category'],
            content,
          })
        }
      }
    }
  }

  return entries
}

export function CampaignReference({ context, backstories, onAskAbout }: Props) {
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const entries = useMemo(() => parseEntries(context, backstories), [context, backstories])

  const filtered = search.trim()
    ? entries.filter((e) =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.content.toLowerCase().includes(search.toLowerCase())
      )
    : entries

  const grouped = useMemo(() => {
    const groups: Record<string, ReferenceEntry[]> = {}
    for (const entry of filtered) {
      if (!groups[entry.category]) groups[entry.category] = []
      groups[entry.category].push(entry)
    }
    return groups
  }, [filtered])

  const categoryOrder = ['character', 'npc', 'location', 'hook', 'encounter']
  const hasData = entries.length > 0

  return (
    <div className="flex flex-col h-full">
      <h2
        className="text-xs font-semibold uppercase tracking-wider mb-2"
        style={{ color: 'var(--surface-500)', letterSpacing: '0.08em' }}
      >
        Campaign
      </h2>

      {!hasData && (
        <p className="text-xs italic" style={{ color: 'var(--surface-600)' }}>
          Import a campaign folder or load demo data...
        </p>
      )}

      {hasData && (
        <>
          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search campaign..."
            className="text-xs px-2.5 py-1.5 mb-2"
            style={{
              background: 'var(--surface-900)',
              border: '1px solid var(--surface-800)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--surface-200)',
              outline: 'none',
              transition: 'border-color var(--duration-fast) var(--ease-out)',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--amber-700)' }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--surface-800)' }}
          />

          {/* Grouped entries */}
          <div className="flex-1 overflow-y-auto space-y-2">
            {categoryOrder.map((cat) => {
              const items = grouped[cat]
              if (!items || items.length === 0) return null
              return (
                <div key={cat}>
                  <div
                    className="text-xs font-medium mb-1 flex items-center gap-1"
                    style={{ color: 'var(--surface-400)' }}
                  >
                    <span>{CATEGORY_ICONS[cat]}</span>
                    <span>{CATEGORY_LABELS[cat]}</span>
                    <span style={{ color: 'var(--surface-600)' }}>({items.length})</span>
                  </div>
                  {items.map((entry) => {
                    const entryId = `${entry.category}:${entry.name}`
                    const isExpanded = expandedId === entryId
                    return (
                      <div
                        key={entryId}
                        className="mb-1"
                        style={{
                          background: isExpanded ? 'var(--surface-900)' : 'transparent',
                          border: isExpanded ? '1px solid var(--surface-800)' : '1px solid transparent',
                          borderRadius: 'var(--radius-sm)',
                          transition: 'background var(--duration-fast) var(--ease-out)',
                        }}
                      >
                        <div
                          className="text-xs px-2 py-1 cursor-pointer flex items-center justify-between"
                          style={{ color: 'var(--surface-200)' }}
                          onClick={() => setExpandedId(isExpanded ? null : entryId)}
                          onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.background = 'var(--surface-900)' }}
                          onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.background = 'transparent' }}
                        >
                          <span className="truncate">{entry.name}</span>
                          <span style={{ color: 'var(--surface-600)', fontSize: '10px' }}>
                            {isExpanded ? '▾' : '▸'}
                          </span>
                        </div>
                        {isExpanded && (
                          <div className="px-2 pb-2">
                            <p
                              className="text-xs leading-relaxed whitespace-pre-wrap"
                              style={{ color: 'var(--surface-400)' }}
                            >
                              {entry.content}
                            </p>
                            {onAskAbout && (
                              <button
                                onClick={() => onAskAbout(`Tell me everything relevant about "${entry.name}" for the current scene.`)}
                                className="text-xs mt-1.5 px-2 py-0.5"
                                style={{
                                  background: 'none',
                                  border: '1px solid var(--surface-700)',
                                  borderRadius: 'var(--radius-sm)',
                                  color: 'var(--amber-400)',
                                  cursor: 'pointer',
                                  transition: 'border-color var(--duration-fast) var(--ease-out)',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--amber-700)' }}
                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--surface-700)' }}
                              >
                                Ask about this
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}

            {filtered.length === 0 && search.trim() && (
              <p className="text-xs italic" style={{ color: 'var(--surface-600)' }}>
                No matches for "{search}"
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
