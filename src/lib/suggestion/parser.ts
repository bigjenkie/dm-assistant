import type { SuggestionType } from '../types'

const VALID_TYPES: Set<string> = new Set([
  'RECALL', 'RULES', 'THREAD', 'COMBAT', 'SPELL', 'IMPROV', 'BACKSTORY', 'PACING',
])

type ParsedSuggestion = {
  type: SuggestionType
  title: string
  body: string
  reasoning?: string
  dmOnly: boolean
}

export function parseSuggestionResponse(raw: string): ParsedSuggestion | null {
  const trimmed = raw.trim()

  if (!trimmed || trimmed.toUpperCase() === 'NONE') {
    return null
  }

  const typeMatch = trimmed.match(/^TYPE:\s*(.+)$/m)
  const titleMatch = trimmed.match(/^TITLE:\s*(.+)$/m)
  const bodyMatch = trimmed.match(/^BODY:\s*([\s\S]+?)(?=^REASONING:|^DM_ONLY:|\s*$)/m)
  const reasoningMatch = trimmed.match(/^REASONING:\s*([\s\S]+?)(?=^DM_ONLY:|\s*$)/m)
  const dmOnlyMatch = trimmed.match(/^DM_ONLY:\s*(.+)$/m)

  // If we have at least a TITLE or BODY field, parse structured
  if (titleMatch || bodyMatch) {
    const rawType = typeMatch?.[1]?.trim().toUpperCase() ?? ''
    const type: SuggestionType = VALID_TYPES.has(rawType)
      ? (rawType as SuggestionType)
      : 'UNKNOWN'
    const title = titleMatch?.[1]?.trim() ?? 'Suggestion'
    const body = bodyMatch?.[1]?.trim() ?? ''
    const reasoning = reasoningMatch?.[1]?.trim()
    const dmOnly = dmOnlyMatch?.[1]?.trim().toLowerCase() === 'true'

    return { type, title, body, reasoning, dmOnly }
  }

  // Fallback: treat entire text as a plain suggestion
  return {
    type: 'UNKNOWN',
    title: 'Suggestion',
    body: trimmed,
    dmOnly: false,
  }
}
