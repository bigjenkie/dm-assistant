import { useRef, useState } from 'react'
import { parseCampaignFolder } from '../lib/campaign/folder-parser'
import type { FileEntry } from '../lib/campaign/folder-parser'

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
  const folderFileRef = useRef<HTMLInputElement>(null)
  const contextFileRef = useRef<HTMLInputElement>(null)
  const backstoriesFileRef = useRef<HTMLInputElement>(null)
  const [manualExpanded, setManualExpanded] = useState(false)

  const hasData = context.length > 0 || backstories.length > 0

  const inputStyle = {
    background: 'var(--surface-900)',
    border: '1px solid var(--surface-700)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--surface-200)',
    outline: 'none',
    transition: 'border-color var(--duration-fast) var(--ease-out)',
    resize: 'vertical' as const,
  }

  const secondaryBtnStyle = {
    background: 'var(--surface-850)',
    color: 'var(--surface-400)',
    border: '1px solid var(--surface-700)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    transition: 'background var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out)',
  }

  // --- Folder Import ---

  async function handleFolderChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    const entries: FileEntry[] = []
    for (const file of Array.from(files)) {
      const content = await readFileAsText(file)
      const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name
      const parts = relativePath.split('/')
      const pathWithoutRoot = parts.length > 1 ? parts.slice(1).join('/') : parts[0]
      entries.push({ path: pathWithoutRoot, content })
    }

    const parsed = parseCampaignFolder(entries)
    const contextStr = parsed.toContext()
    const backstoriesStr = parsed.toBackstories()

    if (contextStr) onContextChange(contextStr)
    if (backstoriesStr) onBackstoriesChange(backstoriesStr)

    e.target.value = ''
  }

  // --- Single File Imports ---

  async function handleContextFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    onContextChange(await readFileAsText(file))
    e.target.value = ''
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

  // --- Loaded Summary ---

  function LoadedSummary() {
    if (!hasData) return null

    const contextWords = context.split(/\s+/).filter(Boolean).length
    const backstoryWords = backstories.split(/\s+/).filter(Boolean).length

    return (
      <div
        className="flex items-center gap-3 px-3 py-2 text-xs"
        style={{
          background: 'var(--accent-muted)',
          border: '1px solid var(--amber-800)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--amber-400)',
        }}
      >
        <span style={{ fontSize: '1rem' }}>📂</span>
        <span className="font-medium">Campaign loaded</span>
        <span style={{ color: 'var(--surface-400)' }}>
          {contextWords > 0 && `${contextWords} words context`}
          {contextWords > 0 && backstoryWords > 0 && ' · '}
          {backstoryWords > 0 && `${backstoryWords} words backstories`}
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Loaded summary — always visible when data exists */}
      <LoadedSummary />

      {/* PRIMARY: Folder Import */}
      {!sessionActive && (
        <div>
          <button
            aria-label="Import Campaign Folder"
            onClick={() => folderFileRef.current?.click()}
            className="text-sm font-medium px-4 py-2.5 w-full"
            style={{
              background: 'var(--surface-900)',
              color: 'var(--surface-300)',
              border: '2px dashed var(--surface-700)',
              borderRadius: 'var(--radius-lg)',
              cursor: 'pointer',
              transition: 'background var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out), border-color var(--duration-fast) var(--ease-out)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--surface-850)'
              e.currentTarget.style.color = 'var(--surface-100)'
              e.currentTarget.style.borderColor = 'var(--amber-700)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--surface-900)'
              e.currentTarget.style.color = 'var(--surface-300)'
              e.currentTarget.style.borderColor = 'var(--surface-700)'
            }}
          >
            📂 Import Campaign Folder
          </button>
          <input
            ref={folderFileRef}
            data-testid="folder-file-input"
            type="file"
            // @ts-expect-error webkitdirectory is not in React's type defs
            webkitdirectory=""
            multiple
            onChange={handleFolderChange}
            className="hidden"
          />
          <p className="text-xs mt-1.5" style={{ color: 'var(--surface-600)' }}>
            Expects: campaign.md, characters/, npcs/, plot-hooks.md, encounters.md
          </p>
        </div>
      )}

      {/* SECONDARY: Manual Edit (collapsed by default) */}
      {!sessionActive && (
        <div>
          <button
            aria-label="Edit Manually"
            onClick={() => setManualExpanded(!manualExpanded)}
            className="text-xs font-medium px-2 py-1"
            style={{
              ...secondaryBtnStyle,
              background: 'transparent',
              border: 'none',
              color: 'var(--surface-500)',
            }}
          >
            {manualExpanded ? '▾ Hide manual edit' : '▸ Edit manually'}
          </button>

          {manualExpanded && (
            <div className="space-y-3 mt-2">
              {/* Campaign Context */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium" style={{ color: 'var(--surface-500)' }}>
                    Campaign Context
                  </label>
                  <button
                    aria-label="Import Context"
                    onClick={() => contextFileRef.current?.click()}
                    className="text-xs font-medium px-2 py-0.5"
                    style={secondaryBtnStyle}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-800)'; e.currentTarget.style.color = 'var(--surface-300)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface-850)'; e.currentTarget.style.color = 'var(--surface-400)' }}
                  >
                    Import .md / .txt
                  </button>
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
                  rows={5}
                  placeholder="Paste your campaign notes: NPCs, locations, items, house rules, plot hooks..."
                  className="w-full text-sm px-3 py-2"
                  style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--amber-700)' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--surface-700)' }}
                />
              </div>

              {/* Character Backstories */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium" style={{ color: 'var(--surface-500)' }}>
                    Character Backstories
                  </label>
                  <button
                    aria-label="Import Backstories"
                    onClick={() => backstoriesFileRef.current?.click()}
                    className="text-xs font-medium px-2 py-0.5"
                    style={secondaryBtnStyle}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-800)'; e.currentTarget.style.color = 'var(--surface-300)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface-850)'; e.currentTarget.style.color = 'var(--surface-400)' }}
                  >
                    Import .md / .txt
                  </button>
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
                  rows={4}
                  placeholder="Character name, class, backstory, bonds, flaws, goals..."
                  className="w-full text-sm px-3 py-2"
                  style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--amber-700)' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--surface-700)' }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Session active — read-only state */}
      {sessionActive && hasData && (
        <p className="text-xs" style={{ color: 'var(--surface-600)' }}>
          Context is locked during an active session.
        </p>
      )}
    </div>
  )
}
