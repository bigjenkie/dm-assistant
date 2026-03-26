// --- Suggestion Types ---

export type SuggestionType =
  | 'RECALL'
  | 'RULES'
  | 'THREAD'
  | 'COMBAT'
  | 'SPELL'
  | 'IMPROV'
  | 'BACKSTORY'
  | 'PACING'
  | 'UNKNOWN'

export type Suggestion = {
  id: string
  type: SuggestionType
  title: string
  body: string
  dmOnly: boolean
  timestamp: number    // seconds since session start
  pinned: boolean
  dismissed: boolean
  source: 'suggest' | 'notification' | 'panic' | 'question'
}

export const SUGGESTION_ICONS: Record<SuggestionType, string> = {
  RECALL: '📋',
  RULES: '📖',
  THREAD: '🧵',
  COMBAT: '⚔️',
  SPELL: '✨',
  IMPROV: '💡',
  BACKSTORY: '🎭',
  PACING: '⏱️',
  UNKNOWN: '💬',
}

// --- Transcript Types ---

export type TranscriptEntry = {
  id: string
  ts: number           // seconds since session start
  text: string
  confidence: number
}

// --- LLM Provider Types ---

export type ProviderType = 'ollama' | 'anthropic'

export type ProviderStatus =
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'no-model'
  | 'unconfigured'

export type LLMConfig = {
  provider: ProviderType
  ollamaBaseUrl: string
  ollamaModel: string
  anthropicApiKey: string | null
  anthropicModel: string
  maxTokens: number
  temperature: number
}

export const DEFAULT_LLM_CONFIG: LLMConfig = {
  provider: 'ollama',
  ollamaBaseUrl: 'http://localhost:11434',
  ollamaModel: 'llama3.1:8b-instruct-q4_K_M',
  anthropicApiKey: null,
  anthropicModel: 'claude-sonnet-4-6',
  maxTokens: 300,
  temperature: 0.7,
}

// --- Session Types ---

export type SessionState = 'idle' | 'active' | 'ended'

export type PanicButtonId =
  | 'phones_out'
  | 'need_npc'
  | 'recap'

export type PanicButton = {
  id: PanicButtonId
  label: string
  icon: string
  description: string
}

export const PANIC_BUTTONS: PanicButton[] = [
  { id: 'phones_out', label: 'Phones Out', icon: '📱', description: 'Re-engage a distracted player' },
  { id: 'need_npc', label: 'Need an NPC', icon: '🎲', description: 'Generate an NPC on the fly' },
  { id: 'recap', label: 'Recap', icon: '📜', description: 'Summarize the session so far' },
]
