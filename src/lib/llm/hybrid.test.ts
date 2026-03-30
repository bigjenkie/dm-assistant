import { describe, it, expect, vi } from 'vitest'
import { createHybridProvider } from './hybrid'
import type { LLMProvider } from './provider'

function mockProvider(name: string, response: string = 'NONE'): LLMProvider {
  return {
    name,
    generate: vi.fn().mockResolvedValue({ text: response, latencyMs: 50 }),
    healthCheck: vi.fn().mockResolvedValue(true),
  }
}

describe('HybridProvider', () => {
  it('routes simple suggestions to local', async () => {
    const local = mockProvider('local', 'TYPE: RECALL\nTITLE: Test\nBODY: Info.\nDM_ONLY: false')
    const cloud = mockProvider('cloud')
    const hybrid = createHybridProvider({ local, cloud })

    await hybrid.generate('system', 'Generate ONE suggestion', 300)

    expect(local.generate).toHaveBeenCalled()
    expect(cloud.generate).not.toHaveBeenCalled()
  })

  it('routes phones_out prompts to cloud (contains "least recently")', async () => {
    const local = mockProvider('local')
    const cloud = mockProvider('cloud', 'TYPE: IMPROV\nTITLE: Hook\nBODY: Gruuk.\nDM_ONLY: false')
    const hybrid = createHybridProvider({ local, cloud })

    await hybrid.generate('system', 'identify the character who has spoken the LEAST recently', 400)

    expect(cloud.generate).toHaveBeenCalled()
    expect(local.generate).not.toHaveBeenCalled()
  })

  it('routes off-script prompts to cloud', async () => {
    const local = mockProvider('local')
    const cloud = mockProvider('cloud')
    const hybrid = createHybridProvider({ local, cloud })

    await hybrid.generate('system', 'The party has gone off-script into unplanned territory', 400)

    expect(cloud.generate).toHaveBeenCalled()
    expect(local.generate).not.toHaveBeenCalled()
  })

  it('routes escalation prompts to cloud', async () => {
    const local = mockProvider('local')
    const cloud = mockProvider('cloud')
    const hybrid = createHybridProvider({ local, cloud })

    await hybrid.generate('system', 'Suggest a combat escalation that fits', 400)

    expect(cloud.generate).toHaveBeenCalled()
  })

  it('routes de-escalation prompts to cloud', async () => {
    const local = mockProvider('local')
    const cloud = mockProvider('cloud')
    const hybrid = createHybridProvider({ local, cloud })

    await hybrid.generate('system', 'Suggest a way to de-escalate', 400)

    expect(cloud.generate).toHaveBeenCalled()
  })

  it('routes energy prompts to cloud', async () => {
    const local = mockProvider('local')
    const cloud = mockProvider('cloud')
    const hybrid = createHybridProvider({ local, cloud })

    await hybrid.generate('system', 'The table energy is low', 400)

    expect(cloud.generate).toHaveBeenCalled()
  })

  it('falls back to local when cloud fails', async () => {
    const local = mockProvider('local', 'fallback response')
    const cloud: LLMProvider = {
      name: 'cloud',
      generate: vi.fn().mockRejectedValue(new Error('API error')),
      healthCheck: vi.fn().mockResolvedValue(false),
    }
    const hybrid = createHybridProvider({ local, cloud })

    const result = await hybrid.generate('system', 'identify the character who has spoken the LEAST recently', 400)

    expect(cloud.generate).toHaveBeenCalled()
    expect(local.generate).toHaveBeenCalled()
    expect(result.text).toBe('fallback response')
  })

  it('throws when both local and cloud fail on a cloud-routed request', async () => {
    const local: LLMProvider = {
      name: 'local',
      generate: vi.fn().mockRejectedValue(new Error('local down')),
      healthCheck: vi.fn().mockResolvedValue(false),
    }
    const cloud: LLMProvider = {
      name: 'cloud',
      generate: vi.fn().mockRejectedValue(new Error('cloud down')),
      healthCheck: vi.fn().mockResolvedValue(false),
    }
    const hybrid = createHybridProvider({ local, cloud })

    await expect(hybrid.generate('system', 'LEAST recently spoken', 400))
      .rejects.toThrow('cloud down')
  })

  it('throws when local fails on a local-routed request', async () => {
    const local: LLMProvider = {
      name: 'local',
      generate: vi.fn().mockRejectedValue(new Error('ollama down')),
      healthCheck: vi.fn().mockResolvedValue(false),
    }
    const cloud = mockProvider('cloud')
    const hybrid = createHybridProvider({ local, cloud })

    await expect(hybrid.generate('system', 'simple suggestion', 300))
      .rejects.toThrow('ollama down')
  })

  it('health check passes if either backend is up', async () => {
    const local: LLMProvider = {
      name: 'local',
      generate: vi.fn(),
      healthCheck: vi.fn().mockResolvedValue(false),
    }
    const cloud = mockProvider('cloud')
    const hybrid = createHybridProvider({ local, cloud })

    expect(await hybrid.healthCheck()).toBe(true)
  })

  it('health check fails only if both are down', async () => {
    const local: LLMProvider = {
      name: 'local',
      generate: vi.fn(),
      healthCheck: vi.fn().mockResolvedValue(false),
    }
    const cloud: LLMProvider = {
      name: 'cloud',
      generate: vi.fn(),
      healthCheck: vi.fn().mockResolvedValue(false),
    }
    const hybrid = createHybridProvider({ local, cloud })

    expect(await hybrid.healthCheck()).toBe(false)
  })

  it('has name "hybrid"', () => {
    const hybrid = createHybridProvider({
      local: mockProvider('local'),
      cloud: mockProvider('cloud'),
    })
    expect(hybrid.name).toBe('hybrid')
  })
})
