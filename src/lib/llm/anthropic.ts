import type { LLMProvider, LLMResponse } from './provider'

type AnthropicConfig = {
  apiKey: string
  model: string
  temperature: number
  baseUrl?: string
}

// In the browser during development, route through the Vite dev proxy
// to avoid CORS. The proxy runs on the same origin as the page.
// In production native apps (Tauri/Capacitor), call the API directly.
const IS_DEV_SERVER = typeof window !== 'undefined' && (
  window.location.port === '5173' || window.location.port === '5174'
)
const DEFAULT_BASE_URL = IS_DEV_SERVER ? '/api/anthropic' : 'https://api.anthropic.com'

export function createAnthropicProvider(config: AnthropicConfig): LLMProvider {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL

  return {
    name: 'anthropic',

    async generate(system: string, user: string, maxTokens: number): Promise<LLMResponse> {
      const start = performance.now()

      // When going through the dev proxy, send the key in a query param.
      // The proxy strips it and injects the proper headers server-side.
      // When calling the API directly (Tauri), use standard headers.
      const isProxy = baseUrl.startsWith('/')
      const url = isProxy
        ? `${baseUrl}/v1/messages?key=${encodeURIComponent(config.apiKey)}`
        : `${baseUrl}/v1/messages`
      const headers: Record<string, string> = isProxy
        ? { 'Content-Type': 'application/json' }
        : { 'Content-Type': 'application/json', 'x-api-key': config.apiKey, 'anthropic-version': '2023-06-01' }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: config.model,
          max_tokens: maxTokens,
          temperature: config.temperature,
          system,
          messages: [
            { role: 'user', content: user },
          ],
        }),
      })

      if (!response.ok) {
        throw new Error(`Anthropic error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const latencyMs = Math.round(performance.now() - start)

      const text = data.content
        .filter((block: { type: string }) => block.type === 'text')
        .map((block: { text: string }) => block.text)
        .join('')

      return { text, latencyMs }
    },

    async healthCheck(): Promise<boolean> {
      try {
        const isProxy = baseUrl.startsWith('/')
        const url = isProxy
          ? `${baseUrl}/v1/messages?key=${encodeURIComponent(config.apiKey)}`
          : `${baseUrl}/v1/messages`
        const headers: Record<string, string> = isProxy
          ? { 'Content-Type': 'application/json' }
          : { 'Content-Type': 'application/json', 'x-api-key': config.apiKey, 'anthropic-version': '2023-06-01' }
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: config.model,
            max_tokens: 10,
            messages: [{ role: 'user', content: 'ping' }],
          }),
        })
        return response.ok
      } catch {
        return false
      }
    },
  }
}
