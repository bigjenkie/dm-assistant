/**
 * Feasibility Test — Experiment 2: LLM Suggestion Quality
 *
 * Tests multiple local models (and optionally Claude) against 8 TTRPG scenarios.
 * Evaluates: format compliance, type accuracy, conciseness, latency.
 *
 * Claude is routed through the Claude Code subscription (no API key).
 * Sign in once with `claude login` to use --anthropic.
 *
 * Usage:
 *   npx tsx scripts/feasibility-test.ts                    # test all local models
 *   npx tsx scripts/feasibility-test.ts --model gemma3:12b  # test one model
 *   npx tsx scripts/feasibility-test.ts --anthropic         # include Claude comparison
 */
import { callClaude } from './lib/claude-subscription'

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
    transcript: "[00:42:15] Player: Let's go talk to that lady who gave us the quest.",
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
    transcript: "[01:35:00] Player: Can I grapple the cult fanatic while I'm prone?",
    expectedType: 'RULES',
  },
]

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

async function callOllama(model: string, system: string, user: string): Promise<{ text: string; latencyMs: number }> {
  const start = performance.now()
  const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
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
  const { text, ms } = await callClaude(system, user)
  return { text, latencyMs: ms }
}

type ModelResult = {
  model: string
  passed: number
  failed: number
  formatCompliance: number  // how many followed TYPE/TITLE/BODY format
  avgLatencyMs: number
  results: { test: string; pass: boolean; type: string; latencyMs: number; body: string }[]
}

async function testModel(
  model: string,
  callFn: (system: string, user: string) => Promise<{ text: string; latencyMs: number }>
): Promise<ModelResult> {
  const results: ModelResult['results'] = []
  let passed = 0
  let failed = 0
  let formatOk = 0
  let totalLatency = 0

  for (const tc of TEST_CASES) {
    const userPrompt = `RECENT TABLE CONVERSATION (last 3 minutes):\n${tc.transcript}\n\nGenerate ONE suggestion or respond NONE.`

    process.stdout.write(`  ${tc.name}... `)

    try {
      const result = await callFn(SYSTEM_PROMPT, userPrompt)
      const parsed = parseResponse(result.text)
      totalLatency += result.latencyMs

      if (parsed) formatOk++

      if (tc.expectNone) {
        if (!parsed) {
          console.log(`✅ NONE [${result.latencyMs}ms]`)
          results.push({ test: tc.name, pass: true, type: 'NONE', latencyMs: result.latencyMs, body: '' })
          passed++
        } else {
          console.log(`❌ expected NONE, got ${parsed.type}: ${parsed.title} [${result.latencyMs}ms]`)
          results.push({ test: tc.name, pass: false, type: parsed.type, latencyMs: result.latencyMs, body: parsed.body })
          failed++
        }
      } else if (!parsed) {
        console.log(`❌ returned NONE (expected ${tc.expectedType}) [${result.latencyMs}ms]`)
        results.push({ test: tc.name, pass: false, type: 'NONE', latencyMs: result.latencyMs, body: '' })
        failed++
      } else {
        const typeMatch = parsed.type.toUpperCase() === tc.expectedType.toUpperCase()
        if (typeMatch) {
          console.log(`✅ ${parsed.type}: "${parsed.title}" [${result.latencyMs}ms]`)
          passed++
        } else {
          console.log(`⚠️  got ${parsed.type} (expected ${tc.expectedType}): "${parsed.title}" [${result.latencyMs}ms]`)
          failed++
        }
        results.push({ test: tc.name, pass: typeMatch, type: parsed.type, latencyMs: result.latencyMs, body: parsed.body.slice(0, 80) })
      }
    } catch (err) {
      console.log(`💥 ERROR: ${err}`)
      results.push({ test: tc.name, pass: false, type: 'ERROR', latencyMs: 0, body: String(err) })
      failed++
    }
  }

  return {
    model,
    passed,
    failed,
    formatCompliance: formatOk,
    avgLatencyMs: Math.round(totalLatency / TEST_CASES.length),
    results,
  }
}

async function main() {
  const args = process.argv.slice(2)
  const singleModel = args.find(a => a !== '--anthropic' && !a.startsWith('--'))
    ?? (args.includes('--model') ? args[args.indexOf('--model') + 1] : null)
  const includeAnthropic = args.includes('--anthropic')

  // Discover local models
  let localModels: string[] = []
  try {
    const res = await fetch('http://localhost:11434/api/tags')
    const data = await res.json()
    localModels = data.models.map((m: { name: string }) => m.name)
  } catch {
    console.error('❌ Cannot connect to Ollama. Is it running?')
    process.exit(1)
  }

  if (singleModel) {
    localModels = localModels.filter(m => m.includes(singleModel))
    if (localModels.length === 0) {
      console.error(`❌ Model "${singleModel}" not found. Available: ${localModels.join(', ')}`)
      process.exit(1)
    }
  }

  console.log('\n🧪 FEASIBILITY TEST — LLM Suggestion Quality\n')
  console.log(`Local models: ${localModels.join(', ')}`)
  if (includeAnthropic) console.log('Cloud: claude-sonnet-4-6')
  console.log('Test cases: ' + TEST_CASES.length)
  console.log('='.repeat(70))

  const allResults: ModelResult[] = []

  for (const model of localModels) {
    console.log(`\n📦 ${model}`)
    console.log('-'.repeat(50))
    const result = await testModel(model, (sys, usr) => callOllama(model, sys, usr))
    allResults.push(result)
  }

  if (includeAnthropic) {
    console.log('\n☁️  claude-sonnet-4-6')
    console.log('-'.repeat(50))
    const result = await testModel('claude-sonnet-4-6', callAnthropic)
    allResults.push(result)
  }

  // Summary table
  console.log('\n' + '='.repeat(70))
  console.log('\n📊 SUMMARY\n')
  console.log(`${'Model'.padEnd(30)} ${'Pass'.padEnd(6)} ${'Fail'.padEnd(6)} ${'Format'.padEnd(8)} ${'Avg ms'.padEnd(8)}`)
  console.log('-'.repeat(60))

  for (const r of allResults) {
    const pct = `${r.passed}/${TEST_CASES.length}`
    const fmt = `${r.formatCompliance}/${TEST_CASES.length}`
    console.log(
      `${r.model.padEnd(30)} ${pct.padEnd(6)} ${String(r.failed).padEnd(6)} ${fmt.padEnd(8)} ${String(r.avgLatencyMs).padEnd(8)}`
    )
  }

  // Recommendation
  console.log('\n' + '-'.repeat(60))
  const best = allResults
    .filter(r => r.passed >= 5)
    .sort((a, b) => b.passed - a.passed || a.avgLatencyMs - b.avgLatencyMs)[0]

  if (best) {
    console.log(`\n🏆 Best local model: ${best.model} (${best.passed}/${TEST_CASES.length} pass, ${best.avgLatencyMs}ms avg)`)
  } else {
    console.log('\n⚠️  No local model passed 5+ tests. Claude recommended for production quality.')
  }
  console.log('')
}

main()
