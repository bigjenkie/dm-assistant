/**
 * BDD Integration Tests — Suggestion Pipeline
 *
 * These test the full pipeline (engine → provider → parser → cooldown)
 * as integrated scenarios, mapped to BDD specs in specs/01, 02, and 07.
 * Uses mock LLM providers to simulate realistic responses.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SuggestionEngine } from './engine'
import type { LLMProvider } from '../llm/provider'

// --- Helpers ---

function mockProvider(response: string): LLMProvider {
  return {
    name: 'mock',
    generate: vi.fn().mockResolvedValue({ text: response, latencyMs: 100 }),
    healthCheck: vi.fn().mockResolvedValue(true),
  }
}

function failingProvider(): LLMProvider {
  return {
    name: 'failing',
    generate: vi.fn().mockRejectedValue(new Error('connection refused')),
    healthCheck: vi.fn().mockResolvedValue(false),
  }
}

const CAMPAIGN_CONTEXT = `Campaign: Curse of the Hollow King
System: D&D 5e
NPCs:
- Mayor Hild: Female human, mid-50s, quest giver, offered 500gp for Ashen Crown. SECRET: She is being blackmailed by the Hollow King's agents.
- Fendrel the Cartographer: Half-elf, shop in west market. Sold party a misleading map for 50gp. SECRET: Works for the Shadow Guild.
- Oldroot: Ancient treant in Bleakwood Forest. Spoke prophecy about the Ashen Crown.
Plot Hooks:
- Coded letter with spider seal (found in Klarg's chamber, not yet decoded)
- Sable promised to return the seedling to Oldroot
Encounters:
- Skeleton patrol: 4x Skeleton (AC 13, HP 13, vulnerable to bludgeoning)`

const BACKSTORIES = `Vex: Half-elf ranger. Seeking revenge on the dragon Scorrath who destroyed her village. Bond: locket with her mother's portrait.
Drogan: Dwarf cleric of Moradin. Exiled from his clan for a crime he didn't commit. Goal: prove his innocence.
Sable: Tiefling warlock. Patron is an archfey named Whisper. Secret: Sable can hear Whisper's voice in dreams.
Gruuk: Half-orc barbarian. Raised in a monastery of Pelor after being abandoned as an infant. The monks were his only family. Left after the monastery was attacked.`

// --- BDD Scenarios ---

describe('BDD: NPC Recall (spec-01, spec-02)', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('Given a campaign with Mayor Hild, When the transcript mentions "the mayor", Then a RECALL suggestion with her details is returned', async () => {
    // Given
    const provider = mockProvider(
      'TYPE: RECALL\nTITLE: Mayor Hild\nBODY: Female human, mid-50s. Quest giver who offered 500gp for the Ashen Crown. Nervous demeanor.\nDM_ONLY: false'
    )
    const engine = new SuggestionEngine(provider)

    // When
    const suggestion = await engine.runSuggest({
      campaignContext: CAMPAIGN_CONTEXT,
      characterBackstories: BACKSTORIES,
      recentTranscript: '[00:42:15] Player 1: Let us go talk to the mayor about the reward.',
      fullTranscript: '',
      sessionElapsed: 2535,
    })

    // Then
    expect(suggestion).not.toBeNull()
    expect(suggestion!.type).toBe('RECALL')
    expect(suggestion!.title).toBe('Mayor Hild')
    expect(suggestion!.body).toContain('500gp')
    expect(suggestion!.source).toBe('suggest')
  })

  it('Given a campaign with NPC secrets, When the NPC is recalled, Then DM_ONLY flag is set for secret content', async () => {
    // Given
    const provider = mockProvider(
      'TYPE: RECALL\nTITLE: Mayor Hild — Secret\nBODY: She is being blackmailed by the Hollow King\'s agents. She may be willing to share intel if the party earns her trust.\nDM_ONLY: true'
    )
    const engine = new SuggestionEngine(provider)

    // When
    const suggestion = await engine.runSuggest({
      campaignContext: CAMPAIGN_CONTEXT,
      characterBackstories: BACKSTORIES,
      recentTranscript: '[00:42:15] We confront Mayor Hild about the missing gold.',
      fullTranscript: '',
      sessionElapsed: 2535,
    })

    // Then
    expect(suggestion!.dmOnly).toBe(true)
  })
})

describe('BDD: Silence for Irrelevant Transcript (spec-02)', () => {
  it('Given off-topic table chatter, When a suggestion is requested, Then the engine returns null (NONE)', async () => {
    // Given
    const provider = mockProvider('NONE')
    const engine = new SuggestionEngine(provider)

    // When
    const suggestion = await engine.runSuggest({
      campaignContext: CAMPAIGN_CONTEXT,
      characterBackstories: BACKSTORIES,
      recentTranscript: '[01:15:00] Anyone want more pizza? Yeah grab me a slice.',
      fullTranscript: '',
      sessionElapsed: 4500,
    })

    // Then
    expect(suggestion).toBeNull()
  })
})

describe('BDD: Entity Cooldown Prevents Spam (spec-07 section 5)', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('Given Mayor Hild was just suggested, When the same entity is triggered again within 5 minutes, Then the suggestion is suppressed', async () => {
    // Given
    const provider = mockProvider(
      'TYPE: RECALL\nTITLE: Mayor Hild\nBODY: Quest giver.\nDM_ONLY: false'
    )
    const engine = new SuggestionEngine(provider)
    const ctx = {
      campaignContext: CAMPAIGN_CONTEXT,
      characterBackstories: BACKSTORIES,
      recentTranscript: 'Talk to the mayor',
      fullTranscript: '',
      sessionElapsed: 600,
    }

    // First pull succeeds
    const first = await engine.runSuggest(ctx)
    expect(first).not.toBeNull()

    // When — same entity within cooldown window
    const second = await engine.runSuggest(ctx)

    // Then
    expect(second).toBeNull()
  })

  it('Given Mayor Hild was suggested 5+ minutes ago, When the entity appears again, Then it is no longer suppressed', async () => {
    // Given
    const provider = mockProvider(
      'TYPE: RECALL\nTITLE: Mayor Hild\nBODY: Quest giver.\nDM_ONLY: false'
    )
    const engine = new SuggestionEngine(provider)
    const ctx = {
      campaignContext: CAMPAIGN_CONTEXT,
      characterBackstories: BACKSTORIES,
      recentTranscript: 'Talk to the mayor',
      fullTranscript: '',
      sessionElapsed: 600,
    }

    await engine.runSuggest(ctx)

    // When — cooldown expires
    vi.advanceTimersByTime(300_001)
    engine.clearActiveSuggestions()
    const suggestion = await engine.runSuggest(ctx)

    // Then
    expect(suggestion).not.toBeNull()
    expect(suggestion!.title).toBe('Mayor Hild')
  })
})

describe('BDD: Panic Button — Phones Out (spec-03, User Story 3)', () => {
  it('Given a session where one player is quiet, When the DM clicks Phones Out, Then a backstory-based hook targeting the quiet player is generated', async () => {
    // Given
    const provider = mockProvider(
      'TYPE: IMPROV\nTITLE: Spotlight: Gruuk\nBODY: Gruuk — as you stand in the noble\'s hall, you notice a prayer mat tucked under a bench. The weave is Pelorian. It reminds you of the monastery. What do you do?\nDM_ONLY: false'
    )
    const engine = new SuggestionEngine(provider)

    // When
    const suggestion = await engine.runPanic('phones_out', {
      campaignContext: CAMPAIGN_CONTEXT,
      characterBackstories: BACKSTORIES,
      recentTranscript: '[01:00:00] Vex: I search the room.\n[01:00:30] Drogan: I check the door.\n[01:01:00] Sable: I cast Detect Magic.',
      fullTranscript: '',
    })

    // Then
    expect(suggestion).not.toBeNull()
    expect(suggestion!.source).toBe('panic')
    expect(suggestion!.body).toContain('Gruuk')
  })
})

describe('BDD: Panic Button — Need an NPC (spec-03)', () => {
  it('Given the party is at the docks, When the DM clicks Need an NPC, Then a scene-appropriate NPC is generated', async () => {
    // Given
    const provider = mockProvider(
      'TYPE: IMPROV\nTITLE: Grel the Dockhand\nBODY: Half-orc male, gruff but fair. Quirk: always chewing on a fish bone. Knows which ships arrived last night and saw someone suspicious unloading crates after dark.\nDM_ONLY: false'
    )
    const engine = new SuggestionEngine(provider)

    // When
    const suggestion = await engine.runPanic('need_npc', {
      campaignContext: CAMPAIGN_CONTEXT,
      characterBackstories: BACKSTORIES,
      recentTranscript: '[00:30:00] We head to the docks to investigate.',
      fullTranscript: '',
    })

    // Then
    expect(suggestion).not.toBeNull()
    expect(suggestion!.title).toContain('Grel')
    expect(suggestion!.body).toContain('Quirk')
  })
})

describe('BDD: Panic Button — Recap (spec-03, User Story 5)', () => {
  it('Given a 45-minute session, When the DM clicks Recap, Then a read-aloud summary is generated', async () => {
    // Given
    const provider = mockProvider(
      'TYPE: RECALL\nTITLE: Session Recap\nBODY: The party descended into the goblin cave, freed Sildar Hallwinter, and defeated Klarg. They found a coded letter with a spider seal. Sildar revealed Gundren was taken to Cragmaw Castle.\nDM_ONLY: false'
    )
    const engine = new SuggestionEngine(provider)

    // When
    const suggestion = await engine.runPanic('recap', {
      campaignContext: CAMPAIGN_CONTEXT,
      characterBackstories: BACKSTORIES,
      recentTranscript: '[00:44:00] Okay let me recap before the break.',
      fullTranscript: '[00:00:00] Session begins...\n[00:15:00] Enter the cave\n[00:30:00] Fight Klarg\n[00:40:00] Find the letter\n[00:44:00] Break time',
    })

    // Then
    expect(suggestion).not.toBeNull()
    expect(suggestion!.body).toContain('Sildar')
    expect(suggestion!.body).toContain('spider seal')
  })
})

describe('BDD: Provider Switching Mid-Session (spec-07 section 1)', () => {
  it('Given a session using local Ollama, When the DM switches to Claude, Then the next suggestion uses the new provider', async () => {
    // Given — start with local
    const localProvider = mockProvider('TYPE: RECALL\nTITLE: Local Result\nBODY: From Ollama.\nDM_ONLY: false')
    const engine = new SuggestionEngine(localProvider)

    const first = await engine.runSuggest({
      campaignContext: CAMPAIGN_CONTEXT,
      characterBackstories: BACKSTORIES,
      recentTranscript: 'First pull',
      fullTranscript: '',
      sessionElapsed: 300,
    })
    expect(first!.title).toBe('Local Result')
    expect(localProvider.generate).toHaveBeenCalledOnce()

    // When — switch provider
    const claudeProvider = mockProvider('TYPE: RECALL\nTITLE: Claude Result\nBODY: From Anthropic.\nDM_ONLY: false')
    engine.setProvider(claudeProvider)

    const second = await engine.runPanic('need_npc', {
      campaignContext: CAMPAIGN_CONTEXT,
      characterBackstories: BACKSTORIES,
      recentTranscript: 'Second pull',
      fullTranscript: '',
    })

    // Then
    expect(second!.title).toBe('Claude Result')
    expect(claudeProvider.generate).toHaveBeenCalledOnce()
    // Original provider not called again
    expect(localProvider.generate).toHaveBeenCalledOnce()
  })
})

describe('BDD: Provider Failure and Recovery (spec-07 section 1)', () => {
  it('Given Ollama crashes mid-session, When a suggestion is requested, Then the engine throws so the caller can show feedback', async () => {
    // Given
    const engine = new SuggestionEngine(failingProvider())

    // When / Then
    await expect(engine.runSuggest({
      campaignContext: CAMPAIGN_CONTEXT,
      characterBackstories: BACKSTORIES,
      recentTranscript: 'Continue exploring',
      fullTranscript: '',
      sessionElapsed: 1800,
    })).rejects.toThrow('connection refused')
  })

  it('Given Ollama crashed, When it recovers and the DM pulls again, Then suggestions resume normally', async () => {
    // Given — start with failing provider
    const engine = new SuggestionEngine(failingProvider())
    await expect(engine.runSuggest({
      campaignContext: CAMPAIGN_CONTEXT,
      characterBackstories: BACKSTORIES,
      recentTranscript: 'Explore',
      fullTranscript: '',
      sessionElapsed: 1800,
    })).rejects.toThrow()

    // When — provider recovers (swap to working)
    engine.setProvider(mockProvider(
      'TYPE: THREAD\nTITLE: Coded Letter\nBODY: The letter with the spider seal is still undecoded.\nDM_ONLY: false'
    ))

    const recovered = await engine.runSuggest({
      campaignContext: CAMPAIGN_CONTEXT,
      characterBackstories: BACKSTORIES,
      recentTranscript: 'What about that letter?',
      fullTranscript: '',
      sessionElapsed: 1860,
    })

    // Then
    expect(recovered).not.toBeNull()
    expect(recovered!.title).toBe('Coded Letter')
  })
})

describe('BDD: Panic Button Failure (spec-07 section 12)', () => {
  it('Given the LLM provider is down, When the DM clicks a panic button, Then the engine throws so the UI can show feedback', async () => {
    // Given
    const engine = new SuggestionEngine(failingProvider())

    // When / Then
    await expect(engine.runPanic('phones_out', {
      campaignContext: CAMPAIGN_CONTEXT,
      characterBackstories: BACKSTORIES,
      recentTranscript: 'Players are distracted',
      fullTranscript: '',
    })).rejects.toThrow('connection refused')
  })
})

describe('BDD: Ad-hoc Question with Campaign Context (spec-01)', () => {
  it('Given a rules question during combat, When the DM asks about grappling, Then a RULES suggestion with correct info is returned', async () => {
    // Given
    const provider = mockProvider(
      'TYPE: RULES\nTITLE: Grapple Rules (5e)\nBODY: Grapple replaces one attack. Contested Athletics vs Athletics/Acrobatics. Target must be no more than one size larger. Grappled: speed becomes 0.\nDM_ONLY: false'
    )
    const engine = new SuggestionEngine(provider)

    // When
    const suggestion = await engine.runQuestion('Can the fighter grapple while prone?', {
      campaignContext: CAMPAIGN_CONTEXT,
      characterBackstories: BACKSTORIES,
      recentTranscript: '[01:20:00] Fighter is prone and wants to grapple the skeleton.',
      fullTranscript: '',
    })

    // Then
    expect(suggestion).not.toBeNull()
    expect(suggestion!.type).toBe('RULES')
    expect(suggestion!.source).toBe('question')
    expect(suggestion!.body).toContain('Grapple')
  })
})

describe('BDD: Suggestion Source Tagging (spec-01)', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('Each interaction mode tags the suggestion with the correct source', async () => {
    const provider = mockProvider(
      'TYPE: RECALL\nTITLE: Test\nBODY: Info.\nDM_ONLY: false'
    )
    const engine = new SuggestionEngine(provider)

    const suggest = await engine.runSuggest({
      campaignContext: '', characterBackstories: '',
      recentTranscript: 'a', fullTranscript: '', sessionElapsed: 100,
    })
    expect(suggest!.source).toBe('suggest')

    // Advance past cooldown for "Test" entity
    vi.advanceTimersByTime(300_001)

    const panic = await engine.runPanic('need_npc', {
      campaignContext: '', characterBackstories: '',
      recentTranscript: 'b', fullTranscript: '',
    })
    expect(panic!.source).toBe('panic')

    const question = await engine.runQuestion('How?', {
      campaignContext: '', characterBackstories: '',
      recentTranscript: 'c', fullTranscript: '',
    })
    expect(question!.source).toBe('question')
  })
})
