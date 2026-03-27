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
  phones_out: (ctx) => `A player seems disengaged. Analyze the recent transcript and identify the character who has spoken the LEAST recently. Generate a narrative hook that:
1. Calls them out by character name
2. Connects to their backstory if possible
3. Requires them to respond with a decision or action
4. Can be spoken aloud by the DM immediately

CHARACTER BACKSTORIES:
${ctx.characterBackstories}

RECENT TRANSCRIPT:
${ctx.recentTranscript}`,

  quiet_player: (ctx) => `A player has been quiet. Analyze the recent transcript and identify the character who has spoken the LEAST. Create a spotlight moment for that quiet character that:
1. Fits the current scene naturally (not forced)
2. Gives them something only their character can do or notice
3. Requires a decision or response from them
4. Can be delivered by the DM in one or two sentences

CHARACTER BACKSTORIES:
${ctx.characterBackstories}

RECENT TRANSCRIPT:
${ctx.recentTranscript}`,

  deliberation_loop: (ctx) => `The party is stuck deliberating and can't decide what to do. Inject an urgency event that forces them to act NOW. The event should:
1. Be appropriate to the current scene
2. Create a time pressure (something is happening, arriving, or expiring)
3. Make further deliberation dangerous or impossible
4. Be dramatic but not unfair

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

  dead_air: (ctx) => `There's an awkward silence at the table. Break it with a character-specific narrative prompt that:
1. Targets a specific character by name
2. Uses their backstory, bonds, or personality
3. Describes something they notice, feel, or remember in this moment
4. Invites them to respond in character

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

  energy_low: (ctx) => `The table energy is low — players seem bored or disengaged. Inject a high-energy narrative beat that:
1. Is dramatic, surprising, or exciting
2. Involves the current scene and characters
3. Demands immediate reaction from the players
4. Can be delivered in 2-3 sentences by the DM

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
