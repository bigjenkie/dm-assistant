import type { PanicButtonId } from '../types'

type SuggestionContext = {
  campaignContext: string
  characterBackstories: string
  recentTranscript: string
  activeSuggestions: string[]
  sessionElapsed: number
}

type PanicContext = {
  campaignContext: string
  characterBackstories: string
  recentTranscript: string
  fullTranscript: string
}

type Prompt = { system: string; user: string }

export function buildSuggestionPrompt(ctx: SuggestionContext): Prompt {
  const system = `You are a TTRPG assistant helping a Dungeon Master during a live session.
Your job is to surface ONE brief, useful suggestion based on the recent conversation.
Only suggest something if it is genuinely helpful. Silence is better than noise.

CAMPAIGN CONTEXT:
${ctx.campaignContext || 'No campaign context provided.'}

CHARACTER BACKSTORIES:
${ctx.characterBackstories || 'No backstories provided.'}

Choose the most relevant suggestion type:
- RECALL: Surface notes about an NPC, location, or item that was mentioned
- RULES: Clarify a rule relevant to what's happening
- THREAD: Remind the DM of an unresolved plot hook or promise
- COMBAT: Surface monster stats or tactical notes if combat is active
- SPELL: Surface spell/ability details if one was just used
- IMPROV: Offer quick improvisation material if players went off-script
- BACKSTORY: Connect the current scene to a character's personal story
- PACING: Gentle pacing nudge if the session needs it

If nothing useful comes to mind, respond with exactly: NONE

Format your response as:
TYPE: [type]
TITLE: [short title]
BODY: [2-3 sentences max, scannable in 3 seconds]
DM_ONLY: [true/false — true if this contains info players should not see]`

  const activeSummary = ctx.activeSuggestions.length > 0
    ? ctx.activeSuggestions.join('; ')
    : 'None'

  const transcript = ctx.recentTranscript.trim()
    ? ctx.recentTranscript
    : 'No recent conversation captured yet.'

  const user = `RECENT TABLE CONVERSATION (last 3 minutes):
${transcript}

SUGGESTIONS ALREADY SHOWN (do not repeat these):
${activeSummary}

Session time elapsed: ${Math.floor(ctx.sessionElapsed / 60)} minutes.

Generate ONE suggestion or respond NONE.`

  return { system, user }
}

const PANIC_PROMPTS: Record<PanicButtonId, (ctx: PanicContext) => string> = {
  phones_out: (ctx) => `A player is on their phone. Identify the character who has spoken the LEAST in the transcript.

DO NOT analyze the situation. Write 1-2 sentences the DM can READ ALOUD right now that force this character into the spotlight using their backstory.

The hook must require the player to respond — a question, a choice, or something only their character would notice.

CHARACTER BACKSTORIES:
${ctx.characterBackstories}

RECENT TRANSCRIPT:
${ctx.recentTranscript}`,

  quiet_player: (ctx) => `A player has been quiet. Identify the character who has spoken the LEAST in the transcript.

DO NOT analyze the situation. DO NOT explain who is quiet or why. Instead, write 1-2 sentences the DM can READ ALOUD to the table right now that pull this character into the scene.

Use their backstory to make it personal. Example format:
"Gruuk — as you stand near the doorway, you notice scratch marks on the frame. They look like claw marks. The same kind you saw on the monastery walls. What do you do?"

The output must be a ready-to-speak narrative prompt, not advice to the DM.

CHARACTER BACKSTORIES:
${ctx.characterBackstories}

RECENT TRANSCRIPT:
${ctx.recentTranscript}`,

  deliberation_loop: (ctx) => `The party is stuck deliberating. Write 2-3 sentences the DM can READ ALOUD right now that force a decision.

Something happens that makes waiting impossible — a timer starts, enemies arrive, the floor cracks, a hostage screams. Fit the current scene.

DO NOT give options or advice. Write the actual narration.

RECENT TRANSCRIPT:
${ctx.recentTranscript}`,

  too_easy: (ctx) => `The current combat is too easy — the party is winning without challenge. Suggest a combat escalation that:
1. Fits the current encounter and environment
2. Raises the stakes without being unfair
3. Could be reinforcements, a new ability, terrain change, or complication
4. Can be introduced mid-combat naturally

CAMPAIGN CONTEXT:
${ctx.campaignContext}

RECENT TRANSCRIPT:
${ctx.recentTranscript}`,

  too_hard: (ctx) => `The current combat is too hard — the party is getting overwhelmed. Suggest a way to de-escalate that:
1. Preserves narrative believability (no deus ex machina)
2. Could be: enemies retreat, environment shifts, an NPC intervenes, enemies offer terms
3. Gives the party a way out that feels earned
4. Doesn't make the players feel cheated

CAMPAIGN CONTEXT:
${ctx.campaignContext}

RECENT TRANSCRIPT:
${ctx.recentTranscript}`,

  dead_air: (ctx) => `The table has gone silent. Write 1-2 sentences the DM can READ ALOUD right now to break the silence.

Pick a specific character and describe something they notice, feel, or remember in this moment — using their backstory. End with "What do you do?" or a direct question to that character.

DO NOT give advice. Write the actual words the DM should speak.

CHARACTER BACKSTORIES:
${ctx.characterBackstories}

RECENT TRANSCRIPT:
${ctx.recentTranscript}`,

  off_script: (ctx) => `The party has gone off-script into unplanned territory. The DM needs material NOW. Generate:
1. A quick location description (2-3 sentences)
2. An NPC they might encounter (name, personality, one useful piece of info)
3. A hook that can connect this tangent back to the main campaign

CAMPAIGN CONTEXT:
${ctx.campaignContext}

RECENT TRANSCRIPT:
${ctx.recentTranscript}`,

  energy_low: (ctx) => `The table energy is low. Write 2-3 sentences the DM can READ ALOUD right now that inject drama and force immediate reaction.

Something happens — loud, sudden, or threatening. A crash, an arrival, a revelation, a sound. Make it fit the current scene.

DO NOT give advice or options. Write the actual narration the DM should deliver.

CHARACTER BACKSTORIES:
${ctx.characterBackstories}

RECENT TRANSCRIPT:
${ctx.recentTranscript}`,

  need_npc: (ctx) => `The DM needs an NPC right now. Generate one that fits the current scene:
- Name (setting-appropriate)
- Race and gender (brief)
- Personality (2-3 words, e.g., "gruff but fair")
- One memorable quirk
- One thing they know relevant to the current scene

CAMPAIGN CONTEXT:
${ctx.campaignContext}

RECENT TRANSCRIPT:
${ctx.recentTranscript}`,

  recap: (ctx) => `Summarize the session so far in under 150 words. Include:
- Key events in chronological order
- Decisions the party made
- NPCs encountered
- Current situation and location

Write it so the DM can read it aloud to the table as a "previously on..." summary.

FULL SESSION TRANSCRIPT:
${ctx.fullTranscript}`,
}

export function buildPanicPrompt(buttonId: PanicButtonId, ctx: PanicContext): Prompt {
  const system = `You are a TTRPG assistant helping a Dungeon Master during a live session.
The DM has pressed a panic button requesting immediate help.
Respond concisely and practically — the DM needs this NOW.

CAMPAIGN CONTEXT:
${ctx.campaignContext}

CHARACTER BACKSTORIES:
${ctx.characterBackstories}

Format your response as:
TYPE: [type]
TITLE: [short title]
BODY: [your response]
DM_ONLY: [true/false]`

  const user = PANIC_PROMPTS[buttonId](ctx)

  return { system, user }
}
