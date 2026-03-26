import type { LLMProvider, LLMResponse } from './provider'

type OllamaConfig = {
  baseUrl: string
  model: string
  temperature: number
}

export function createOllamaProvider(config: OllamaConfig): LLMProvider {
  return {
    name: 'ollama',

    async generate(system: string, user: string, maxTokens: number): Promise<LLMResponse> {
      const start = performance.now()

      const response = await fetch(`${config.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          stream: false,
          options: {
            num_predict: maxTokens,
            temperature: config.temperature,
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const latencyMs = Math.round(performance.now() - start)

      return {
        text: data.message.content,
        latencyMs,
      }
    },

    async healthCheck(): Promise<boolean> {
      try {
        const response = await fetch(`${config.baseUrl}/api/tags`)
        return response.ok
      } catch {
        return false
      }
    },
  }
}
