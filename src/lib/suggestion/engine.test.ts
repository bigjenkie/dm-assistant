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

  it('throws when provider fails so caller can handle the error', async () => {
    const provider: LLMProvider = {
      name: 'failing',
      generate: vi.fn().mockRejectedValue(new Error('connection refused')),
      healthCheck: vi.fn().mockResolvedValue(false),
    }
    const engine = new SuggestionEngine(provider)

    await expect(engine.runSuggest({
      campaignContext: '',
      characterBackstories: '',
      recentTranscript: 'Hello',
      fullTranscript: 'Hello',
      sessionElapsed: 60,
    })).rejects.toThrow('connection refused')
  })

  it('setProvider swaps the active provider', async () => {
    const original = createMockProvider('NONE')
    const replacement = createMockProvider(
      'TYPE: RECALL\nTITLE: Reva\nBODY: Tiefling fence.\nDM_ONLY: false'
    )
    const engine = new SuggestionEngine(original)

    engine.setProvider(replacement)

    const suggestion = await engine.runSuggest({
      campaignContext: '',
      characterBackstories: '',
      recentTranscript: 'Find Reva',
      fullTranscript: 'Find Reva',
      sessionElapsed: 120,
    })

    expect(suggestion).not.toBeNull()
    expect(suggestion!.title).toBe('Reva')
    expect(original.generate).not.toHaveBeenCalled()
    expect(replacement.generate).toHaveBeenCalledOnce()
  })

  it('clearActiveSuggestions resets duplicate tracking', async () => {
    const provider = createMockProvider(
      'TYPE: RECALL\nTITLE: Mayor Hild\nBODY: Quest giver.\nDM_ONLY: false'
    )
    const engine = new SuggestionEngine(provider)
    const ctx = {
      campaignContext: '',
      characterBackstories: '',
      recentTranscript: 'Talk to Hild',
      fullTranscript: 'Talk to Hild',
      sessionElapsed: 600,
    }

    // First call succeeds, second suppressed by cooldown
    await engine.runSuggest(ctx)

    vi.advanceTimersByTime(300_001) // expire cooldown
    engine.clearActiveSuggestions()

    // After clearing + cooldown expiry, same entity can be suggested again
    const suggestion = await engine.runSuggest(ctx)
    expect(suggestion).not.toBeNull()
  })

  it('accumulates activeSuggestions across multiple pulls', async () => {
    let callCount = 0
    const provider: LLMProvider = {
      name: 'rotating',
      generate: vi.fn().mockImplementation(() => {
        callCount++
        const responses: Record<number, string> = {
          1: 'TYPE: RECALL\nTITLE: Mayor Hild\nBODY: Quest giver.\nDM_ONLY: false',
          2: 'TYPE: THREAD\nTITLE: Coded Letter\nBODY: Spider seal.\nDM_ONLY: true',
        }
        return Promise.resolve({ text: responses[callCount] ?? 'NONE', latencyMs: 50 })
      }),
      healthCheck: vi.fn().mockResolvedValue(true),
    }
    const engine = new SuggestionEngine(provider)

    const first = await engine.runSuggest({
      campaignContext: '',
      characterBackstories: '',
      recentTranscript: 'Talk to Hild',
      fullTranscript: '',
      sessionElapsed: 600,
    })
    const second = await engine.runSuggest({
      campaignContext: '',
      characterBackstories: '',
      recentTranscript: 'Check the letter',
      fullTranscript: '',
      sessionElapsed: 660,
    })

    expect(first!.title).toBe('Mayor Hild')
    expect(second!.title).toBe('Coded Letter')
  })

  it('panic button works with empty backstories', async () => {
    const provider = createMockProvider(
      'TYPE: IMPROV\nTITLE: Re-engage\nBODY: Ask the quiet player what their character notices.\nDM_ONLY: false'
    )
    const engine = new SuggestionEngine(provider)

    const suggestion = await engine.runPanic('phones_out', {
      campaignContext: 'Fantasy town',
      characterBackstories: '',
      recentTranscript: 'Two players talking',
      fullTranscript: 'Two players talking',
    })

    expect(suggestion).not.toBeNull()
    expect(suggestion!.source).toBe('panic')
  })

  it('question works with empty context', async () => {
    const provider = createMockProvider(
      'TYPE: RULES\nTITLE: Opportunity Attack\nBODY: Triggered when leaving reach.\nDM_ONLY: false'
    )
    const engine = new SuggestionEngine(provider)

    const suggestion = await engine.runQuestion('How do opportunity attacks work?', {
      campaignContext: '',
      characterBackstories: '',
      recentTranscript: '',
      fullTranscript: '',
    })

    expect(suggestion).not.toBeNull()
    expect(suggestion!.source).toBe('question')
  })

  it('assigns unique IDs to each suggestion', async () => {
    let callCount = 0
    const provider: LLMProvider = {
      name: 'multi',
      generate: vi.fn().mockImplementation(() => {
        callCount++
        return Promise.resolve({
          text: `TYPE: RECALL\nTITLE: NPC ${callCount}\nBODY: Info.\nDM_ONLY: false`,
          latencyMs: 50,
        })
      }),
      healthCheck: vi.fn().mockResolvedValue(true),
    }
    const engine = new SuggestionEngine(provider)

    const s1 = await engine.runSuggest({
      campaignContext: '', characterBackstories: '',
      recentTranscript: 'a', fullTranscript: 'a', sessionElapsed: 100,
    })
    const s2 = await engine.runPanic('need_npc', {
      campaignContext: '', characterBackstories: '',
      recentTranscript: 'b', fullTranscript: 'b',
    })

    expect(s1!.id).not.toBe(s2!.id)
  })
})
