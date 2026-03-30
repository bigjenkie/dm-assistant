/**
 * Evaluation Harness — Score suggestion quality across scenarios
 *
 * Picks random transcript chunks, fires them through prompts,
 * scores responses on multiple criteria, outputs a report.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-... npx tsx scripts/eval-harness.ts
 *   ANTHROPIC_API_KEY=sk-ant-... npx tsx scripts/eval-harness.ts --samples 10
 *   ANTHROPIC_API_KEY=sk-ant-... npx tsx scripts/eval-harness.ts --buttons-only
 */
import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { buildSuggestionPrompt, buildPanicPrompt } from '../src/lib/suggestion/prompt-builder'
import { parseSuggestionResponse } from '../src/lib/suggestion/parser'
import type { PanicButtonId } from '../src/lib/types'
import { PANIC_BUTTONS } from '../src/lib/types'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ---------------------------------------------------------------------------
// Scoring criteria — each returns 0-10
// ---------------------------------------------------------------------------

type ScoreFn = (response: string, parsed: ReturnType<typeof parseSuggestionResponse>, transcript: string, system: string) => number

const CRITERIA: Record<string, { name: string; weight: number; score: ScoreFn; description: string }> = {
  format: {
    name: 'Format',
    weight: 1,
    description: 'Follows TYPE/TITLE/BODY/REASONING/DM_ONLY structure',
    score: (_raw, parsed) => {
      if (!parsed) return 0
      let s = 0
      if (parsed.type !== 'UNKNOWN') s += 3
      if (parsed.title && parsed.title !== 'Suggestion') s += 2
      if (parsed.body && parsed.body.length > 10) s += 3
      if (parsed.reasoning) s += 1
      if (typeof parsed.dmOnly === 'boolean') s += 1
      return s
    },
  },

  readAloud: {
    name: 'Read-Aloud Ready',
    weight: 2,
    description: 'Body starts with narration/action, not analysis or meta-commentary',
    score: (_raw, parsed) => {
      if (!parsed?.body) return 0
      const body = parsed.body.toLowerCase()
      let s = 5 // start neutral

      // Penalize analysis/meta language
      const metaPhrases = ['the dm should', 'consider ', 'this could', 'the party might', 'you might want', 'it would be', 'suggest that', 'recommend']
      for (const phrase of metaPhrases) {
        if (body.startsWith(phrase)) s -= 3
        else if (body.includes(phrase)) s -= 1
      }

      // Reward direct narration markers
      const narrativeMarkers = ['"', 'you ', 'as you', 'suddenly', 'the ', 'a ']
      for (const marker of narrativeMarkers) {
        if (body.startsWith(marker)) { s += 2; break }
      }

      // Reward ending with a question (engages the player)
      if (body.endsWith('?') || body.endsWith('?"')) s += 1

      // Reward action words
      const actionWords = ['what do you do', 'roll', 'notice', 'hear', 'see', 'feel']
      for (const w of actionWords) {
        if (body.includes(w)) { s += 1; break }
      }

      return Math.max(0, Math.min(10, s))
    },
  },

  relevance: {
    name: 'Relevance',
    weight: 2,
    description: 'References specific names, places, or events from the transcript',
    score: (_raw, parsed, transcript) => {
      if (!parsed?.body) return 0

      // Extract proper nouns and key terms from transcript
      const transcriptWords = new Set(
        transcript.match(/[A-Z][a-z]{2,}/g)?.map(w => w.toLowerCase()) ?? []
      )

      const bodyLower = parsed.body.toLowerCase()
      let matches = 0
      for (const word of transcriptWords) {
        if (bodyLower.includes(word)) matches++
      }

      // Also check title
      if (parsed.title) {
        for (const word of transcriptWords) {
          if (parsed.title.toLowerCase().includes(word)) matches++
        }
      }

      if (matches >= 5) return 10
      if (matches >= 3) return 8
      if (matches >= 2) return 6
      if (matches >= 1) return 4
      return 2 // generic but present
    },
  },

  creativity: {
    name: 'Creativity',
    weight: 1.5,
    description: 'Goes beyond restating facts — adds narrative hooks, connections, or surprises',
    score: (_raw, parsed) => {
      if (!parsed?.body) return 0
      const body = parsed.body

      let s = 4 // baseline

      // Reward longer, more detailed responses (up to a point)
      const words = body.split(/\s+/).length
      if (words > 30) s += 1
      if (words > 60) s += 1

      // Reward dialogue (quotes suggest ready-to-use narration)
      if (body.includes('"') || body.includes("'")) s += 2

      // Reward sensory language
      const sensory = ['smell', 'hear', 'see', 'feel', 'taste', 'sound', 'cold', 'warm', 'dark', 'light', 'shadow', 'glow']
      for (const word of sensory) {
        if (body.toLowerCase().includes(word)) { s += 1; break }
      }

      // Reward emotional stakes
      const emotional = ['fear', 'trust', 'betray', 'desperate', 'rage', 'grief', 'hope', 'dread', 'memory', 'secret']
      for (const word of emotional) {
        if (body.toLowerCase().includes(word)) { s += 1; break }
      }

      return Math.min(10, s)
    },
  },

  conciseness: {
    name: 'Conciseness',
    weight: 1,
    description: 'Scannable in 3 seconds — not a wall of text',
    score: (_raw, parsed) => {
      if (!parsed?.body) return 0
      const words = parsed.body.split(/\s+/).length

      if (words <= 30) return 10  // perfect for a glance
      if (words <= 60) return 8   // good
      if (words <= 100) return 6  // acceptable
      if (words <= 150) return 4  // getting long
      if (words <= 200) return 2  // too long
      return 1                     // wall of text
    },
  },

  systemAwareness: {
    name: 'System Awareness',
    weight: 1,
    description: 'Appropriate for the TTRPG system (doesn\'t suggest D&D mechanics for CoC, etc.)',
    score: (_raw, parsed, _transcript, system) => {
      if (!parsed?.body) return 0
      const body = parsed.body.toLowerCase()

      // D&D-specific terms that shouldn't appear in non-D&D systems
      const dndTerms = ['hit points', 'armor class', ' ac ', 'spell slot', 'cantrip', 'initiative', 'saving throw']
      const isDD = system.includes('D&D') || system.includes('Pathfinder')

      if (!isDD) {
        for (const term of dndTerms) {
          if (body.includes(term)) return 3 // wrong system terms
        }
      }

      return 7 // neutral — we can't fully verify without deep system knowledge
    },
  },

  reasoning: {
    name: 'Reasoning Quality',
    weight: 1,
    description: 'REASONING field explains why this suggestion fits NOW',
    score: (_raw, parsed) => {
      if (!parsed) return 0
      if (!parsed.reasoning) return 2 // missing

      const r = parsed.reasoning
      if (r.length < 15) return 3 // too short
      if (r.length > 200) return 4 // too long

      // Good reasoning references the current moment
      const temporal = ['just', 'now', 'current', 'moment', 'recently', 'because']
      let hasContext = false
      for (const word of temporal) {
        if (r.toLowerCase().includes(word)) { hasContext = true; break }
      }

      return hasContext ? 8 : 5
    },
  },
}

