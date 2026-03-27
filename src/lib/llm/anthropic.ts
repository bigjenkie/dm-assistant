import type { LLMProvider, LLMResponse } from './provider'

type AnthropicConfig = {
  apiKey: string
  model: string
  temperature: number
}

export function createAnthropicProvider(config: AnthropicConfig): LLMProvider {
  return {
    name: 'anthropic',

    async generate(system: string, user: string, maxTokens: number): Promise<LLMResponse> {
      const start = performance.now()

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01',
        },
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
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': config.apiKey,
            'anthropic-version': '2023-06-01',
          },
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
