import { describe, it, expect } from 'vitest'
import { parseSuggestionResponse } from './parser'

describe('parseSuggestionResponse', () => {
  it('parses a well-formed response', () => {
    const raw = `TYPE: RECALL
TITLE: Mayor Hild
BODY: Female human, mid-50s. Quest giver who offered 500gp for the Ashen Crown. Nervous demeanor, fidgets with a silver ring.
DM_ONLY: false`

    const result = parseSuggestionResponse(raw)

    expect(result).not.toBeNull()
    expect(result!.type).toBe('RECALL')
    expect(result!.title).toBe('Mayor Hild')
    expect(result!.body).toContain('500gp')
    expect(result!.dmOnly).toBe(false)
  })

  it('returns null for NONE response', () => {
    expect(parseSuggestionResponse('NONE')).toBeNull()
    expect(parseSuggestionResponse('  NONE  ')).toBeNull()
    expect(parseSuggestionResponse('NONE\n')).toBeNull()
  })

  it('returns null for empty response', () => {
    expect(parseSuggestionResponse('')).toBeNull()
    expect(parseSuggestionResponse('   ')).toBeNull()
  })

  it('parses DM_ONLY: true correctly', () => {
    const raw = `TYPE: THREAD
TITLE: Mayor Hild — Secret
BODY: She is secretly working with the Hollow King under duress.
DM_ONLY: true`

    const result = parseSuggestionResponse(raw)
    expect(result!.dmOnly).toBe(true)
  })

  it('handles missing TYPE gracefully with UNKNOWN', () => {
    const raw = `TITLE: Some Info
BODY: Here is a suggestion.
DM_ONLY: false`

    const result = parseSuggestionResponse(raw)
    expect(result).not.toBeNull()
    expect(result!.type).toBe('UNKNOWN')
    expect(result!.title).toBe('Some Info')
  })

  it('handles unrecognized TYPE with UNKNOWN', () => {
    const raw = `TYPE: WEATHER_REPORT
TITLE: Bad Weather
BODY: It is raining.
DM_ONLY: false`

    const result = parseSuggestionResponse(raw)
    expect(result!.type).toBe('UNKNOWN')
  })

  it('handles completely unstructured text as fallback', () => {
    const raw = `The party should probably talk to the mayor about the quest. She might know more about the tomb.`

    const result = parseSuggestionResponse(raw)
    expect(result).not.toBeNull()
    expect(result!.type).toBe('UNKNOWN')
    expect(result!.title).toBe('Suggestion')
    expect(result!.body).toContain('mayor')
    expect(result!.dmOnly).toBe(false)
  })

  it('handles multiline BODY', () => {
    const raw = `TYPE: RULES
TITLE: Grapple Rules
BODY: Grapple replaces one attack. Contested Athletics vs Athletics or Acrobatics. Target must be no more than one size larger. Grappled condition: speed becomes 0.
DM_ONLY: false`

    const result = parseSuggestionResponse(raw)
    expect(result!.body).toContain('speed becomes 0')
  })

  it('trims whitespace from all fields', () => {
    const raw = `TYPE:   RECALL
TITLE:   Reva the Red
BODY:   Tiefling fence in the market.
DM_ONLY:   false  `

    const result = parseSuggestionResponse(raw)
    expect(result!.type).toBe('RECALL')
    expect(result!.title).toBe('Reva the Red')
    expect(result!.body).toBe('Tiefling fence in the market.')
  })
})
