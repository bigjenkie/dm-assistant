/**
 * Single-shot Claude call routed through the Claude Code subscription
 * (no API key required). Used by the dev-time eval and test scripts.
 *
 * Requires the `claude` CLI on PATH, signed in via `claude login`. Tools
 * are disabled and turns are capped at 1 so the model just produces text.
 */
import { query } from '@anthropic-ai/claude-agent-sdk'

export type CallResult = { text: string; ms: number }

export async function callClaude(
  system: string,
  user: string,
  model = 'claude-sonnet-4-6',
): Promise<CallResult> {
  const start = performance.now()
  const session = query({
    prompt: user,
    options: {
      systemPrompt: system,
      model,
      maxTurns: 1,
      tools: [],
      permissionMode: 'bypassPermissions',
    },
  })

  let text = ''
  for await (const message of session) {
    if (message.type !== 'assistant') continue
    for (const block of message.message.content) {
      if (block.type === 'text') text += block.text
    }
  }

  return { text, ms: Math.round(performance.now() - start) }
}
