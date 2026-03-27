/**
 * Feasibility Test — Experiment 2: LLM Suggestion Quality
 *
 * Fires real prompts at Ollama (or Anthropic) with the demo campaign data
 * and evaluates whether the responses are structured, relevant, and useful.
 *
 * Usage:
 *   npx tsx scripts/feasibility-test.ts              # test Ollama (default)
 *   npx tsx scripts/feasibility-test.ts anthropic     # test Anthropic (needs ANTHROPIC_API_KEY env)
 */

const CAMPAIGN_CONTEXT = `# Curse of the Hollow King
System: D&D 5e. Setting: Ashenmere Valley.
NPCs:
- Mayor Hild: Human female, mid-50s, quest giver. SECRET: Being blackmailed by Hollow King's agents.
- Fendrel the Cartographer: Half-elf, sold party a misleading map. SECRET: Shadow Guild agent.
- Oldroot: Ancient treant in Bleakwood. Spoke prophecy about the Ashen Crown. Dying.
Plot hooks: Coded letter with spider seal (undecoded). Missing silver shipment. Hollow King's phylactery in Tomb of Kael.
Encounters: Shadow Cultist patrol (4 Cultists AC 12, 1 Cult Fanatic AC 13 HP 33, hold person).`

const BACKSTORIES = `Vex (Sarah): Half-elf Ranger. Village destroyed by dragon Scorrath. Carries mother's locket. Seeks revenge.
Drogan (Mike): Dwarf Cleric of Moradin. Exiled from Khor-Dral, framed for theft. Seeks to clear his name.
Sable (Jordan): Tiefling Warlock. Pact with archfey Whisper. Hears cryptic dreams. DM SECRET: Whisper bound the Hollow King 200 years ago.
Gruuk (Sam): Half-orc Barbarian. Raised in Pelor monastery, burned by raiders. Terrified of his rage. DM SECRET: Raiders were Hollow King's agents.`

const SYSTEM_PROMPT = `You are a TTRPG assistant helping a Dungeon Master during a live session.
Your job is to surface ONE brief, useful suggestion based on the recent conversation.
Only suggest something if it is genuinely helpful. Silence is better than noise.

CAMPAIGN CONTEXT:
${CAMPAIGN_CONTEXT}

CHARACTER BACKSTORIES:
${BACKSTORIES}

Choose the most relevant suggestion type:
- RECALL: Surface notes about an NPC, location, or item that was mentioned
- RULES: Clarify a rule relevant to what's happening
- THREAD: Remind the DM of an unresolved plot hook or promise
- COMBAT: Surface monster stats or tactical notes if combat is active
- IMPROV: Offer quick improvisation material if players went off-script
- BACKSTORY: Connect the current scene to a character's personal story
- PACING: Gentle pacing nudge if the session needs it

If nothing useful comes to mind, respond with exactly: NONE

Format your response as:
TYPE: [type]
TITLE: [short title]
BODY: [2-3 sentences max, scannable in 3 seconds]
DM_ONLY: [true/false — true if this contains info players should not see]`

type TestCase = {
  name: string
  transcript: string
  expectedType: string
  expectNone?: boolean
}

const TEST_CASES: TestCase[] = [
  {
    name: 'NPC Recall — direct mention',
    transcript: '[00:42:15] Player: We should go find Fendrel and confront him about that map.',
    expectedType: 'RECALL',
  },
  {
    name: 'NPC Recall — indirect mention',
    transcript: '[00:42:15] Player: Let\'s go talk to that lady who gave us the quest.',
    expectedType: 'RECALL',
  },
  {
    name: 'Backstory Connection — Pelor keyword',
    transcript: '[00:50:00] DM: You enter a ruined chapel. The symbol of Pelor is scorched but visible on the wall.',
    expectedType: 'BACKSTORY',
  },
  {
    name: 'Plot Thread — coded letter',
    transcript: '[01:10:00] Player: Wait, we still have that letter with the weird seal. Has anyone tried to decode it?',
    expectedType: 'THREAD',
  },
  {
    name: 'Combat Stats — initiative',
    transcript: '[01:30:00] DM: As you round the bend, you see hooded figures on the road ahead. Roll initiative!',
    expectedType: 'COMBAT',
  },
  {
    name: 'Silence for irrelevant chatter',
    transcript: '[01:00:00] Player: Anyone want more pizza? What kind is left?',
    expectedType: 'NONE',
    expectNone: true,
  },
  {
    name: 'Improv — off-script tavern',
    transcript: '[00:20:00] Player: I want to arm wrestle the bartender for information.',
    expectedType: 'IMPROV',
  },
  {
    name: 'Rules — grapple question',
    transcript: '[01:35:00] Player: Can I grapple the cult fanatic while I\'m prone?',
    expectedType: 'RULES',
  },
]

