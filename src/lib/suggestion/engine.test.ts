import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SuggestionEngine } from './engine'
import type { LLMProvider } from '../llm/provider'

function createMockProvider(responseText: string): LLMProvider {
  return {
    name: 'mock',
    generate: vi.fn().mockResolvedValue({ text: responseText, latencyMs: 100 }),
    healthCheck: vi.fn().mockResolvedValue(true),
  }
}

describe('SuggestionEngine', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('generates a suggestion from transcript and context', async () => {
    const provider = createMockProvider(
      'TYPE: RECALL\nTITLE: Mayor Hild\nBODY: Quest giver, 500gp reward.\nDM_ONLY: false'
    )
    const engine = new SuggestionEngine(provider)

    const suggestion = await engine.runSuggest({
      campaignContext: 'NPCs: Mayor Hild',
      characterBackstories: '',
      recentTranscript: 'Let us talk to the mayor',
      fullTranscript: 'Let us talk to the mayor',
      sessionElapsed: 600,
    })

    expect(suggestion).not.toBeNull()
    expect(suggestion!.title).toBe('Mayor Hild')
    expect(suggestion!.type).toBe('RECALL')
    expect(suggestion!.source).toBe('suggest')
    expect(provider.generate).toHaveBeenCalledOnce()
  })

  it('returns null when LLM responds NONE', async () => {
    const provider = createMockProvider('NONE')
    const engine = new SuggestionEngine(provider)

    const suggestion = await engine.runSuggest({
      campaignContext: '',
      characterBackstories: '',
      recentTranscript: 'Pass the chips',
      fullTranscript: 'Pass the chips',
      sessionElapsed: 600,
    })

    expect(suggestion).toBeNull()
  })

  it('suppresses duplicate entity within cooldown window', async () => {
    const provider = createMockProvider(
      'TYPE: RECALL\nTITLE: Mayor Hild\nBODY: Quest giver.\nDM_ONLY: false'
    )
    const engine = new SuggestionEngine(provider)

    const ctx = {
      campaignContext: 'NPCs: Mayor Hild',
      characterBackstories: '',
      recentTranscript: 'Talk to Mayor Hild',
      fullTranscript: 'Talk to Mayor Hild',
      sessionElapsed: 600,
    }

    // First call — should return suggestion
    const first = await engine.runSuggest(ctx)
    expect(first).not.toBeNull()

    // Second call immediately — title is in cooldown, should be suppressed
    const second = await engine.runSuggest(ctx)
    expect(second).toBeNull()
  })

  it('generates panic button response bypassing cooldown', async () => {
    const provider = createMockProvider(
      'TYPE: IMPROV\nTITLE: Quick NPC\nBODY: Grel, a gruff half-orc dockworker.\nDM_ONLY: false'
    )
    const engine = new SuggestionEngine(provider)

    const suggestion = await engine.runPanic('need_npc', {
      campaignContext: 'Fantasy town setting',
      characterBackstories: '',
      recentTranscript: 'We go to the docks',
      fullTranscript: 'We go to the docks',
    })

    expect(suggestion).not.toBeNull()
    expect(suggestion!.source).toBe('panic')
  })

  it('generates ad-hoc question response', async () => {
    const provider = createMockProvider(
      'TYPE: RULES\nTITLE: Grapple Rules\nBODY: Replaces one attack, contested check.\nDM_ONLY: false'
    )
    const engine = new SuggestionEngine(provider)

    const suggestion = await engine.runQuestion('What are the grapple rules?', {
      campaignContext: 'D&D 5e',
      characterBackstories: '',
      recentTranscript: '',
      fullTranscript: '',
    })

    expect(suggestion).not.toBeNull()
    expect(suggestion!.source).toBe('question')
  })

  it('returns null and does not throw when provider fails', async () => {
    const provider: LLMProvider = {
      name: 'failing',
      generate: vi.fn().mockRejectedValue(new Error('connection refused')),
      healthCheck: vi.fn().mockResolvedValue(false),
    }
    const engine = new SuggestionEngine(provider)

    const suggestion = await engine.runSuggest({
      campaignContext: '',
      characterBackstories: '',
      recentTranscript: 'Hello',
      fullTranscript: 'Hello',
      sessionElapsed: 60,
    })

    expect(suggestion).toBeNull()
  })
})