// ---------------------------------------------------------------------------
// LLM caller
// ---------------------------------------------------------------------------

async function callClaude(system: string, user: string): Promise<{ text: string; ms: number }> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('Set ANTHROPIC_API_KEY')
  const start = performance.now()
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      temperature: 0.7,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })
  if (!res.ok) throw new Error(`Claude ${res.status}`)
  const data = await res.json()
  const text = data.content.filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('')
  return { text, ms: Math.round(performance.now() - start) }
}

// ---------------------------------------------------------------------------
// Load transcript chunks
// ---------------------------------------------------------------------------

type Chunk = {
  source_title: string
  text: string
  chunk_index: number
  word_count: number
}

function loadChunks(): { chunks: Chunk[]; system: string; source: string }[] {
  const scraperDir = join(__dirname, '../../ytscraper/output')
  const files = readdirSync(scraperDir).filter((f: string) => f.endsWith('.jsonl'))
  const results: { chunks: Chunk[]; system: string; source: string }[] = []

  for (const file of files) {
    const lines = readFileSync(join(scraperDir, file), 'utf-8').trim().split('\n')
    const chunks: Chunk[] = lines.map(l => JSON.parse(l))
    if (chunks.length === 0) continue

    const title = chunks[0].source_title
    const lower = title.toLowerCase()
    let system = 'TTRPG'
    if (lower.includes('critical role') || lower.includes('fantasy high') || lower.includes('drakkenheim')) system = 'D&D 5e'
    if (lower.includes('pathfinder')) system = 'Pathfinder 2e'
    if (lower.includes('cthulhu')) system = 'Call of Cthulhu'
    if (lower.includes('blades')) system = 'Blades in the Dark'
    if (lower.includes('vampire') || lower.includes('masquerade')) system = 'Vampire: The Masquerade'
    if (lower.includes('monster of the week')) system = 'Monster of the Week'

    results.push({ chunks: chunks.slice(5), system, source: title }) // skip intros
  }

  return results
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

type EvalResult = {
  source: string
  system: string
  action: string
  scores: Record<string, number>
  weightedTotal: number
  latencyMs: number
  body: string
  reasoning: string
}

async function main() {
  const args = process.argv.slice(2)
  const sampleCount = parseInt(args.find(a => a.match(/^\d+$/)) ?? args[args.indexOf('--samples') + 1] ?? '5')
  const buttonsOnly = args.includes('--buttons-only')

  const allSources = loadChunks()
  const totalWeight = Object.values(CRITERIA).reduce((sum, c) => sum + c.weight, 0)

  console.log('\n' + '═'.repeat(74))
  console.log('  EVALUATION HARNESS — Suggestion Quality Scoring')
  console.log('═'.repeat(74))
  console.log(`  Sources: ${allSources.length} | Samples per source: ${sampleCount}`)
  console.log(`  Criteria: ${Object.keys(CRITERIA).join(', ')}`)
  console.log(`  Total weight: ${totalWeight}\n`)

  const results: EvalResult[] = []
  const actions: { name: string; build: (transcript: string, system: string) => { system: string; user: string } }[] = []

  if (!buttonsOnly) {
    actions.push({
      name: 'Suggest',
      build: (transcript, system) => buildSuggestionPrompt({
        campaignContext: `System: ${system}. Auto-imported actual play.`,
        characterBackstories: '',
        recentTranscript: transcript,
        activeSuggestions: [],
        sessionElapsed: 1800,
      }),
    })
  }

  // Add a few key panic buttons
  const testButtons: PanicButtonId[] = ['phones_out', 'dead_air', 'off_script', 'energy_low']
  for (const btnId of testButtons) {
    const btn = PANIC_BUTTONS.find(b => b.id === btnId)!
    actions.push({
      name: `${btn.icon} ${btn.label}`,
      build: (transcript, system) => buildPanicPrompt(btnId, {
        campaignContext: `System: ${system}. Auto-imported actual play.`,
        characterBackstories: '',
        recentTranscript: transcript,
        fullTranscript: transcript,
      }),
    })
  }

  for (const source of allSources) {
    // Pick random chunks from the middle
    const available = source.chunks.filter(c => c.word_count > 50)
    const sampled = available.sort(() => Math.random() - 0.5).slice(0, sampleCount)

    for (const chunk of sampled) {
      for (const action of actions) {
        const transcript = chunk.text.slice(0, 2000) // cap context
        const { system: sysPrompt, user: userPrompt } = action.build(transcript, source.system)

        process.stdout.write(`  ${source.source.slice(0, 30).padEnd(30)} | ${action.name.padEnd(15)} | `)

        try {
          const result = await callClaude(sysPrompt, userPrompt)
          const parsed = parseSuggestionResponse(result.text)

          const scores: Record<string, number> = {}
          let weightedSum = 0
          for (const [key, criterion] of Object.entries(CRITERIA)) {
            const s = criterion.score(result.text, parsed, transcript, source.system)
            scores[key] = s
            weightedSum += s * criterion.weight
          }
          const weightedTotal = Math.round((weightedSum / totalWeight) * 10) / 10

          console.log(`${weightedTotal.toFixed(1)}/10 [${result.ms}ms]`)

          results.push({
            source: source.source,
            system: source.system,
            action: action.name,
            scores,
            weightedTotal,
            latencyMs: result.ms,
            body: parsed?.body?.slice(0, 80) ?? '(none)',
            reasoning: parsed?.reasoning?.slice(0, 60) ?? '(none)',
          })
        } catch (err) {
          console.log(`ERROR: ${err}`)
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Report
  // ---------------------------------------------------------------------------

  console.log('\n' + '═'.repeat(74))
  console.log('  RESULTS SUMMARY')
  console.log('═'.repeat(74))

  // Per-criterion averages
  console.log('\n  Per-Criterion Averages (0-10):')
  console.log('  ' + '-'.repeat(60))
  for (const [key, criterion] of Object.entries(CRITERIA)) {
    const avg = results.reduce((sum, r) => sum + (r.scores[key] ?? 0), 0) / results.length
    const bar = '█'.repeat(Math.round(avg)) + '░'.repeat(10 - Math.round(avg))
    console.log(`  ${criterion.name.padEnd(20)} ${bar} ${avg.toFixed(1)} (weight: ${criterion.weight})`)
  }

  // Per-action averages
  console.log('\n  Per-Action Averages:')
  console.log('  ' + '-'.repeat(60))
  const actionNames = [...new Set(results.map(r => r.action))]
  for (const action of actionNames) {
    const actionResults = results.filter(r => r.action === action)
    const avg = actionResults.reduce((sum, r) => sum + r.weightedTotal, 0) / actionResults.length
    const avgMs = Math.round(actionResults.reduce((sum, r) => sum + r.latencyMs, 0) / actionResults.length)
    console.log(`  ${action.padEnd(20)} ${avg.toFixed(1)}/10  avg ${avgMs}ms`)
  }

  // Per-system averages
  console.log('\n  Per-System Averages:')
  console.log('  ' + '-'.repeat(60))
  const systems = [...new Set(results.map(r => r.system))]
  for (const sys of systems) {
    const sysResults = results.filter(r => r.system === sys)
    const avg = sysResults.reduce((sum, r) => sum + r.weightedTotal, 0) / sysResults.length
    console.log(`  ${sys.padEnd(25)} ${avg.toFixed(1)}/10  (${sysResults.length} samples)`)
  }

  // Overall
  const overall = results.reduce((sum, r) => sum + r.weightedTotal, 0) / results.length
  console.log(`\n  OVERALL: ${overall.toFixed(1)}/10 across ${results.length} evaluations`)

  // Bottom 5 (worst scores — these need prompt tuning)
  console.log('\n  Worst 5 (tune these):')
  console.log('  ' + '-'.repeat(60))
  const sorted = [...results].sort((a, b) => a.weightedTotal - b.weightedTotal)
  for (const r of sorted.slice(0, 5)) {
    console.log(`  ${r.weightedTotal.toFixed(1)} | ${r.action.padEnd(15)} | ${r.source.slice(0, 25)} | ${r.body.slice(0, 50)}`)
  }

  console.log('\n' + '═'.repeat(74) + '\n')
}

main()
