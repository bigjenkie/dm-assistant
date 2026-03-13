# Testable MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Get a working app where a DM can paste campaign context, feed in transcript text, and receive AI-generated suggestions from Ollama — the core product hypothesis, testable end-to-end.

**Architecture:** Pure TypeScript core logic (LLM provider, suggestion engine, response parser, cooldown tracker, prompt builder) tested with Vitest. React + Tailwind UI on Vite. Hits Ollama at localhost:11434 over HTTP. No Rust/Tauri yet (cargo not installed) — will wrap later. Manual transcript input simulates whisper.cpp.

**Tech Stack:** Vite, React 19, TypeScript, Tailwind CSS 4, Vitest, npm

**What's IN scope:**
- Campaign context input (paste text)
- Manual transcript input (simulates whisper.cpp)
- Suggestion engine with 45s cycle hitting Ollama
- Response parsing (TYPE/TITLE/BODY/DM_ONLY format)
- Entity cooldown/dedup tracker
- Suggestion cards with type badges, pin, dismiss
- Ad-hoc questions
- 3 panic buttons (Phones Out, Need an NPC, Recap)
- LLM provider abstraction (Ollama implemented, Anthropic stubbed)

**What's OUT of scope (for now):**
- Tauri/Rust shell (no cargo installed)
- whisper.cpp / live audio transcription
- SQLite persistence (use in-memory state)
- Adaptive music system
- Session export
- Full 10 panic buttons (start with 3)
- MCP server
- First-run wizard

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `tailwind.config.js`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/index.css`

**Step 1: Initialize the project with Vite + React + TypeScript**

```bash
cd c:/Users/johnh/OneDrive/Documents/Dev/dm-assistant
npm create vite@latest . -- --template react-ts
```

If prompted about existing files, select to proceed (specs/docs won't conflict).

**Step 2: Install dependencies**

```bash
npm install -D tailwindcss @tailwindcss/vite vitest @testing-library/react @testing-library/jest-dom jsdom
```

**Step 3: Configure Tailwind in vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

**Step 4: Configure Vitest in vite.config.ts**

Update vite.config.ts to add test config:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
})
```

**Step 5: Create test setup file**

`src/test-setup.ts`:
```typescript
import '@testing-library/jest-dom/vitest'
```

**Step 6: Replace src/index.css with Tailwind import**

```css
@import "tailwindcss";
```

**Step 7: Create minimal App.tsx**

```tsx
function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4">
      <h1 className="text-2xl font-bold">DM Assistant</h1>
      <p className="text-gray-400 mt-2">Testable MVP</p>
    </div>
  )
}

export default App
```

**Step 8: Add scripts to package.json**

Ensure these scripts exist:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

**Step 9: Verify everything works**

```bash
npm run build
npm test
npm run dev
```

Expected: Build succeeds, no tests yet (0 pass), dev server starts on localhost:5173.

**Step 10: Create .gitignore and commit**

`.gitignore`:
```
node_modules/
dist/
.vite/
```

```bash
git add -A
git commit -m "feat: scaffold Vite + React + TypeScript + Tailwind + Vitest"
```

---

## Task 2: Shared Types

**Files:**
- Create: `src/lib/types.ts`

All shared TypeScript types used across the core logic and UI.

**Step 1: Write the types**

`src/lib/types.ts`:
```typescript
// --- Suggestion Types ---

export type SuggestionType =
  | 'RECALL'
  | 'RULES'
  | 'THREAD'
  | 'COMBAT'
  | 'SPELL'
  | 'IMPROV'
  | 'BACKSTORY'
  | 'PACING'
  | 'UNKNOWN'

export type Suggestion = {
  id: string
  type: SuggestionType
  title: string
  body: string
  dmOnly: boolean
  timestamp: number    // seconds since session start
  pinned: boolean
  dismissed: boolean
  source: 'proactive' | 'panic' | 'question'
}

export const SUGGESTION_ICONS: Record<SuggestionType, string> = {
  RECALL: '📋',
  RULES: '📖',
  THREAD: '🧵',
  COMBAT: '⚔️',
  SPELL: '✨',
  IMPROV: '💡',
  BACKSTORY: '🎭',
  PACING: '⏱️',
  UNKNOWN: '💬',
}

// --- Transcript Types ---

export type TranscriptEntry = {
  id: string
  ts: number           // seconds since session start
  text: string
  confidence: number
}

// --- LLM Provider Types ---

export type ProviderType = 'ollama' | 'anthropic'

export type ProviderStatus =
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'no-model'
  | 'unconfigured'

export type LLMConfig = {
  provider: ProviderType
  ollamaBaseUrl: string
  ollamaModel: string
  anthropicApiKey: string | null
  anthropicModel: string
  maxTokens: number
  temperature: number
}

export const DEFAULT_LLM_CONFIG: LLMConfig = {
  provider: 'ollama',
  ollamaBaseUrl: 'http://localhost:11434',
  ollamaModel: 'llama3.1:8b-instruct-q4_K_M',
  anthropicApiKey: null,
  anthropicModel: 'claude-sonnet-4-6',
  maxTokens: 300,
  temperature: 0.7,
}

// --- Session Types ---

export type SessionState = 'idle' | 'active' | 'ended'

export type PanicButtonId =
  | 'phones_out'
  | 'need_npc'
  | 'recap'

export type PanicButton = {
  id: PanicButtonId
  label: string
  icon: string
  description: string
}

export const PANIC_BUTTONS: PanicButton[] = [
  { id: 'phones_out', label: 'Phones Out', icon: '📱', description: 'Re-engage a distracted player' },
  { id: 'need_npc', label: 'Need an NPC', icon: '🎲', description: 'Generate an NPC on the fly' },
  { id: 'recap', label: 'Recap', icon: '📜', description: 'Summarize the session so far' },
]
```

**Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add shared TypeScript types"
```

---

## Task 3: Suggestion Response Parser (TDD)

**Files:**
- Create: `src/lib/suggestion/parser.ts`
- Create: `src/lib/suggestion/parser.test.ts`

The parser converts raw LLM text output into structured Suggestion objects.
This is pure logic with no dependencies — ideal for TDD.

**Step 1: Write the failing tests**

`src/lib/suggestion/parser.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { parseSuggestionResponse } from './parser'

