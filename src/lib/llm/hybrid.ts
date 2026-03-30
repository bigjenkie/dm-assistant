import type { LLMProvider, LLMResponse } from './provider'

type HybridConfig = {
  local: LLMProvider
  cloud: LLMProvider
}

/**
 * Routes requests to local or cloud based on complexity.
 *
 * Local handles: simple recall, recaps, NPC generation, dead air
 * Cloud handles: panic buttons, backstory connections, combat adjustments,
 *                off-script scenarios, complex suggestions
 *
 * The routing is based on prompt length and keywords — longer/complex
 * prompts go to cloud, short lookups stay local.
 */
export function createHybridProvider(config: HybridConfig): LLMProvider {
  // Keywords that indicate complex reasoning needed → route to cloud
  const CLOUD_KEYWORDS = [
    'least recently',  // phones out / quiet player — needs transcript analysis
    'off-script',      // off script — needs creative improv
    'escalat',         // too easy — needs combat design
    'de-escalat',      // too hard — needs narrative finesse
    'energy',          // energy low — needs dramatic narration
    'deliberat',       // deliberation loop — needs urgency event
    'backstory',       // backstory connections
    'what happens next',  // follow-up requiring reasoning
    'connect to',      // follow-up requiring cross-reference
  ]

  function shouldUseCloud(system: string, user: string): boolean {
    const combined = (system + user).toLowerCase()
    return CLOUD_KEYWORDS.some((kw) => combined.includes(kw))
  }

  return {
    name: 'hybrid',

    async generate(system: string, user: string, maxTokens: number): Promise<LLMResponse> {
      const useCloud = shouldUseCloud(system, user)
      const provider = useCloud ? config.cloud : config.local

      try {
        const result = await provider.generate(system, user, maxTokens)
        return {
          ...result,
          // Tag which backend was used (for status bar display)
          text: result.text,
        }
      } catch (err) {
        // If cloud fails, fall back to local
        if (useCloud) {
          try {
            return await config.local.generate(system, user, maxTokens)
          } catch {
            throw err // both failed, throw the cloud error
          }
        }
        throw err
      }
    },

    async healthCheck(): Promise<boolean> {
      // Healthy if at least one backend works
      const [localOk, cloudOk] = await Promise.all([
        config.local.healthCheck(),
        config.cloud.healthCheck(),
      ])
      return localOk || cloudOk
    },
  }
}
