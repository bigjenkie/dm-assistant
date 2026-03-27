import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createOllamaProvider } from './ollama'

describe('OllamaProvider', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('sends correct request format to Ollama API', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        message: { content: 'TYPE: RECALL\nTITLE: Test\nBODY: Hello\nDM_ONLY: false' },
      }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const provider = createOllamaProvider({
      baseUrl: 'http://localhost:11434',
      model: 'llama3.1:8b-instruct-q4_K_M',
      temperature: 0.7,
    })

    await provider.generate('system prompt', 'user prompt', 300)

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:11434/api/chat',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.any(String),
      })
    )

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.model).toBe('llama3.1:8b-instruct-q4_K_M')
    expect(body.messages).toEqual([
      { role: 'system', content: 'system prompt' },
      { role: 'user', content: 'user prompt' },
    ])
    expect(body.stream).toBe(false)
    expect(body.options.num_predict).toBe(300)
  })

  it('returns text and latency from response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        message: { content: 'NONE' },
      }),
    }))

    const provider = createOllamaProvider({
      baseUrl: 'http://localhost:11434',
      model: 'llama3.1:8b-instruct-q4_K_M',
      temperature: 0.7,
    })

    const result = await provider.generate('sys', 'usr', 300)
    expect(result.text).toBe('NONE')
    expect(result.latencyMs).toBeGreaterThanOrEqual(0)
  })

  it('throws on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    }))

    const provider = createOllamaProvider({
      baseUrl: 'http://localhost:11434',
      model: 'llama3.1:8b-instruct-q4_K_M',
      temperature: 0.7,
    })

    await expect(provider.generate('sys', 'usr', 300)).rejects.toThrow()
  })

  it('health check returns true when Ollama is reachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ models: [{ name: 'llama3.1' }] }),
    }))

    const provider = createOllamaProvider({
      baseUrl: 'http://localhost:11434',
      model: 'llama3.1:8b-instruct-q4_K_M',
      temperature: 0.7,
    })

    expect(await provider.healthCheck()).toBe(true)
  })

  it('health check returns false when Ollama is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')))

    const provider = createOllamaProvider({
      baseUrl: 'http://localhost:11434',
      model: 'llama3.1:8b-instruct-q4_K_M',
      temperature: 0.7,
    })

    expect(await provider.healthCheck()).toBe(false)
  })

  it('throws on network timeout', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network timeout')))

    const provider = createOllamaProvider({
      baseUrl: 'http://localhost:11434',
      model: 'llama3.1:8b-instruct-q4_K_M',
      temperature: 0.7,
    })

    await expect(provider.generate('sys', 'usr', 300)).rejects.toThrow('network timeout')
  })

  it('throws on malformed JSON response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.reject(new SyntaxError('Unexpected token')),
    }))

    const provider = createOllamaProvider({
      baseUrl: 'http://localhost:11434',
      model: 'llama3.1:8b-instruct-q4_K_M',
      temperature: 0.7,
    })

    await expect(provider.generate('sys', 'usr', 300)).rejects.toThrow()
  })

  it('handles empty message content', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: { content: '' } }),
    }))

    const provider = createOllamaProvider({
      baseUrl: 'http://localhost:11434',
      model: 'llama3.1:8b-instruct-q4_K_M',
      temperature: 0.7,
    })

    const result = await provider.generate('sys', 'usr', 300)
    expect(result.text).toBe('')
  })

  it('includes temperature in request options', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: { content: 'NONE' } }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const provider = createOllamaProvider({
      baseUrl: 'http://localhost:11434',
      model: 'llama3.1:8b-instruct-q4_K_M',
      temperature: 0.3,
    })

    await provider.generate('sys', 'usr', 200)

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.options.temperature).toBe(0.3)
    expect(body.options.num_predict).toBe(200)
  })
})
