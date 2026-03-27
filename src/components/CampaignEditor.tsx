import { useRef } from 'react'

type Props = {
  context: string
  backstories: string
  onContextChange: (value: string) => void
  onBackstoriesChange: (value: string) => void
  sessionActive: boolean
}

async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

export function CampaignEditor({
  context,
  backstories,
  onContextChange,
  onBackstoriesChange,
  sessionActive,
}: Props) {
  const contextFileRef = useRef<HTMLInputElement>(null)
  const backstoriesFileRef = useRef<HTMLInputElement>(null)

  const inputStyle = {
    background: 'var(--surface-900)',
    border: '1px solid var(--surface-700)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--surface-200)',
    outline: 'none',
    transition: 'border-color var(--duration-fast) var(--ease-out)',
    resize: 'vertical' as const,
  }

  async function handleContextFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await readFileAsText(file)
    onContextChange(text)
    e.target.value = '' // reset so same file can be re-imported
  }

  async function handleBackstoriesFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    const texts: string[] = []
    for (const file of Array.from(files)) {
      texts.push(await readFileAsText(file))
    }

    const combined = texts.length === 1
      ? texts[0]
      : texts.map((t, i) => `--- ${Array.from(files)[i].name} ---\n${t}`).join('\n\n')

    onBackstoriesChange(combined)
    e.target.value = ''
  }

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium" style={{ color: 'var(--surface-400)' }}>
            Campaign Context
          </label>
          {!sessionActive && (
            <button
              aria-label="Import Context"
              onClick={() => contextFileRef.current?.click()}
              className="text-xs font-medium px-2 py-0.5"
              style={{
                background: 'var(--surface-850)',
                color: 'var(--surface-400)',
                border: '1px solid var(--surface-700)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                transition: 'background var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-800)'; e.currentTarget.style.color = 'var(--surface-300)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface-850)'; e.currentTarget.style.color = 'var(--surface-400)' }}
            >
              Import .md / .txt
            </button>
          )}
        </div>
        <input
          ref={contextFileRef}
          data-testid="context-file-input"
          type="file"
          accept=".txt,.md"
          onChange={handleContextFileChange}
          className="hidden"
        />
        <textarea
          value={context}
          onChange={(e) => onContextChange(e.target.value)}
          disabled={sessionActive}
          rows={6}
          placeholder="Paste your campaign notes: NPCs, locations, items, house rules, plot hooks..."
          className="w-full text-sm px-3 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
          style={inputStyle}
          onFocus={(e) => { if (!sessionActive) e.currentTarget.style.borderColor = 'var(--amber-700)' }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--surface-700)' }}
        />
        {sessionActive && (
          <p className="text-xs mt-1" style={{ color: 'var(--surface-600)' }}>
            Context is locked during an active session.
          </p>
        )}
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium" style={{ color: 'var(--surface-400)' }}>
            Character Backstories
          </label>
          {!sessionActive && (
            <button
              aria-label="Import Backstories"
              onClick={() => backstoriesFileRef.current?.click()}
              className="text-xs font-medium px-2 py-0.5"
              style={{
                background: 'var(--surface-850)',
                color: 'var(--surface-400)',
                border: '1px solid var(--surface-700)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                transition: 'background var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-800)'; e.currentTarget.style.color = 'var(--surface-300)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface-850)'; e.currentTarget.style.color = 'var(--surface-400)' }}
            >
              Import .md / .txt
            </button>
          )}
        </div>
        <input
          ref={backstoriesFileRef}
          data-testid="backstories-file-input"
          type="file"
          accept=".txt,.md"
          multiple
          onChange={handleBackstoriesFileChange}
          className="hidden"
        />
        <textarea
          value={backstories}
          onChange={(e) => onBackstoriesChange(e.target.value)}
          disabled={sessionActive}
          rows={4}
          placeholder="Character name, class, backstory, bonds, flaws, goals..."
          className="w-full text-sm px-3 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
          style={inputStyle}
          onFocus={(e) => { if (!sessionActive) e.currentTarget.style.borderColor = 'var(--amber-700)' }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--surface-700)' }}
        />
      </div>
    </div>
  )
}