describe('parseSuggestionResponse', () => {
  it('parses a well-formed response', () => {
    const raw = `TYPE: RECALL
TITLE: Mayor Hild
BODY: Female human, mid-50s. Quest giver who offered 500gp for the Ashen Crown. Nervous demeanor, fidgets with a silver ring.
DM_ONLY: false`

    const result = parseSuggestionResponse(raw)

    expect(result).not.toBeNull()
    expect(result!.type).toBe('RECALL')
    expect(result!.title).toBe('Mayor Hild')
    expect(result!.body).toContain('500gp')
    expect(result!.dmOnly).toBe(false)
  })

  it('returns null for NONE response', () => {
    expect(parseSuggestionResponse('NONE')).toBeNull()
    expect(parseSuggestionResponse('  NONE  ')).toBeNull()
    expect(parseSuggestionResponse('NONE\n')).toBeNull()
  })

  it('returns null for empty response', () => {
    expect(parseSuggestionResponse('')).toBeNull()
    expect(parseSuggestionResponse('   ')).toBeNull()
  })

  it('parses DM_ONLY: true correctly', () => {
    const raw = `TYPE: THREAD
TITLE: Mayor Hild — Secret
BODY: She is secretly working with the Hollow King under duress.
DM_ONLY: true`

    const result = parseSuggestionResponse(raw)
    expect(result!.dmOnly).toBe(true)
  })

  it('handles missing TYPE gracefully with UNKNOWN', () => {
    const raw = `TITLE: Some Info
BODY: Here is a suggestion.
DM_ONLY: false`

    const result = parseSuggestionResponse(raw)
    expect(result).not.toBeNull()
    expect(result!.type).toBe('UNKNOWN')
    expect(result!.title).toBe('Some Info')
  })

  it('handles unrecognized TYPE with UNKNOWN', () => {
    const raw = `TYPE: WEATHER_REPORT
TITLE: Bad Weather
BODY: It is raining.
DM_ONLY: false`

    const result = parseSuggestionResponse(raw)
    expect(result!.type).toBe('UNKNOWN')
  })

  it('handles completely unstructured text as fallback', () => {
    const raw = `The party should probably talk to the mayor about the quest. She might know more about the tomb.`

    const result = parseSuggestionResponse(raw)
    expect(result).not.toBeNull()
    expect(result!.type).toBe('UNKNOWN')
    expect(result!.title).toBe('Suggestion')
    expect(result!.body).toContain('mayor')
    expect(result!.dmOnly).toBe(false)
  })

  it('handles multiline BODY', () => {
    const raw = `TYPE: RULES
TITLE: Grapple Rules
BODY: Grapple replaces one attack. Contested Athletics vs Athletics or Acrobatics. Target must be no more than one size larger. Grappled condition: speed becomes 0.
DM_ONLY: false`

    const result = parseSuggestionResponse(raw)
    expect(result!.body).toContain('speed becomes 0')
  })

  it('trims whitespace from all fields', () => {
    const raw = `TYPE:   RECALL
TITLE:   Reva the Red
BODY:   Tiefling fence in the market.
DM_ONLY:   false  `

    const result = parseSuggestionResponse(raw)
    expect(result!.type).toBe('RECALL')
    expect(result!.title).toBe('Reva the Red')
    expect(result!.body).toBe('Tiefling fence in the market.')
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
npm test src/lib/suggestion/parser.test.ts
```

Expected: FAIL — module `./parser` not found.

**Step 3: Write the implementation**

`src/lib/suggestion/parser.ts`:
```typescript
import type { SuggestionType } from '../types'

const VALID_TYPES: Set<string> = new Set([
  'RECALL', 'RULES', 'THREAD', 'COMBAT', 'SPELL', 'IMPROV', 'BACKSTORY', 'PACING',
])

type ParsedSuggestion = {
  type: SuggestionType
  title: string
  body: string
  dmOnly: boolean
}

export function parseSuggestionResponse(raw: string): ParsedSuggestion | null {
  const trimmed = raw.trim()

  if (!trimmed || trimmed.toUpperCase() === 'NONE') {
    return null
  }

  const typeMatch = trimmed.match(/^TYPE:\s*(.+)$/m)
  const titleMatch = trimmed.match(/^TITLE:\s*(.+)$/m)
  const bodyMatch = trimmed.match(/^BODY:\s*([\s\S]+?)(?=^DM_ONLY:|\s*$)/m)
  const dmOnlyMatch = trimmed.match(/^DM_ONLY:\s*(.+)$/m)

  // If we have at least a TITLE or BODY field, parse structured
  if (titleMatch || bodyMatch) {
    const rawType = typeMatch?.[1]?.trim().toUpperCase() ?? ''
    const type: SuggestionType = VALID_TYPES.has(rawType)
      ? (rawType as SuggestionType)
      : 'UNKNOWN'
    const title = titleMatch?.[1]?.trim() ?? 'Suggestion'
    const body = bodyMatch?.[1]?.trim() ?? ''
    const dmOnly = dmOnlyMatch?.[1]?.trim().toLowerCase() === 'true'

    return { type, title, body, dmOnly }
  }

  // Fallback: treat entire text as a plain suggestion
  return {
    type: 'UNKNOWN',
    title: 'Suggestion',
    body: trimmed,
    dmOnly: false,
  }
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test src/lib/suggestion/parser.test.ts
```

Expected: All 9 tests PASS.

**Step 5: Commit**

```bash
git add src/lib/suggestion/parser.ts src/lib/suggestion/parser.test.ts
git commit -m "feat: suggestion response parser with TDD"
```

---

## Task 4: Entity Cooldown Tracker (TDD)

**Files:**
- Create: `src/lib/suggestion/cooldown.ts`
- Create: `src/lib/suggestion/cooldown.test.ts`

Pure logic, no dependencies. Tracks entity names with TTL-based suppression.

**Step 1: Write the failing tests**

`src/lib/suggestion/cooldown.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CooldownTracker } from './cooldown'

describe('CooldownTracker', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows an entity that has not been registered', () => {
    const tracker = new CooldownTracker()
    expect(tracker.isSuppressed('Mayor Hild')).toBe(false)
  })

  it('suppresses an entity after registration', () => {
    const tracker = new CooldownTracker()
    tracker.register('Mayor Hild')
    expect(tracker.isSuppressed('Mayor Hild')).toBe(true)
  })

  it('releases an entity after TTL expires', () => {
    const tracker = new CooldownTracker(300_000) // 5 minutes
    tracker.register('Mayor Hild')

    vi.advanceTimersByTime(300_001)

    expect(tracker.isSuppressed('Mayor Hild')).toBe(false)
  })

  it('keeps entity suppressed before TTL expires', () => {
    const tracker = new CooldownTracker(300_000)
    tracker.register('Mayor Hild')

    vi.advanceTimersByTime(200_000) // 3.3 minutes

    expect(tracker.isSuppressed('Mayor Hild')).toBe(true)
  })

  it('tracks different entities independently', () => {
    const tracker = new CooldownTracker()
    tracker.register('Mayor Hild')

    expect(tracker.isSuppressed('Mayor Hild')).toBe(true)
    expect(tracker.isSuppressed('Reva the Red')).toBe(false)
  })

  it('re-registration resets the TTL', () => {
    const tracker = new CooldownTracker(300_000)
    tracker.register('Mayor Hild')

    vi.advanceTimersByTime(200_000)
    tracker.register('Mayor Hild') // re-register

    vi.advanceTimersByTime(200_000) // 200ms after re-register (total 400ms from first)

    expect(tracker.isSuppressed('Mayor Hild')).toBe(true)
  })

  it('cleans up expired entries', () => {
    const tracker = new CooldownTracker(100)
    tracker.register('A')
    tracker.register('B')
    tracker.register('C')

    vi.advanceTimersByTime(101)
    tracker.cleanup()

    expect(tracker.size).toBe(0)
  })

  it('normalizes entity names (case-insensitive)', () => {
    const tracker = new CooldownTracker()
    tracker.register('Mayor Hild')

    expect(tracker.isSuppressed('mayor hild')).toBe(true)
    expect(tracker.isSuppressed('MAYOR HILD')).toBe(true)
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
npm test src/lib/suggestion/cooldown.test.ts
```

Expected: FAIL — module not found.

**Step 3: Write the implementation**

`src/lib/suggestion/cooldown.ts`:
```typescript
export class CooldownTracker {
  private entries = new Map<string, number>() // entity -> expiry timestamp
  private defaultTtl: number

  constructor(defaultTtlMs: number = 300_000) { // 5 minutes default
    this.defaultTtl = defaultTtlMs
  }

  private normalize(entity: string): string {
    return entity.toLowerCase().trim()
  }

  register(entity: string, ttlMs?: number): void {
    const key = this.normalize(entity)
    const expiry = Date.now() + (ttlMs ?? this.defaultTtl)
    this.entries.set(key, expiry)
  }

  isSuppressed(entity: string): boolean {
    const key = this.normalize(entity)
    const expiry = this.entries.get(key)
    if (expiry === undefined) return false
    if (Date.now() > expiry) {
      this.entries.delete(key)
      return false
    }
    return true
  }

  cleanup(): void {
    const now = Date.now()
    for (const [key, expiry] of this.entries) {
      if (now > expiry) {
        this.entries.delete(key)
      }
    }
  }

  get size(): number {
    return this.entries.size
  }
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test src/lib/suggestion/cooldown.test.ts
```

Expected: All 8 tests PASS.

**Step 5: Commit**

```bash
git add src/lib/suggestion/cooldown.ts src/lib/suggestion/cooldown.test.ts
git commit -m "feat: entity cooldown tracker with TDD"
```

---

## Task 5: Prompt Builder (TDD)

**Files:**
- Create: `src/lib/suggestion/prompt-builder.ts`
- Create: `src/lib/suggestion/prompt-builder.test.ts`

Constructs the system prompt and user prompt from campaign context,
backstories, transcript, and active suggestions. Also builds panic button prompts.

**Step 1: Write the failing tests**

`src/lib/suggestion/prompt-builder.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { buildSuggestionPrompt, buildPanicPrompt } from './prompt-builder'

describe('buildSuggestionPrompt', () => {
  const context = {
    campaignContext: 'Campaign: Curse of the Hollow King\nNPCs: Mayor Hild (quest giver)',
    characterBackstories: 'Vex: Ranger seeking revenge on dragon Scorrath',
    recentTranscript: '[00:42:15] Let us go talk to the mayor about the reward',
    activeSuggestions: ['Mayor Hild — quest giver'],
    sessionElapsed: 2520, // 42 minutes
  }

  it('includes campaign context in the system prompt', () => {
    const { system } = buildSuggestionPrompt(context)
    expect(system).toContain('Curse of the Hollow King')
  })

  it('includes character backstories in the system prompt', () => {
    const { system } = buildSuggestionPrompt(context)
    expect(system).toContain('Scorrath')
  })

  it('includes recent transcript in the user prompt', () => {
    const { user } = buildSuggestionPrompt(context)
    expect(user).toContain('go talk to the mayor')
  })

  it('includes active suggestions to avoid repeats', () => {
    const { user } = buildSuggestionPrompt(context)
    expect(user).toContain('Mayor Hild')
  })

  it('includes the response format instructions', () => {
    const { system } = buildSuggestionPrompt(context)
    expect(system).toContain('TYPE:')
    expect(system).toContain('TITLE:')
    expect(system).toContain('BODY:')
    expect(system).toContain('DM_ONLY:')
    expect(system).toContain('NONE')
  })

  it('handles empty transcript gracefully', () => {
    const { user } = buildSuggestionPrompt({ ...context, recentTranscript: '' })
    expect(user).toContain('No recent conversation')
  })
})

describe('buildPanicPrompt', () => {
  const context = {
    campaignContext: 'NPCs: Mayor Hild',
    characterBackstories: 'Vex: Ranger. Sable: Warlock.',
    recentTranscript: '[00:42:15] Vex attacks the skeleton',
    fullTranscript: '[00:00:00] Session starts...\n[00:42:15] Vex attacks the skeleton',
  }

  it('builds a phones_out prompt that targets least-active player', () => {
    const { user } = buildPanicPrompt('phones_out', context)
    expect(user).toContain('disengaged')
    expect(user).toContain('least')
    expect(user).toContain('backstory')
  })

  it('builds a need_npc prompt', () => {
    const { user } = buildPanicPrompt('need_npc', context)
    expect(user).toContain('NPC')
    expect(user).toContain('name')
    expect(user).toContain('personality')
  })

  it('builds a recap prompt', () => {
    const { user } = buildPanicPrompt('recap', context)
    expect(user).toContain('summary')
    expect(user).toContain('150 words')
  })

  it('includes full transcript for recap', () => {
    const { user } = buildPanicPrompt('recap', context)
    expect(user).toContain('Session starts')
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
npm test src/lib/suggestion/prompt-builder.test.ts
```

**Step 3: Write the implementation**

`src/lib/suggestion/prompt-builder.ts`:
```typescript
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
```

**Step 4: Run tests to verify they pass**

```bash
npm test src/lib/suggestion/prompt-builder.test.ts
```

Expected: All 10 tests PASS.

**Step 5: Commit**

```bash
git add src/lib/suggestion/prompt-builder.ts src/lib/suggestion/prompt-builder.test.ts
git commit -m "feat: prompt builder for suggestions and panic buttons with TDD"
```

---

## Task 6: LLM Provider — Ollama (TDD)

**Files:**
- Create: `src/lib/llm/provider.ts`
- Create: `src/lib/llm/ollama.ts`
- Create: `src/lib/llm/ollama.test.ts`

The provider interface and the Ollama implementation. Tests mock fetch
so they don't require a running Ollama instance.

**Step 1: Write the provider interface**

`src/lib/llm/provider.ts`:
```typescript
export type LLMResponse = {
  text: string
  latencyMs: number
}

export type LLMProvider = {
  generate(system: string, user: string, maxTokens: number): Promise<LLMResponse>
  healthCheck(): Promise<boolean>
  name: string
}
```

**Step 2: Write the failing tests**

`src/lib/llm/ollama.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createOllamaProvider } from './ollama'

describe('OllamaProvider', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('sends correct request format to Ollama API', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        message: { content: 'TYPE: RECALL\nTITLE: Test\nBODY: Hello\nDM_ONLY: false' },
      }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const provider = createOllamaProvider({
      baseUrl: 'http://localhost:11434',
      model: 'llama3.1:8b-instruct-q4_K_M',
      temperature: 0.7,
    })

    await provider.generate('system prompt', 'user prompt', 300)

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:11434/api/chat',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.any(String),
      })
    )

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.model).toBe('llama3.1:8b-instruct-q4_K_M')
    expect(body.messages).toEqual([
      { role: 'system', content: 'system prompt' },
      { role: 'user', content: 'user prompt' },
    ])
    expect(body.stream).toBe(false)
    expect(body.options.num_predict).toBe(300)
  })

  it('returns text and latency from response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        message: { content: 'NONE' },
      }),
    }))

    const provider = createOllamaProvider({
      baseUrl: 'http://localhost:11434',
      model: 'llama3.1:8b-instruct-q4_K_M',
      temperature: 0.7,
    })

    const result = await provider.generate('sys', 'usr', 300)
    expect(result.text).toBe('NONE')
    expect(result.latencyMs).toBeGreaterThanOrEqual(0)
  })

  it('throws on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    }))

    const provider = createOllamaProvider({
      baseUrl: 'http://localhost:11434',
      model: 'llama3.1:8b-instruct-q4_K_M',
      temperature: 0.7,
    })

    await expect(provider.generate('sys', 'usr', 300)).rejects.toThrow()
  })

  it('health check returns true when Ollama is reachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ models: [{ name: 'llama3.1' }] }),
    }))

    const provider = createOllamaProvider({
      baseUrl: 'http://localhost:11434',
      model: 'llama3.1:8b-instruct-q4_K_M',
      temperature: 0.7,
    })

    expect(await provider.healthCheck()).toBe(true)
  })

  it('health check returns false when Ollama is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')))

    const provider = createOllamaProvider({
      baseUrl: 'http://localhost:11434',
      model: 'llama3.1:8b-instruct-q4_K_M',
      temperature: 0.7,
    })

    expect(await provider.healthCheck()).toBe(false)
  })
})
```

**Step 3: Run tests to verify they fail**

```bash
npm test src/lib/llm/ollama.test.ts
```

**Step 4: Write the implementation**

`src/lib/llm/ollama.ts`:
```typescript
import type { LLMProvider, LLMResponse } from './provider'

