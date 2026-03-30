/**
 * Quality Comparison — Claude Opus 4.6 vs Best Local Model
 *
 * Runs identical prompts through both models and displays responses
 * side by side for human evaluation of body quality.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-... npx tsx scripts/quality-comparison.ts
 */
import { buildSuggestionPrompt, buildPanicPrompt } from '../src/lib/suggestion/prompt-builder'

const CAMPAIGN = `# Curse of the Hollow King
System: D&D 5e. Setting: Ashenmere Valley.
NPCs:
- Mayor Hild: Human female, mid-50s, quest giver. Offered 500gp. SECRET: Being blackmailed by Hollow King's agents — they have her nephew.
- Fendrel the Cartographer: Half-elf, west market. Sold party a misleading map. SECRET: Shadow Guild agent, playing both sides.
- Oldroot: Ancient treant, Heartglade in Bleakwood. Spoke prophecy about the Ashen Crown. Dying from corruption.
Locations:
- Greyhold: Capital. Charred Flagon tavern. Market district.
- Bleakwood Forest: Corrupted. Oldroot's Heartglade. Cult activity.
- Tomb of Kael: Sealed tomb. Phylactery rumored inside.
Plot hooks:
- Coded letter with spider seal (undecoded, Shadow Guild)
- Sable promised to return seedling to Oldroot
- Missing silver shipment from Khor-Dral
- Hollow King's phylactery in Tomb of Kael
Encounters:
- Shadow Cultist patrol: 4x Cultist (AC 12, HP 9), 1x Cult Fanatic (AC 13, HP 33, hold person)
- Mayor Hild confrontation: DC 15 Insight, DC 18 Persuasion`

const BACKSTORIES = `Vex (Sarah): Half-elf Ranger. Village destroyed by dragon Scorrath. Mother's locket. Seeks revenge. Suspicious of Sable.
Drogan (Mike): Dwarf Cleric of Moradin. Exiled from Khor-Dral, framed. Seeks to clear name. Mentors Gruuk.
Sable (Jordan): Tiefling Warlock. Pact with archfey Whisper. DM SECRET: Whisper bound the Hollow King 200 years ago.
Gruuk (Sam): Half-orc Barbarian. Raised in Pelor monastery, burned by raiders. Terrified of rage. DM SECRET: Raiders were Hollow King's agents.`

const TRANSCRIPT = `[00:42] DM: You're back in the Charred Flagon after clearing the cultist cave.
[00:43] Vex: I order an ale and watch the door.
[00:44] Sable: I study the coded letter. Can I make an Investigation check?
[00:45] DM: Roll it. Fourteen. The cipher is sophisticated — not random bandits. The spider seal is a signet ring.
[00:47] Drogan: I ask around about the spider symbol. Seventeen on Persuasion.
[00:48] DM: An old woman says "That's a Guild mark. Shadow Guild. They ran smuggling routes before the disappearances."
[00:50] Sable: Shadow Guild? We should find Fendrel. He's a merchant.
[00:51] Vex: Wasn't Fendrel the one who sold us that bad map?
[00:52] Gruuk: I grip my axe. We go to Fendrel's shop.`

const FULL_TRANSCRIPT = `[00:00] DM: Last session you cleared the cave and found the coded letter.
${TRANSCRIPT}`

type TestScenario = {
  name: string
  type: 'suggest' | 'panic'
  buttonId?: string
  transcript?: string
}

const SCENARIOS: TestScenario[] = [
  { name: 'Suggest — NPC mentioned', type: 'suggest', transcript: TRANSCRIPT },
  { name: 'Phones Out', type: 'panic', buttonId: 'phones_out' },
  { name: 'Quiet Player', type: 'panic', buttonId: 'quiet_player' },
  { name: 'Need an NPC', type: 'panic', buttonId: 'need_npc' },
  { name: 'Off Script', type: 'panic', buttonId: 'off_script' },
  { name: 'Dead Air', type: 'panic', buttonId: 'dead_air' },
  { name: 'Energy Low', type: 'panic', buttonId: 'energy_low' },
  { name: 'Deliberation Loop', type: 'panic', buttonId: 'deliberation_loop' },
  { name: 'Too Easy', type: 'panic', buttonId: 'too_easy' },
  { name: 'Too Hard', type: 'panic', buttonId: 'too_hard' },
  { name: 'Recap', type: 'panic', buttonId: 'recap' },
]

