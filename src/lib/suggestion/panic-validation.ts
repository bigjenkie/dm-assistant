import type { PanicButtonId } from '../types'

type PanicContext = {
  campaignContext: string
  characterBackstories: string
  recentTranscript: string
  fullTranscript: string
}

type Requirement = 'transcript' | 'backstories' | 'campaign'

const BUTTON_REQUIREMENTS: Record<PanicButtonId, Requirement[]> = {
  phones_out: ['backstories', 'transcript'],
  quiet_player: ['backstories', 'transcript'],
  deliberation_loop: ['transcript'],
  too_easy: ['transcript'],
  too_hard: ['transcript'],
  dead_air: ['backstories', 'transcript'],
  off_script: ['campaign', 'transcript'],
  energy_low: ['transcript'],
  need_npc: ['campaign'],
  recap: ['transcript'],
}

const MESSAGES: Record<Requirement, string> = {
  transcript: 'Add some transcript first — this button needs table conversation to work with.',
  backstories: 'Import character backstories first — this button uses them to personalize suggestions.',
  campaign: 'Import campaign context first — this button needs campaign data to generate relevant content.',
}

function hasContent(value: string): boolean {
  return value.trim().length > 0
}

/**
 * Returns a warning message if the panic button is missing required context,
 * or null if everything needed is present.
 */
export function validatePanicButton(buttonId: PanicButtonId, ctx: PanicContext): string | null {
  const requirements = BUTTON_REQUIREMENTS[buttonId]

  for (const req of requirements) {
    switch (req) {
      case 'transcript':
        if (!hasContent(ctx.recentTranscript) && !hasContent(ctx.fullTranscript)) {
          return MESSAGES.transcript
        }
        break
      case 'backstories':
        if (!hasContent(ctx.characterBackstories)) {
          return MESSAGES.backstories
        }
        break
      case 'campaign':
        if (!hasContent(ctx.campaignContext)) {
          return MESSAGES.campaign
        }
        break
    }
  }

  return null
}
