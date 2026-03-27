import { describe, it, expect } from 'vitest'
import { validatePanicButton } from './panic-validation'

describe('validatePanicButton', () => {
  const fullContext = {
    campaignContext: 'Campaign: Hollow King',
    characterBackstories: 'Vex: Ranger',
    recentTranscript: '[00:10:00] The party enters the tavern',
    fullTranscript: '[00:00:00] Session starts\n[00:10:00] The party enters the tavern',
  }

  const emptyContext = {
    campaignContext: '',
    characterBackstories: '',
    recentTranscript: '',
    fullTranscript: '',
  }

  // --- ALL CLEAR ---

  it('returns null when all required context is present', () => {
    expect(validatePanicButton('phones_out', fullContext)).toBeNull()
    expect(validatePanicButton('need_npc', fullContext)).toBeNull()
    expect(validatePanicButton('recap', fullContext)).toBeNull()
  })

  // --- TRANSCRIPT REQUIRED ---

  it('returns warning when recap has no transcript', () => {
    const result = validatePanicButton('recap', emptyContext)
    expect(result).not.toBeNull()
    expect(result).toContain('transcript')
  })

  it('returns warning when deliberation_loop has no transcript', () => {
    const result = validatePanicButton('deliberation_loop', emptyContext)
    expect(result).not.toBeNull()
    expect(result).toContain('transcript')
  })

  it('returns warning when too_easy has no transcript', () => {
    const result = validatePanicButton('too_easy', emptyContext)
    expect(result).not.toBeNull()
    expect(result).toContain('transcript')
  })

  it('returns warning when too_hard has no transcript', () => {
    const result = validatePanicButton('too_hard', emptyContext)
    expect(result).not.toBeNull()
    expect(result).toContain('transcript')
  })

  // --- BACKSTORIES REQUIRED ---

  it('returns warning when phones_out has no backstories', () => {
    const ctx = { ...fullContext, characterBackstories: '' }
    const result = validatePanicButton('phones_out', ctx)
    expect(result).not.toBeNull()
    expect(result).toContain('backstor')
  })

  it('returns warning when quiet_player has no backstories', () => {
    const ctx = { ...fullContext, characterBackstories: '' }
    const result = validatePanicButton('quiet_player', ctx)
    expect(result).not.toBeNull()
    expect(result).toContain('backstor')
  })

  it('returns warning when dead_air has no backstories', () => {
    const ctx = { ...fullContext, characterBackstories: '' }
    const result = validatePanicButton('dead_air', ctx)
    expect(result).not.toBeNull()
    expect(result).toContain('backstor')
  })

  // --- NEED_NPC ONLY NEEDS CAMPAIGN CONTEXT ---

  it('need_npc works with just campaign context (no transcript needed)', () => {
    const ctx = { ...emptyContext, campaignContext: 'Fantasy setting' }
    expect(validatePanicButton('need_npc', ctx)).toBeNull()
  })

  it('returns warning when need_npc has no campaign context', () => {
    const result = validatePanicButton('need_npc', emptyContext)
    expect(result).not.toBeNull()
    expect(result).toContain('campaign')
  })

  // --- PRIORITIZES MOST IMPORTANT MISSING FIELD ---

  it('mentions backstories first when both backstories and transcript are missing for phones_out', () => {
    const result = validatePanicButton('phones_out', emptyContext)
    expect(result).not.toBeNull()
    expect(result).toContain('backstor')
  })
})