async function callOllama(system: string, user: string): Promise<{ text: string; latencyMs: number }> {
  const start = performance.now()
  const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.1:8b-instruct-q4_K_M',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      stream: false,
      options: { num_predict: 300, temperature: 0.7 },
    }),
  })
  if (!response.ok) throw new Error(`Ollama ${response.status}`)
  const data = await response.json()
  return { text: data.message.content, latencyMs: Math.round(performance.now() - start) }
}

async function callAnthropic(system: string, user: string): Promise<{ text: string; latencyMs: number }> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('Set ANTHROPIC_API_KEY env var')
  const start = performance.now()
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      temperature: 0.7,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })
  if (!response.ok) throw new Error(`Anthropic ${response.status}`)
  const data = await response.json()
  const text = data.content.filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('')
  return { text, latencyMs: Math.round(performance.now() - start) }
}

function parseResponse(raw: string): { type: string; title: string; body: string; dmOnly: boolean } | null {
  const trimmed = raw.trim()
  if (!trimmed || trimmed.toUpperCase() === 'NONE') return null

  const typeMatch = trimmed.match(/^TYPE:\s*(.+)$/m)
  const titleMatch = trimmed.match(/^TITLE:\s*(.+)$/m)
  const bodyMatch = trimmed.match(/^BODY:\s*([\s\S]+?)(?=^DM_ONLY:|\s*$)/m)
  const dmOnlyMatch = trimmed.match(/^DM_ONLY:\s*(.+)$/m)

  if (!titleMatch && !bodyMatch) return null

  return {
    type: typeMatch?.[1]?.trim() ?? 'UNKNOWN',
    title: titleMatch?.[1]?.trim() ?? 'Untitled',
    body: bodyMatch?.[1]?.trim() ?? '',
    dmOnly: dmOnlyMatch?.[1]?.trim().toLowerCase() === 'true',
  }
}

async function main() {
  const provider = process.argv[2] === 'anthropic' ? 'anthropic' : 'ollama'
  const callLLM = provider === 'anthropic' ? callAnthropic : callOllama

  console.log(`\n🧪 Feasibility Test — ${provider.toUpperCase()}\n`)
  console.log('='.repeat(70))

  // Check connectivity
  try {
    if (provider === 'ollama') {
      const res = await fetch('http://localhost:11434/api/tags')
      if (!res.ok) throw new Error('not ok')
      console.log('✅ Ollama connected\n')
    } else {
      console.log('☁️  Using Anthropic API\n')
    }
  } catch {
    console.error('❌ Cannot connect to Ollama at localhost:11434. Is it running?')
    process.exit(1)
  }

  let passed = 0
  let failed = 0

  for (const tc of TEST_CASES) {
    const userPrompt = `RECENT TABLE CONVERSATION (last 3 minutes):\n${tc.transcript}\n\nGenerate ONE suggestion or respond NONE.`

    console.log(`\n📋 Test: ${tc.name}`)
    console.log(`   Expected: ${tc.expectedType}`)

    try {
      const result = await callLLM(SYSTEM_PROMPT, userPrompt)
      const parsed = parseResponse(result.text)

      if (tc.expectNone) {
        if (!parsed) {
          console.log(`   ✅ PASS — Returned NONE (correct)  [${result.latencyMs}ms]`)
          passed++
        } else {
          console.log(`   ⚠️  FAIL — Expected NONE but got: ${parsed.type}: ${parsed.title}  [${result.latencyMs}ms]`)
          failed++
        }
      } else if (!parsed) {
        console.log(`   ⚠️  FAIL — Returned NONE (expected ${tc.expectedType})  [${result.latencyMs}ms]`)
        failed++
      } else {
        const typeMatch = parsed.type.toUpperCase() === tc.expectedType.toUpperCase()
        const icon = typeMatch ? '✅' : '⚠️ '
        const status = typeMatch ? 'PASS' : `SOFT FAIL (got ${parsed.type})`
        console.log(`   ${icon} ${status}  [${result.latencyMs}ms]`)
        console.log(`   Type: ${parsed.type} | Title: ${parsed.title}`)
        console.log(`   Body: ${parsed.body.slice(0, 120)}${parsed.body.length > 120 ? '...' : ''}`)
        console.log(`   DM Only: ${parsed.dmOnly}`)
        if (typeMatch) passed++
        else failed++
      }
    } catch (err) {
      console.log(`   ❌ ERROR: ${err}`)
      failed++
    }
  }

  console.log('\n' + '='.repeat(70))
  console.log(`\n📊 Results: ${passed}/${TEST_CASES.length} passed, ${failed} failed`)
  console.log(`   Provider: ${provider}`)
  console.log('')
}

main()
