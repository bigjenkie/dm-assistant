/**
 * Actual Play Test — Real transcript excerpts from Critical Role C2
 * Tests Claude's suggestion quality against real table conversation.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-... npx tsx scripts/actual-play-test.ts
 */
import { buildSuggestionPrompt, buildPanicPrompt } from '../src/lib/suggestion/prompt-builder'
import type { PanicButtonId } from '../src/lib/types'

// Campaign context derived from Critical Role Campaign 2 early episodes
const CAMPAIGN = `# Campaign 2: The Mighty Nein
System: D&D 5e. Setting: Wildemount (Exandria).

**NPCs:**
- Bryce Feelid: Lawmaster of Trostenwald. Halfling, stern but fair.
- Enon Brinjay: Deceased human, early 80s. Retired, helped fishermen. Found dead under suspicious circumstances.
- Rinaldo: Traveling performer, connected to the carnival. Under suspicion.
- The Gentleman: Criminal underworld figure in Zadash. Operates from the Evening Nip tavern.

**Locations:**
- Trostenwald: Small town, Ustaloch lake, market area, Old Mud Hole Tavern, carnival grounds.
- Ustaloch: Lake near Trostenwald. Strange creature emerged from it recently.
- Zadash: Major city, the party's next destination.

**Plot hooks:**
- Dead man (Enon Brinjay) found at the carnival — suspicious death, possibly connected to undead
- Water snake creature from Ustaloch — why did it surface?
- Carnival performers under suspicion — something is animating the dead
- Crownsguard zombies appeared near camp — undead activity escalating

**Active encounters:**
- 2x Zombie Crownsguard (AC 8, HP 22, slam +3, 1d6+1)
- Possible carnival-related undead threat`

const BACKSTORIES = `Caleb Widogast (Liam): Human Wizard. Filthy, wears a long coat he slept in. Blue eyes, reddish-brown hair. Haunted past — was part of a program that trained children as weapons for the Cerberus Assembly. Burned his parents alive under magical compulsion. Carries immense guilt. Brilliant but broken.

Nott the Brave (Sam): Goblin Rogue. Caleb's companion and protector. Despite being a goblin, she's anxious and motherly toward Caleb. Drinks heavily. SECRET: She's actually a halfling woman named Veth, transformed into a goblin by a hag. Desperately wants to return to her true form and her family.

Beauregard/Beau (Marisha): Human Monk (Cobalt Soul). Brash, confrontational, acts tough to hide vulnerability. Sent away by her father to the Cobalt Soul monastery. Excellent at gathering information. Doesn't trust authority.

Jester (Laura): Tiefling Cleric of the Traveler. Blue skin, cheerful, loves pastries and pranks. Sheltered upbringing — her mother is a famous courtesan. Her deity the Traveler is mysterious and possibly not a true god. Draws in her sketchbook constantly.

Fjord (Travis): Half-orc Warlock. Southern accent, polite, hides his past. His patron is a mysterious sea entity (Uk'otoa). Woke up on a beach with a falchion and new powers. Former sailor.

Mollymauk/Molly (Taliesin): Tiefling Blood Hunter. Flamboyant, covered in tattoos and jewelry. Woke up in a grave with no memory of his past. The name on the grave was "Lucien." Embraces the present, refuses to look back.

Yasha (Ashley): Aasimar Barbarian. Tall, muscular, quiet. From Xhorhas. Connected to a storm deity. Mourning a lost love. Often absent (joins when she can).`

// SCENE 1: Combat — zombie crownsguard attack at camp
const COMBAT_TRANSCRIPT = `MATT: You watch as these two zombified guards, their brass-colored scale armor clanking as their forms rise up, looking around, peer past the shadowed darkness around the campfire lighting the interior.
TRAVIS: Son of a bitch.
MATT: I would like you all to roll initiative, please.
MARISHA: Natural 20!
MATT: Beau at the top. 15 to 10?
LIAM: 11.
MATT: You watch as they both begin to lumber in your direction. Beau, you're up.
MARISHA: I turn to Jester and Molly. "Fucking— we probably shouldn't kill crownsguard, even if it's a zombie."
LAURA: "We should probably kill the zombies because anybody that gets bitten by a zombie turns into another zombie!"
MARISHA: Can I peek out and see the guard-zombies?
MATT: You watch them as you peek under the tent and they both just ran to the right.
MARISHA: Can I crawl out from under the tent and clear the gap with them and get up to them?
MATT: That's as close as you can get right there. You can go into a dash if you wanted to engage directly.
MARISHA: I'm going to do an elbow to the face and then another punch with the staff still in my hand and do Flurry of Blows.
MATT: Roll for the attack.
MARISHA: Oh god, this makes me so nervous. That's good! 19 for the first one.`