function getPrompt(scenario: TestScenario): { system: string; user: string } {
  if (scenario.type === 'suggest') {
    return buildSuggestionPrompt({
      campaignContext: CAMPAIGN,
      characterBackstories: BACKSTORIES,
      recentTranscript: scenario.transcript ?? TRANSCRIPT,
      activeSuggestions: [],
      sessionElapsed: 3000,
    })
  } else {
    return buildPanicPrompt(scenario.buttonId as any, {
      campaignContext: CAMPAIGN,
      characterBackstories: BACKSTORIES,
      recentTranscript: TRANSCRIPT,
      fullTranscript: FULL_TRANSCRIPT,
    })
  }
}

async function callOllama(model: string, system: string, user: string): Promise<{ text: string; ms: number }> {
  const start = performance.now()
  const res = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      stream: false,
      options: { num_predict: 400, temperature: 0.7 },
    }),
  })
  const data = await res.json()
  return { text: data.message.content, ms: Math.round(performance.now() - start) }
}

async function callClaude(system: string, user: string): Promise<{ text: string; ms: number }> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY required')
  const start = performance.now()
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 16000,
      temperature: 1,
      thinking: { type: 'enabled', budget_tokens: 10000 },
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Claude ${res.status}: ${err.slice(0, 200)}`)
  }
  const data = await res.json()
  const text = data.content
    .filter((b: { type: string }) => b.type === 'text')
    .map((b: { text: string }) => b.text)
    .join('')
  const thinking = data.content
    .filter((b: { type: string }) => b.type === 'thinking')
    .map((b: { thinking: string }) => b.thinking)
    .join('')
  return {
    text: thinking ? `[THINKING]\n${thinking.slice(0, 300)}...\n\n[RESPONSE]\n${text}` : text,
    ms: Math.round(performance.now() - start),
  }
}

function divider(char = '─', len = 70) { return char.repeat(len) }

function wrap(text: string, width = 68): string {
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
  const localModel = 'phi4:14b'

  console.log(`\n${'═'.repeat(70)}`)
  console.log(`  QUALITY COMPARISON: Claude Opus 4.6 (thinking) vs ${localModel}`)
  console.log(`${'═'.repeat(70)}\n`)

  // Warm up local model
  process.stdout.write('Warming up local model... ')
  await callOllama(localModel, 'hi', 'respond with ok')
  console.log('ready.\n')

  for (const scenario of SCENARIOS) {
    const { system, user } = getPrompt(scenario)

    console.log(`\n${divider('═')}`)
    console.log(`  📋 ${scenario.name}`)
    console.log(divider('═'))

    // Run both
    process.stdout.write(`  ${localModel}... `)
    const local = await callOllama(localModel, system, user)
    console.log(`${local.ms}ms`)

    process.stdout.write('  claude-opus-4-6... ')
    let claude: { text: string; ms: number }
    try {
      claude = await callClaude(system, user)
      console.log(`${claude.ms}ms`)
    } catch (err) {
      console.log(`ERROR: ${err}`)
      claude = { text: `ERROR: ${err}`, ms: 0 }
    }

    // Display side by side
    console.log(`\n  ┌${'─'.repeat(33)} LOCAL ${'─'.repeat(32)}┐`)
    console.log(wrap(local.text, 68).split('\n').map(l => `  │ ${l}`).join('\n'))

    console.log(`  ├${'─'.repeat(33)} CLAUDE ${'─'.repeat(31)}┤`)
    console.log(wrap(claude.text, 68).split('\n').map(l => `  │ ${l}`).join('\n'))

    console.log(`  └${'─'.repeat(68)}┘`)
  }

  console.log(`\n${'═'.repeat(70)}`)
  console.log('  DONE. Review the bodies above for quality, conciseness, and DM usability.')
  console.log(`${'═'.repeat(70)}\n`)
}

main()
