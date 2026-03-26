import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CooldownTracker } from './cooldown'

describe('CooldownTracker', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows an entity that has not been registered', () => {
    const tracker = new CooldownTracker()
    expect(tracker.isSuppressed('Mayor Hild')).toBe(false)
  })

  it('suppresses an entity after registration', () => {
    const tracker = new CooldownTracker()
    tracker.register('Mayor Hild')
    expect(tracker.isSuppressed('Mayor Hild')).toBe(true)
  })

  it('releases an entity after TTL expires', () => {
    const tracker = new CooldownTracker(300_000) // 5 minutes
    tracker.register('Mayor Hild')

    vi.advanceTimersByTime(300_001)

    expect(tracker.isSuppressed('Mayor Hild')).toBe(false)
  })

  it('keeps entity suppressed before TTL expires', () => {
    const tracker = new CooldownTracker(300_000)
    tracker.register('Mayor Hild')

    vi.advanceTimersByTime(200_000) // 3.3 minutes

    expect(tracker.isSuppressed('Mayor Hild')).toBe(true)
  })

  it('tracks different entities independently', () => {
    const tracker = new CooldownTracker()
    tracker.register('Mayor Hild')

    expect(tracker.isSuppressed('Mayor Hild')).toBe(true)
    expect(tracker.isSuppressed('Reva the Red')).toBe(false)
  })

  it('re-registration resets the TTL', () => {
    const tracker = new CooldownTracker(300_000)
    tracker.register('Mayor Hild')

    vi.advanceTimersByTime(200_000)
    tracker.register('Mayor Hild') // re-register

    vi.advanceTimersByTime(200_000) // 200ms after re-register (total 400ms from first)

    expect(tracker.isSuppressed('Mayor Hild')).toBe(true)
  })

  it('cleans up expired entries', () => {
    const tracker = new CooldownTracker(100)
    tracker.register('A')
    tracker.register('B')
    tracker.register('C')

    vi.advanceTimersByTime(101)
    tracker.cleanup()

    expect(tracker.size).toBe(0)
  })

  it('normalizes entity names (case-insensitive)', () => {
    const tracker = new CooldownTracker()
    tracker.register('Mayor Hild')

    expect(tracker.isSuppressed('mayor hild')).toBe(true)
    expect(tracker.isSuppressed('MAYOR HILD')).toBe(true)
  })
})