// SCENE 2: Investigation — gathering info at market
const SOCIAL_TRANSCRIPT = `LAURA: Let's go to, is there a market area?
MATT: They don't have a large bazaar, but there is an area where people sell simple wares, vegetables, meats, and crafted goods. If you want to make an investigation check.
LAURA: 16.
MATT: By asking questions and prodding people to talk about the previous night's events, you learn the deceased man's name was Enon Brinjay, a human in his early 80s who seemed healthy for his age. He'd been retired for some time but occasionally helped fishermen moving fish to and from the lake.
TALIESIN: Retired fisherman?
MARISHA: He was helping.
TALIESIN: Do we know where he was retired from and where he was staying, maybe where he was drinking?
MATT: He frequently drank at The Old Mud Hole Tavern.
TRAVIS: I should point out this is the second connection to the Ustaloch.
TALIESIN: The what?
TRAVIS: Before we met up with you two, we fought off a wicked, sick water snake.
LAURA: It came up out of the lake for some reason. I almost died.
TALIESIN: Was it undead?
TRAVIS: It could have been? It was nasty.
MARISHA: I lean into Fjord's ear: "There's something in the lake."
TRAVIS: "You think?"
MARISHA: "I'm just saying."
LAURA: I go up to the stall: "Excuse me, do you have any pastries?"`

const FULL_TRANSCRIPT = COMBAT_TRANSCRIPT + '\n\n' + SOCIAL_TRANSCRIPT

type Scenario = { name: string; type: 'suggest' | 'panic'; transcript: string; buttonId?: PanicButtonId }

const SCENARIOS: Scenario[] = [
  { name: 'Suggest — during combat', type: 'suggest', transcript: COMBAT_TRANSCRIPT },
  { name: 'Suggest — during investigation', type: 'suggest', transcript: SOCIAL_TRANSCRIPT },
  { name: 'Phones Out', type: 'panic', transcript: SOCIAL_TRANSCRIPT, buttonId: 'phones_out' },
  { name: 'Quiet Player', type: 'panic', transcript: SOCIAL_TRANSCRIPT, buttonId: 'quiet_player' },
  { name: 'Need an NPC', type: 'panic', transcript: SOCIAL_TRANSCRIPT, buttonId: 'need_npc' },
  { name: 'Off Script', type: 'panic', transcript: SOCIAL_TRANSCRIPT, buttonId: 'off_script' },
  { name: 'Dead Air', type: 'panic', transcript: COMBAT_TRANSCRIPT, buttonId: 'dead_air' },
  { name: 'Energy Low', type: 'panic', transcript: SOCIAL_TRANSCRIPT, buttonId: 'energy_low' },
  { name: 'Deliberation Loop', type: 'panic', transcript: SOCIAL_TRANSCRIPT, buttonId: 'deliberation_loop' },
  { name: 'Too Easy (combat)', type: 'panic', transcript: COMBAT_TRANSCRIPT, buttonId: 'too_easy' },
  { name: 'Too Hard (combat)', type: 'panic', transcript: COMBAT_TRANSCRIPT, buttonId: 'too_hard' },
  { name: 'Recap', type: 'panic', transcript: FULL_TRANSCRIPT, buttonId: 'recap' },
]

function getPrompt(s: Scenario): { system: string; user: string } {
  if (s.type === 'suggest') {
    return buildSuggestionPrompt({
      campaignContext: CAMPAIGN,
      characterBackstories: BACKSTORIES,
      recentTranscript: s.transcript,
      activeSuggestions: [],
      sessionElapsed: 3600,
    })
  }
  return buildPanicPrompt(s.buttonId!, {
    campaignContext: CAMPAIGN,
    characterBackstories: BACKSTORIES,
    recentTranscript: s.transcript,
    fullTranscript: FULL_TRANSCRIPT,
  })
}

async function callClaude(system: string, user: string): Promise<{ text: string; ms: number }> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('Set ANTHROPIC_API_KEY')
  const start = performance.now()
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      temperature: 0.7,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })
  if (!res.ok) throw new Error(`Claude ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = await res.json()
  const text = data.content.filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('')
  return { text, ms: Math.round(performance.now() - start) }
}

function wrap(text: string, width = 72): string {
  const lines: string[] = []
  for (const line of text.split('\n')) {
    if (line.length <= width) { lines.push(line); continue }
    let remaining = line
    while (remaining.length > width) {
      let cut = remaining.lastIndexOf(' ', width)
      if (cut <= 0) cut = width
      lines.push(remaining.slice(0, cut))
      remaining = remaining.slice(cut).trimStart()
    }
    if (remaining) lines.push(remaining)
  }
  return lines.join('\n')
}

async function main() {
  console.log('\n' + '═'.repeat(74))
  console.log('  ACTUAL PLAY TEST — Claude Sonnet on Real Critical Role Transcripts')
  console.log('═'.repeat(74))
  console.log('  Source: Critical Role Campaign 2, Episodes 1-3 (fan transcripts)')
  console.log('  Context: Mighty Nein in Trostenwald, zombie investigation arc\n')

  for (const scenario of SCENARIOS) {
    const { system, user } = getPrompt(scenario)

    process.stdout.write(`📋 ${scenario.name}... `)

    try {
      const result = await callClaude(system, user)
      console.log(`${result.ms}ms\n`)
      console.log(wrap(result.text))
      console.log('\n' + '─'.repeat(74) + '\n')
    } catch (err) {
      console.log(`ERROR: ${err}\n`)
    }
  }

  console.log('═'.repeat(74))
  console.log('  DONE')
  console.log('═'.repeat(74) + '\n')
}

main()
