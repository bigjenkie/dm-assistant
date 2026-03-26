import type { LLMProvider } from '../llm/provider'
import type { Suggestion, PanicButtonId } from '../types'
import { parseSuggestionResponse } from './parser'
import { buildSuggestionPrompt, buildPanicPrompt } from './prompt-builder'
import { CooldownTracker } from './cooldown'

type SuggestContext = {
  campaignContext: string
  characterBackstories: string
  recentTranscript: string
  fullTranscript: string
  sessionElapsed: number
}

type PanicContext = {
  campaignContext: string
  characterBackstories: string
  recentTranscript: string
  fullTranscript: string
}

let nextId = 0
function generateId(): string {
  return `sug_${Date.now()}_${nextId++}`
}

export class SuggestionEngine {
  private provider: LLMProvider
  private cooldown = new CooldownTracker()
  private activeSuggestions: string[] = []

  constructor(provider: LLMProvider) {
    this.provider = provider
  }

  setProvider(provider: LLMProvider): void {
    this.provider = provider
  }

  async runSuggest(ctx: SuggestContext): Promise<Suggestion | null> {
    try {
      const { system, user } = buildSuggestionPrompt({
        campaignContext: ctx.campaignContext,
        characterBackstories: ctx.characterBackstories,
        recentTranscript: ctx.recentTranscript,
        activeSuggestions: this.activeSuggestions,
        sessionElapsed: ctx.sessionElapsed,
      })

      const response = await this.provider.generate(system, user, 300)
      const parsed = parseSuggestionResponse(response.text)

      if (!parsed) return null

      // Check cooldown on the title (entity name)
      if (this.cooldown.isSuppressed(parsed.title)) {
        return null
      }

      this.cooldown.register(parsed.title)
      this.activeSuggestions.push(parsed.title)

      return {
        id: generateId(),
        ...parsed,
        timestamp: ctx.sessionElapsed,
        pinned: false,
        dismissed: false,
        source: 'suggest',
      }
    } catch {
      return null
    }
  }

  async runPanic(buttonId: PanicButtonId, ctx: PanicContext): Promise<Suggestion | null> {
    try {
      const { system, user } = buildPanicPrompt(buttonId, ctx)
      const response = await this.provider.generate(system, user, 400)
      const parsed = parseSuggestionResponse(response.text)

      if (!parsed) return null

      return {
        id: generateId(),
        ...parsed,
        timestamp: 0,
        pinned: false,
        dismissed: false,
        source: 'panic',
      }
    } catch {
      return null
    }
  }

  async runQuestion(question: string, ctx: PanicContext): Promise<Suggestion | null> {
    try {
      const system = `You are a TTRPG assistant. Answer the DM's question concisely and accurately.
Use campaign context if relevant. Format your response as:
TYPE: [most relevant type]
TITLE: [short title]
BODY: [your answer]
DM_ONLY: false

CAMPAIGN CONTEXT:
${ctx.campaignContext}

CHARACTER BACKSTORIES:
${ctx.characterBackstories}`

      const user = `RECENT TRANSCRIPT:
${ctx.recentTranscript}

DM'S QUESTION: ${question}`

      const response = await this.provider.generate(system, user, 400)
      const parsed = parseSuggestionResponse(response.text)

      if (!parsed) return null

      return {
        id: generateId(),
        ...parsed,
        timestamp: 0,
        pinned: false,
        dismissed: false,
        source: 'question',
      }
    } catch {
      return null
    }
  }

  clearActiveSuggestions(): void {
    this.activeSuggestions = []
  }
}