type OllamaConfig = {
  baseUrl: string
  model: string
  temperature: number
}

export function createOllamaProvider(config: OllamaConfig): LLMProvider {
  return {
    name: 'ollama',

    async generate(system: string, user: string, maxTokens: number): Promise<LLMResponse> {
      const start = performance.now()

      const response = await fetch(`${config.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          stream: false,
          options: {
            num_predict: maxTokens,
            temperature: config.temperature,
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const latencyMs = Math.round(performance.now() - start)

      return {
        text: data.message.content,
        latencyMs,
      }
    },

    async healthCheck(): Promise<boolean> {
      try {
        const response = await fetch(`${config.baseUrl}/api/tags`)
        return response.ok
      } catch {
        return false
      }
    },
  }
}
```

**Step 5: Run tests to verify they pass**

```bash
npm test src/lib/llm/ollama.test.ts
```

Expected: All 5 tests PASS.

**Step 6: Commit**

```bash
git add src/lib/llm/provider.ts src/lib/llm/ollama.ts src/lib/llm/ollama.test.ts
git commit -m "feat: LLM provider interface and Ollama implementation with TDD"
```

---

## Task 7: Suggestion Engine (TDD)

**Files:**
- Create: `src/lib/suggestion/engine.ts`
- Create: `src/lib/suggestion/engine.test.ts`

Orchestrates the suggestion cycle: builds prompt, calls provider,
parses response, applies cooldown. Uses dependency injection so
tests use a mock provider.

**Step 1: Write the failing tests**

`src/lib/suggestion/engine.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SuggestionEngine } from './engine'
import type { LLMProvider } from '../llm/provider'

function createMockProvider(responseText: string): LLMProvider {
  return {
    name: 'mock',
    generate: vi.fn().mockResolvedValue({ text: responseText, latencyMs: 100 }),
    healthCheck: vi.fn().mockResolvedValue(true),
  }
}

describe('SuggestionEngine', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('generates a suggestion from transcript and context', async () => {
    const provider = createMockProvider(
      'TYPE: RECALL\nTITLE: Mayor Hild\nBODY: Quest giver, 500gp reward.\nDM_ONLY: false'
    )
    const engine = new SuggestionEngine(provider)

    const suggestion = await engine.runCycle({
      campaignContext: 'NPCs: Mayor Hild',
      characterBackstories: '',
      recentTranscript: 'Let us talk to the mayor',
      fullTranscript: 'Let us talk to the mayor',
      sessionElapsed: 600,
    })

    expect(suggestion).not.toBeNull()
    expect(suggestion!.title).toBe('Mayor Hild')
    expect(suggestion!.type).toBe('RECALL')
    expect(suggestion!.source).toBe('proactive')
    expect(provider.generate).toHaveBeenCalledOnce()
  })

  it('returns null when LLM responds NONE', async () => {
    const provider = createMockProvider('NONE')
    const engine = new SuggestionEngine(provider)

    const suggestion = await engine.runCycle({
      campaignContext: '',
      characterBackstories: '',
      recentTranscript: 'Pass the chips',
      fullTranscript: 'Pass the chips',
      sessionElapsed: 600,
    })

    expect(suggestion).toBeNull()
  })

  it('suppresses duplicate entity within cooldown window', async () => {
    const provider = createMockProvider(
      'TYPE: RECALL\nTITLE: Mayor Hild\nBODY: Quest giver.\nDM_ONLY: false'
    )
    const engine = new SuggestionEngine(provider)

    const ctx = {
      campaignContext: 'NPCs: Mayor Hild',
      characterBackstories: '',
      recentTranscript: 'Talk to Mayor Hild',
      fullTranscript: 'Talk to Mayor Hild',
      sessionElapsed: 600,
    }

    // First call — should return suggestion
    const first = await engine.runCycle(ctx)
    expect(first).not.toBeNull()

    // Second call immediately — title is in cooldown, should be suppressed
    const second = await engine.runCycle(ctx)
    expect(second).toBeNull()
  })

  it('generates panic button response bypassing cooldown', async () => {
    const provider = createMockProvider(
      'TYPE: IMPROV\nTITLE: Quick NPC\nBODY: Grel, a gruff half-orc dockworker.\nDM_ONLY: false'
    )
    const engine = new SuggestionEngine(provider)

    const suggestion = await engine.runPanic('need_npc', {
      campaignContext: 'Fantasy town setting',
      characterBackstories: '',
      recentTranscript: 'We go to the docks',
      fullTranscript: 'We go to the docks',
    })

    expect(suggestion).not.toBeNull()
    expect(suggestion!.source).toBe('panic')
  })

  it('generates ad-hoc question response', async () => {
    const provider = createMockProvider(
      'TYPE: RULES\nTITLE: Grapple Rules\nBODY: Replaces one attack, contested check.\nDM_ONLY: false'
    )
    const engine = new SuggestionEngine(provider)

    const suggestion = await engine.runQuestion('What are the grapple rules?', {
      campaignContext: 'D&D 5e',
      characterBackstories: '',
      recentTranscript: '',
      fullTranscript: '',
    })

    expect(suggestion).not.toBeNull()
    expect(suggestion!.source).toBe('question')
  })

  it('returns null and does not throw when provider fails', async () => {
    const provider: LLMProvider = {
      name: 'failing',
      generate: vi.fn().mockRejectedValue(new Error('connection refused')),
      healthCheck: vi.fn().mockResolvedValue(false),
    }
    const engine = new SuggestionEngine(provider)

    const suggestion = await engine.runCycle({
      campaignContext: '',
      characterBackstories: '',
      recentTranscript: 'Hello',
      fullTranscript: 'Hello',
      sessionElapsed: 60,
    })

    expect(suggestion).toBeNull()
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
npm test src/lib/suggestion/engine.test.ts
```

**Step 3: Write the implementation**

`src/lib/suggestion/engine.ts`:
```typescript
import type { LLMProvider } from '../llm/provider'
import type { Suggestion, PanicButtonId } from '../types'
import { parseSuggestionResponse } from './parser'
import { buildSuggestionPrompt, buildPanicPrompt } from './prompt-builder'
import { CooldownTracker } from './cooldown'

type CycleContext = {
  campaignContext: string
  characterBackstories: string
  recentTranscript: string
  fullTranscript: string
  sessionElapsed: number
}

type PanicContext = {
  campaignContext: string
  characterBackstories: string
  recentTranscript: string
  fullTranscript: string
}

let nextId = 0
function generateId(): string {
  return `sug_${Date.now()}_${nextId++}`
}

export class SuggestionEngine {
  private provider: LLMProvider
  private cooldown = new CooldownTracker()
  private activeSuggestions: string[] = []

  constructor(provider: LLMProvider) {
    this.provider = provider
  }

  setProvider(provider: LLMProvider): void {
    this.provider = provider
  }

  async runCycle(ctx: CycleContext): Promise<Suggestion | null> {
    try {
      const { system, user } = buildSuggestionPrompt({
        campaignContext: ctx.campaignContext,
        characterBackstories: ctx.characterBackstories,
        recentTranscript: ctx.recentTranscript,
        activeSuggestions: this.activeSuggestions,
        sessionElapsed: ctx.sessionElapsed,
      })

      const response = await this.provider.generate(system, user, 300)
      const parsed = parseSuggestionResponse(response.text)

      if (!parsed) return null

      // Check cooldown on the title (entity name)
      if (this.cooldown.isSuppressed(parsed.title)) {
        return null
      }

      this.cooldown.register(parsed.title)
      this.activeSuggestions.push(parsed.title)

      return {
        id: generateId(),
        ...parsed,
        timestamp: ctx.sessionElapsed,
        pinned: false,
        dismissed: false,
        source: 'proactive',
      }
    } catch {
      return null
    }
  }

  async runPanic(buttonId: PanicButtonId, ctx: PanicContext): Promise<Suggestion | null> {
    try {
      const { system, user } = buildPanicPrompt(buttonId, ctx)
      const response = await this.provider.generate(system, user, 400)
      const parsed = parseSuggestionResponse(response.text)

      if (!parsed) return null

      return {
        id: generateId(),
        ...parsed,
        timestamp: 0,
        pinned: false,
        dismissed: false,
        source: 'panic',
      }
    } catch {
      return null
    }
  }

  async runQuestion(question: string, ctx: PanicContext): Promise<Suggestion | null> {
    try {
      const system = `You are a TTRPG assistant. Answer the DM's question concisely and accurately.
Use campaign context if relevant. Format your response as:
TYPE: [most relevant type]
TITLE: [short title]
BODY: [your answer]
DM_ONLY: false

CAMPAIGN CONTEXT:
${ctx.campaignContext}

CHARACTER BACKSTORIES:
${ctx.characterBackstories}`

      const user = `RECENT TRANSCRIPT:
${ctx.recentTranscript}

DM'S QUESTION: ${question}`

      const response = await this.provider.generate(system, user, 400)
      const parsed = parseSuggestionResponse(response.text)

      if (!parsed) return null

      return {
        id: generateId(),
        ...parsed,
        timestamp: 0,
        pinned: false,
        dismissed: false,
        source: 'question',
      }
    } catch {
      return null
    }
  }

  clearActiveSuggestions(): void {
    this.activeSuggestions = []
  }
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test src/lib/suggestion/engine.test.ts
```

Expected: All 6 tests PASS.

**Step 5: Run all tests**

```bash
npm test
```

Expected: All tests across all files PASS (parser: 9, cooldown: 8, prompt-builder: 10, ollama: 5, engine: 6 = ~38 tests).

**Step 6: Commit**

```bash
git add src/lib/suggestion/engine.ts src/lib/suggestion/engine.test.ts
git commit -m "feat: suggestion engine with cycle, panic, and question support"
```

---

## Task 8: React UI — Core Layout and Components

**Files:**
- Create: `src/components/SuggestionCard.tsx`
- Create: `src/components/SuggestionPanel.tsx`
- Create: `src/components/TranscriptPanel.tsx`
- Create: `src/components/CampaignEditor.tsx`
- Create: `src/components/PanicToolbar.tsx`
- Create: `src/components/QuestionInput.tsx`
- Create: `src/components/StatusBar.tsx`
- Modify: `src/App.tsx`

Build all UI components and wire them together. The app state lives
in App.tsx using useState/useRef. No external state library needed for MVP.

**Step 1: Build SuggestionCard component**

`src/components/SuggestionCard.tsx`:
```tsx
import type { Suggestion } from '../lib/types'
import { SUGGESTION_ICONS } from '../lib/types'

type Props = {
  suggestion: Suggestion
  onPin: (id: string) => void
  onDismiss: (id: string) => void
}

export function SuggestionCard({ suggestion, onPin, onDismiss }: Props) {
  const icon = SUGGESTION_ICONS[suggestion.type] ?? '💬'
  const sourceLabel = suggestion.source === 'question' ? 'Q&A' : suggestion.source === 'panic' ? 'Panic' : ''

  return (
    <div
      className={`rounded-lg border p-3 mb-2 ${
        suggestion.dmOnly
          ? 'border-red-500/50 bg-red-950/20'
          : 'border-gray-700 bg-gray-900'
      } ${suggestion.pinned ? 'ring-1 ring-yellow-500/50' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <span>{icon}</span>
          <span className="font-medium text-gray-200">{suggestion.title}</span>
          {suggestion.dmOnly && (
            <span className="text-xs bg-red-800 text-red-200 px-1.5 py-0.5 rounded font-medium">
              DM ONLY
            </span>
          )}
          {sourceLabel && (
            <span className="text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">
              {sourceLabel}
            </span>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => onPin(suggestion.id)}
            className="text-gray-500 hover:text-yellow-400 text-sm px-1"
            title={suggestion.pinned ? 'Unpin' : 'Pin'}
          >
            {suggestion.pinned ? '📌' : '📍'}
          </button>
          <button
            onClick={() => onDismiss(suggestion.id)}
            className="text-gray-500 hover:text-red-400 text-sm px-1"
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>
      <p className="text-sm text-gray-300 mt-1.5 leading-relaxed">{suggestion.body}</p>
    </div>
  )
}
```

**Step 2: Build SuggestionPanel**

`src/components/SuggestionPanel.tsx`:
```tsx
import type { Suggestion } from '../lib/types'
import { SuggestionCard } from './SuggestionCard'

type Props = {
  suggestions: Suggestion[]
  onPin: (id: string) => void
  onDismiss: (id: string) => void
}

export function SuggestionPanel({ suggestions, onPin, onDismiss }: Props) {
  const pinned = suggestions.filter((s) => s.pinned && !s.dismissed)
  const unpinned = suggestions.filter((s) => !s.pinned && !s.dismissed)

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
        Suggestions
      </h2>
      <div className="flex-1 overflow-y-auto">
        {pinned.length > 0 && (
          <div className="mb-3">
            <div className="text-xs text-yellow-500 font-medium mb-1">Pinned</div>
            {pinned.map((s) => (
              <SuggestionCard key={s.id} suggestion={s} onPin={onPin} onDismiss={onDismiss} />
            ))}
          </div>
        )}
        {unpinned.map((s) => (
          <SuggestionCard key={s.id} suggestion={s} onPin={onPin} onDismiss={onDismiss} />
        ))}
        {suggestions.filter((s) => !s.dismissed).length === 0 && (
          <p className="text-gray-600 text-sm italic">
            Suggestions will appear here once the session is active...
          </p>
        )}
      </div>
    </div>
  )
}
```

**Step 3: Build TranscriptPanel**

`src/components/TranscriptPanel.tsx`:
```tsx
import type { TranscriptEntry } from '../lib/types'

type Props = {
  entries: TranscriptEntry[]
  onAddEntry: (text: string) => void
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function TranscriptPanel({ entries, onAddEntry }: Props) {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const input = form.elements.namedItem('transcript-input') as HTMLInputElement
    const text = input.value.trim()
    if (text) {
      onAddEntry(text)
      input.value = ''
    }
  }

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
        Transcript
      </h2>
      <div className="flex-1 overflow-y-auto space-y-1 mb-2">
        {entries.map((entry) => (
          <div key={entry.id} className="text-sm">
            <span className="text-gray-500 font-mono text-xs mr-2">
              [{formatTime(entry.ts)}]
            </span>
            <span className="text-gray-300">{entry.text}</span>
          </div>
        ))}
        {entries.length === 0 && (
          <p className="text-gray-600 text-sm italic">
            Type table conversation below to simulate transcription...
          </p>
        )}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          name="transcript-input"
          type="text"
          placeholder="Type what's being said at the table..."
          className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-gray-500"
        />
        <button
          type="submit"
          className="bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm px-3 py-1.5 rounded"
        >
          Add
        </button>
      </form>
    </div>
  )
}
```

**Step 4: Build CampaignEditor**

`src/components/CampaignEditor.tsx`:
```tsx
type Props = {
  context: string
  backstories: string
  onContextChange: (value: string) => void
  onBackstoriesChange: (value: string) => void
  sessionActive: boolean
}

export function CampaignEditor({
  context,
  backstories,
  onContextChange,
  onBackstoriesChange,
  sessionActive,
}: Props) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">
          Campaign Context
        </label>
        <textarea
          value={context}
          onChange={(e) => onContextChange(e.target.value)}
          disabled={sessionActive}
          rows={6}
          placeholder="Paste your campaign notes: NPCs, locations, items, house rules, plot hooks..."
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed resize-y"
        />
        {sessionActive && (
          <p className="text-xs text-gray-500 mt-1">Context is locked during an active session.</p>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">
          Character Backstories
        </label>
        <textarea
          value={backstories}
          onChange={(e) => onBackstoriesChange(e.target.value)}
          disabled={sessionActive}
          rows={4}
          placeholder="Character name, class, backstory, bonds, flaws, goals..."
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed resize-y"
        />
      </div>
    </div>
  )
}
```

**Step 5: Build PanicToolbar**

`src/components/PanicToolbar.tsx`:
```tsx
import { PANIC_BUTTONS } from '../lib/types'
import type { PanicButtonId } from '../lib/types'

type Props = {
  onPanic: (id: PanicButtonId) => void
  disabled: boolean
  loading: PanicButtonId | null
}

export function PanicToolbar({ onPanic, disabled, loading }: Props) {
  return (
    <div className="flex gap-2">
      {PANIC_BUTTONS.map((btn) => (
        <button
          key={btn.id}
          onClick={() => onPanic(btn.id)}
          disabled={disabled || loading === btn.id}
          title={btn.description}
          className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <span>{btn.icon}</span>
          <span>{btn.label}</span>
          {loading === btn.id && (
            <span className="animate-spin text-xs">⏳</span>
          )}
        </button>
      ))}
    </div>
  )
}
```

**Step 6: Build QuestionInput**

`src/components/QuestionInput.tsx`:
```tsx
type Props = {
  onSubmit: (question: string) => void
  disabled: boolean
  loading: boolean
}

export function QuestionInput({ onSubmit, disabled, loading }: Props) {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const input = form.elements.namedItem('question-input') as HTMLInputElement
    const text = input.value.trim()
    if (text) {
      onSubmit(text)
      input.value = ''
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        name="question-input"
        type="text"
        placeholder="Ask a question (rules, NPCs, encounters...)"
        disabled={disabled}
        className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-gray-500 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || loading}
        className="bg-indigo-700 hover:bg-indigo-600 text-white text-sm px-4 py-1.5 rounded disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? '...' : 'Ask'}
      </button>
    </form>
  )
}
```

**Step 7: Build StatusBar**

`src/components/StatusBar.tsx`:
```tsx
import type { ProviderStatus, SessionState } from '../lib/types'

type Props = {
  sessionState: SessionState
  providerName: string
  providerStatus: ProviderStatus
  sessionElapsed: number
  suggestionCount: number
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

const STATUS_COLORS: Record<ProviderStatus, string> = {
  connected: 'text-green-400',
  disconnected: 'text-red-400',
  error: 'text-red-400',
  'no-model': 'text-yellow-400',
  unconfigured: 'text-gray-500',
}

export function StatusBar({ sessionState, providerName, providerStatus, sessionElapsed, suggestionCount }: Props) {
  return (
    <div className="flex items-center justify-between bg-gray-900 border-t border-gray-800 px-4 py-1.5 text-xs text-gray-400">
      <div className="flex items-center gap-4">
        <span>
          {sessionState === 'active' ? '🟢 Session Active' : sessionState === 'ended' ? '⏹️ Session Ended' : '⏸️ No Session'}
        </span>
        <span className={STATUS_COLORS[providerStatus]}>
          {providerName === 'ollama' ? '🖥️' : '☁️'} {providerName} — {providerStatus}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span>{suggestionCount} suggestions</span>
        {sessionState === 'active' && <span>⏱️ {formatElapsed(sessionElapsed)}</span>}
      </div>
    </div>
  )
}
```

**Step 8: Wire everything together in App.tsx**

`src/App.tsx`:
```tsx
import { useState, useRef, useEffect, useCallback } from 'react'
import type { Suggestion, TranscriptEntry, PanicButtonId, SessionState, ProviderStatus } from './lib/types'
import { SuggestionEngine } from './lib/suggestion/engine'
import { createOllamaProvider } from './lib/llm/ollama'
import { CampaignEditor } from './components/CampaignEditor'
import { TranscriptPanel } from './components/TranscriptPanel'
import { SuggestionPanel } from './components/SuggestionPanel'
import { PanicToolbar } from './components/PanicToolbar'
import { QuestionInput } from './components/QuestionInput'
import { StatusBar } from './components/StatusBar'

const CYCLE_INTERVAL_MS = 45_000

function App() {
  // --- Session state ---
  const [sessionState, setSessionState] = useState<SessionState>('idle')
  const [sessionStart, setSessionStart] = useState<number>(0)
  const [sessionElapsed, setSessionElapsed] = useState(0)

  // --- Campaign data ---
  const [campaignContext, setCampaignContext] = useState('')
  const [characterBackstories, setCharacterBackstories] = useState('')

  // --- Transcript ---
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])

  // --- Suggestions ---
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])

  // --- Provider status ---
  const [providerStatus, setProviderStatus] = useState<ProviderStatus>('unconfigured')

  // --- Loading states ---
  const [panicLoading, setPanicLoading] = useState<PanicButtonId | null>(null)
  const [questionLoading, setQuestionLoading] = useState(false)

  // --- Engine ref ---
  const engineRef = useRef<SuggestionEngine | null>(null)
  const cycleRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Initialize provider on mount
  useEffect(() => {
    const provider = createOllamaProvider({
      baseUrl: 'http://localhost:11434',
      model: 'llama3.1:8b-instruct-q4_K_M',
      temperature: 0.7,
    })
    engineRef.current = new SuggestionEngine(provider)

    provider.healthCheck().then((ok) => {
      setProviderStatus(ok ? 'connected' : 'disconnected')
    })
  }, [])

  // Session timer
  useEffect(() => {
    if (sessionState === 'active') {
      timerRef.current = setInterval(() => {
        setSessionElapsed(Math.floor((Date.now() - sessionStart) / 1000))
      }, 1000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [sessionState, sessionStart])

  // --- Helpers ---
  function getRecentTranscript(): string {
    const threeMinAgo = sessionElapsed - 180
    return transcript
      .filter((e) => e.ts >= threeMinAgo)
      .map((e) => `[${Math.floor(e.ts / 60)}:${String(Math.floor(e.ts % 60)).padStart(2, '0')}] ${e.text}`)
      .join('\n')
  }

  function getFullTranscript(): string {
    return transcript
      .map((e) => `[${Math.floor(e.ts / 60)}:${String(Math.floor(e.ts % 60)).padStart(2, '0')}] ${e.text}`)
      .join('\n')
  }

  function addSuggestion(suggestion: Suggestion) {
    setSuggestions((prev) => [suggestion, ...prev])
  }

  // --- Suggestion cycle ---
  const runSuggestionCycle = useCallback(async () => {
    if (!engineRef.current || transcript.length === 0) return

    const suggestion = await engineRef.current.runCycle({
      campaignContext,
      characterBackstories,
      recentTranscript: getRecentTranscript(),
      fullTranscript: getFullTranscript(),
      sessionElapsed,
    })

    if (suggestion) addSuggestion(suggestion)
  }, [campaignContext, characterBackstories, transcript, sessionElapsed])

  // Start/stop suggestion cycle
  useEffect(() => {
    if (sessionState === 'active') {
      cycleRef.current = setInterval(runSuggestionCycle, CYCLE_INTERVAL_MS)
    }
    return () => {
      if (cycleRef.current) clearInterval(cycleRef.current)
    }
  }, [sessionState, runSuggestionCycle])

  // --- Actions ---
  function handleStartSession() {
    setSessionState('active')
    setSessionStart(Date.now())
    setSessionElapsed(0)
    setTranscript([])
    setSuggestions([])
    engineRef.current?.clearActiveSuggestions()
  }

  function handleEndSession() {
    setSessionState('ended')
    if (cycleRef.current) clearInterval(cycleRef.current)
  }

  function handleAddTranscript(text: string) {
    const entry: TranscriptEntry = {
      id: `t_${Date.now()}`,
      ts: sessionElapsed,
      text,
      confidence: 1.0,
    }
    setTranscript((prev) => [...prev, entry])
  }

  async function handlePanic(buttonId: PanicButtonId) {
    if (!engineRef.current) return
    setPanicLoading(buttonId)

    const suggestion = await engineRef.current.runPanic(buttonId, {
      campaignContext,
      characterBackstories,
      recentTranscript: getRecentTranscript(),
      fullTranscript: getFullTranscript(),
    })

    if (suggestion) addSuggestion(suggestion)
    setPanicLoading(null)
  }

  async function handleQuestion(question: string) {
    if (!engineRef.current) return
    setQuestionLoading(true)

    const suggestion = await engineRef.current.runQuestion(question, {
      campaignContext,
      characterBackstories,
      recentTranscript: getRecentTranscript(),
      fullTranscript: getFullTranscript(),
    })

    if (suggestion) addSuggestion(suggestion)
    setQuestionLoading(false)
  }

  function handlePin(id: string) {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, pinned: !s.pinned } : s))
    )
  }

  function handleDismiss(id: string) {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, dismissed: true } : s))
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-gray-100">
      {/* Header */}
      <div className="border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">DM Assistant</h1>
        <div className="flex items-center gap-3">
          <PanicToolbar
            onPanic={handlePanic}
            disabled={sessionState !== 'active'}
            loading={panicLoading}
          />
          {sessionState === 'idle' && (
            <button
              onClick={handleStartSession}
              className="bg-green-700 hover:bg-green-600 text-white text-sm px-4 py-1.5 rounded font-medium"
            >
              Start Session
            </button>
          )}
          {sessionState === 'active' && (
            <button
              onClick={handleEndSession}
              className="bg-red-800 hover:bg-red-700 text-white text-sm px-4 py-1.5 rounded font-medium"
            >
              End Session
            </button>
          )}
          {sessionState === 'ended' && (
            <button
              onClick={handleStartSession}
              className="bg-green-700 hover:bg-green-600 text-white text-sm px-4 py-1.5 rounded font-medium"
            >
              New Session
            </button>
          )}
        </div>
      </div>

      {/* Main content — three panel layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel: Transcript */}
        <div className="w-1/3 border-r border-gray-800 p-4 flex flex-col">
          {sessionState === 'active' ? (
            <TranscriptPanel entries={transcript} onAddEntry={handleAddTranscript} />
          ) : (
            <CampaignEditor
              context={campaignContext}
              backstories={characterBackstories}
              onContextChange={setCampaignContext}
              onBackstoriesChange={setCharacterBackstories}
              sessionActive={false}
            />
          )}
        </div>

        {/* Right panel: Suggestions */}
        <div className="flex-1 p-4 flex flex-col">
          <div className="mb-3">
            <QuestionInput
              onSubmit={handleQuestion}
              disabled={sessionState !== 'active'}
              loading={questionLoading}
            />
          </div>
          <div className="flex-1 overflow-hidden">
            <SuggestionPanel
              suggestions={suggestions}
              onPin={handlePin}
              onDismiss={handleDismiss}
            />
          </div>
        </div>
      </div>

      {/* Status bar */}
      <StatusBar
        sessionState={sessionState}
        providerName="ollama"
        providerStatus={providerStatus}
        sessionElapsed={sessionElapsed}
        suggestionCount={suggestions.filter((s) => !s.dismissed).length}
      />
    </div>
  )
}

export default App
```

**Step 9: Verify the app runs**

```bash
npm run dev
```

Open http://localhost:5173. You should see:
- Campaign context editor (left panel)
- Suggestion panel (right panel)
- Panic toolbar (header)
- Start Session button
- Status bar at the bottom

**Step 10: Run all tests**

```bash
npm test
```

Expected: All ~38 tests pass.

**Step 11: Commit**

```bash
git add src/components/ src/App.tsx
git commit -m "feat: core UI with three-panel layout, panic buttons, and question input"
```

---

## Task 9: Integration Smoke Test

**Files:**
- No new files — manual testing with Ollama

This task verifies the whole flow works end-to-end.

**Step 1: Start Ollama**

```bash
ollama serve &
ollama pull llama3.1:8b-instruct-q4_K_M
```

(If the 8b model is too large, use `llama3.2:3b-instruct` and update the model name in App.tsx.)

**Step 2: Start the app**

```bash
npm run dev
```

**Step 3: Paste campaign context**

Paste into the Campaign Context field:
```
Campaign: Curse of the Hollow King
Party: Vex (half-elf ranger), Drogan (dwarf cleric), Sable (tiefling warlock)
Current quest: Retrieve the Ashen Crown from the Tomb of Kael
NPCs: Mayor Hild (quest giver, offered 500gp), Oldroot (neutral treant), Reva the Red (tiefling fence, pet pseudodragon Cinder)
House rules: Critical hits = max damage + roll. Healing potions = bonus action.
Unresolved hooks: Sable promised Oldroot to return the stolen seedling.
```

**Step 4: Click Start Session**

- Left panel should switch to transcript input
- Status bar should show session timer ticking

**Step 5: Add transcript entries**

Type and submit these one at a time:
1. "Let's go talk to the mayor about our reward"
2. "Do we trust her? She seemed nervous last time"
3. "I want to use Insight on Mayor Hild"

**Step 6: Wait for suggestion cycle (45s) or test panic buttons**

Click "Need an NPC" — should get a suggestion card with a generated NPC.
Click "Recap" — should get a brief session summary.

**Step 7: Verify suggestion cards**

- Cards should appear with type icons
- Pin/dismiss should work
- DM ONLY label should appear when applicable

**Step 8: Verify the question input**

Type "What are the grappling rules in 5e?" and click Ask.
Should get a suggestion card with rules info.

**Step 9: Final commit**

If any adjustments were needed during smoke testing, commit them:

```bash
git add -A
git commit -m "fix: adjustments from integration smoke test"
```

---

## Done — What You Have

After completing all 9 tasks:

- **~38 unit tests** covering parser, cooldown, prompt builder, Ollama provider, and suggestion engine
- **Working UI** with campaign editor, transcript input, suggestion panel, panic buttons, question input, and status bar
- **Live integration with Ollama** for AI-generated suggestions
- **Core product hypothesis testable:** paste context → feed transcript → get suggestions

## What Comes Next (not in this plan)

1. Install Rust/cargo and wrap in Tauri
2. Integrate whisper.cpp for live audio transcription
3. Add Anthropic provider (Claude API)
4. SQLite persistence for campaigns across sessions
5. Session export (Markdown/JSON)
6. Remaining 7 panic buttons
7. Adaptive music system
8. MCP server companion
