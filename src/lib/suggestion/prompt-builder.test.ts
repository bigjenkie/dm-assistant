import { describe, it, expect } from 'vitest'
import { buildSuggestionPrompt, buildPanicPrompt } from './prompt-builder'

describe('buildSuggestionPrompt', () => {
  const context = {
    campaignContext: 'Campaign: Curse of the Hollow King\nNPCs: Mayor Hild (quest giver)',
    characterBackstories: 'Vex: Ranger seeking revenge on dragon Scorrath',
    recentTranscript: '[00:42:15] Let us go talk to the mayor about the reward',
    activeSuggestions: ['Mayor Hild — quest giver'],
    sessionElapsed: 2520, // 42 minutes
  }

  it('includes campaign context in the system prompt', () => {
    const { system } = buildSuggestionPrompt(context)
    expect(system).toContain('Curse of the Hollow King')
  })

  it('includes character backstories in the system prompt', () => {
    const { system } = buildSuggestionPrompt(context)
    expect(system).toContain('Scorrath')
  })

  it('includes recent transcript in the user prompt', () => {
    const { user } = buildSuggestionPrompt(context)
    expect(user).toContain('go talk to the mayor')
  })

  it('includes active suggestions to avoid repeats', () => {
    const { user } = buildSuggestionPrompt(context)
    expect(user).toContain('Mayor Hild')
  })

  it('includes the response format instructions', () => {
    const { system } = buildSuggestionPrompt(context)
    expect(system).toContain('TYPE:')
    expect(system).toContain('TITLE:')
    expect(system).toContain('BODY:')
    expect(system).toContain('DM_ONLY:')
    expect(system).toContain('NONE')
  })

  it('handles empty transcript gracefully', () => {
    const { user } = buildSuggestionPrompt({ ...context, recentTranscript: '' })
    expect(user).toContain('No recent conversation')
  })
})

describe('buildPanicPrompt', () => {
  const context = {
    campaignContext: 'NPCs: Mayor Hild',
    characterBackstories: 'Vex: Ranger. Sable: Warlock.',
    recentTranscript: '[00:42:15] Vex attacks the skeleton',
    fullTranscript: '[00:00:00] Session starts...\n[00:42:15] Vex attacks the skeleton',
  }

  it('builds a phones_out prompt that targets least-active player', () => {
    const { user } = buildPanicPrompt('phones_out', context)
    expect(user).toContain('LEAST')
    expect(user).toContain('READ ALOUD')
    expect(user).toContain('backstory')
  })

  it('builds a need_npc prompt', () => {
    const { user } = buildPanicPrompt('need_npc', context)
    expect(user).toContain('NPC')
    expect(user).toContain('Name')
    expect(user).toContain('Personality')
  })

  it('builds a recap prompt', () => {
    const { user } = buildPanicPrompt('recap', context)
    expect(user).toContain('summary')
    expect(user).toContain('150 words')
  })

  it('includes full transcript for recap', () => {
    const { user } = buildPanicPrompt('recap', context)
    expect(user).toContain('Session starts')
  })

  // --- NEW PANIC BUTTONS ---

  it('builds a quiet_player prompt that creates a speakable hook', () => {
    const { user } = buildPanicPrompt('quiet_player', context)
    expect(user).toContain('LEAST')
    expect(user).toContain('READ ALOUD')
    expect(user).toContain(context.recentTranscript)
  })

  it('builds a deliberation_loop prompt that injects urgency', () => {
    const { user } = buildPanicPrompt('deliberation_loop', context)
    expect(user).toContain('READ ALOUD')
    expect(user).toContain('impossible')
    expect(user).toContain(context.recentTranscript)
  })

  it('builds a too_easy prompt that escalates combat', () => {
    const { user } = buildPanicPrompt('too_easy', context)
    expect(user).toContain('escalat')
    expect(user).toContain(context.recentTranscript)
  })

  it('builds a too_hard prompt that de-escalates combat', () => {
    const { user } = buildPanicPrompt('too_hard', context)
    expect(user).toContain('de-escalat')
    expect(user).toContain(context.recentTranscript)
  })

  it('builds a dead_air prompt that breaks silence with a speakable hook', () => {
    const { user } = buildPanicPrompt('dead_air', context)
    expect(user).toContain('silent')
    expect(user).toContain('READ ALOUD')
    expect(user).toContain(context.characterBackstories)
  })

  it('builds an off_script prompt for unplanned tangents', () => {
    const { user } = buildPanicPrompt('off_script', context)
    expect(user).toContain('off-script')
    expect(user).toContain(context.campaignContext)
    expect(user).toContain(context.recentTranscript)
  })

  it('builds an energy_low prompt that injects excitement', () => {
    const { user } = buildPanicPrompt('energy_low', context)
    expect(user).toContain('READ ALOUD')
    expect(user).toContain(context.recentTranscript)
  })
})
