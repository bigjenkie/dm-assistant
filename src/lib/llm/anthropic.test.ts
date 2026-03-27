import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createAnthropicProvider } from './anthropic'

describe('AnthropicProvider', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('sends correct request format to Anthropic Messages API', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        content: [{ type: 'text', text: 'TYPE: RECALL\nTITLE: Test\nBODY: Hello\nDM_ONLY: false' }],
        usage: { input_tokens: 100, output_tokens: 50 },
      }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const provider = createAnthropicProvider({
      apiKey: 'sk-ant-test-key',
      model: 'claude-sonnet-4-6',
      temperature: 0.7,
      baseUrl: 'https://api.anthropic.com',
    })

    await provider.generate('system prompt', 'user prompt', 300)

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'sk-ant-test-key',
          'anthropic-version': '2023-06-01',
        },
      })
    )

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.model).toBe('claude-sonnet-4-6')
    expect(body.max_tokens).toBe(300)
    expect(body.temperature).toBe(0.7)
    expect(body.system).toBe('system prompt')
    expect(body.messages).toEqual([
      { role: 'user', content: 'user prompt' },
    ])
  })

  it('returns text and latency from response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        content: [{ type: 'text', text: 'NONE' }],
        usage: { input_tokens: 50, output_tokens: 10 },
      }),
    }))

    const provider = createAnthropicProvider({
      apiKey: 'sk-ant-test-key',
      model: 'claude-sonnet-4-6',
      temperature: 0.7,
    })

    const result = await provider.generate('sys', 'usr', 300)
    expect(result.text).toBe('NONE')
    expect(result.latencyMs).toBeGreaterThanOrEqual(0)
  })

  it('throws on 401 unauthorized', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    }))

    const provider = createAnthropicProvider({
      apiKey: 'sk-ant-invalid',
      model: 'claude-sonnet-4-6',
      temperature: 0.7,
    })

    await expect(provider.generate('sys', 'usr', 300)).rejects.toThrow('401')
  })

  it('throws on 429 rate limit', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
    }))

    const provider = createAnthropicProvider({
      apiKey: 'sk-ant-test-key',
      model: 'claude-sonnet-4-6',
      temperature: 0.7,
    })

    await expect(provider.generate('sys', 'usr', 300)).rejects.toThrow('429')
  })

  it('throws on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))

    const provider = createAnthropicProvider({
      apiKey: 'sk-ant-test-key',
      model: 'claude-sonnet-4-6',
      temperature: 0.7,
    })

    await expect(provider.generate('sys', 'usr', 300)).rejects.toThrow('network error')
  })

  it('health check returns true when API responds with valid model', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        content: [{ type: 'text', text: 'ok' }],
        usage: { input_tokens: 5, output_tokens: 2 },
      }),
    }))

    const provider = createAnthropicProvider({
      apiKey: 'sk-ant-test-key',
      model: 'claude-sonnet-4-6',
      temperature: 0.7,
    })

    expect(await provider.healthCheck()).toBe(true)
  })

  it('health check returns false when API key is invalid', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    }))

    const provider = createAnthropicProvider({
      apiKey: 'sk-ant-invalid',
      model: 'claude-sonnet-4-6',
      temperature: 0.7,
    })

    expect(await provider.healthCheck()).toBe(false)
  })

  it('health check returns false on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')))

    const provider = createAnthropicProvider({
      apiKey: 'sk-ant-test-key',
      model: 'claude-sonnet-4-6',
      temperature: 0.7,
    })

    expect(await provider.healthCheck()).toBe(false)
  })

  it('has name "anthropic"', () => {
    const provider = createAnthropicProvider({
      apiKey: 'sk-ant-test-key',
      model: 'claude-sonnet-4-6',
      temperature: 0.7,
    })

    expect(provider.name).toBe('anthropic')
  })

  it('handles multi-block response by concatenating text blocks', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        content: [
          { type: 'text', text: 'TYPE: RECALL\nTITLE: Mayor Hild\n' },
          { type: 'text', text: 'BODY: Quest giver.\nDM_ONLY: false' },
        ],
        usage: { input_tokens: 100, output_tokens: 50 },
      }),
    }))

    const provider = createAnthropicProvider({
      apiKey: 'sk-ant-test-key',
      model: 'claude-sonnet-4-6',
      temperature: 0.7,
    })

    const result = await provider.generate('sys', 'usr', 300)
    expect(result.text).toContain('Mayor Hild')
    expect(result.text).toContain('Quest giver')
  })
})
