type Props = {
  context: string
  backstories: string
  onContextChange: (value: string) => void
  onBackstoriesChange: (value: string) => void
  sessionActive: boolean
}

export function CampaignEditor({
  context,
  backstories,
  onContextChange,
  onBackstoriesChange,
  sessionActive,
}: Props) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">
          Campaign Context
        </label>
        <textarea
          value={context}
          onChange={(e) => onContextChange(e.target.value)}
          disabled={sessionActive}
          rows={6}
          placeholder="Paste your campaign notes: NPCs, locations, items, house rules, plot hooks..."
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed resize-y"
        />
        {sessionActive && (
          <p className="text-xs text-gray-500 mt-1">Context is locked during an active session.</p>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">
          Character Backstories
        </label>
        <textarea
          value={backstories}
          onChange={(e) => onBackstoriesChange(e.target.value)}
          disabled={sessionActive}
          rows={4}
          placeholder="Character name, class, backstory, bonds, flaws, goals..."
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed resize-y"
        />
      </div>
    </div>
  )
}
