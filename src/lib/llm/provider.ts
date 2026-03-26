export type LLMResponse = {
  text: string
  latencyMs: number
}

export type LLMProvider = {
  generate(system: string, user: string, maxTokens: number): Promise<LLMResponse>
  healthCheck(): Promise<boolean>
  name: string
}
