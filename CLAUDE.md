# DM Assistant — Project Context

## What This Is

A desktop app that acts as a real-time AI copilot for tabletop RPG Dungeon Masters. It listens to the session via microphone, transcribes in real time, and proactively surfaces contextual suggestions — NPC details, rules clarifications, backstory connections, and improvisation prompts — so the DM can stay focused on running the game.

**Product name:** TBD (working title: DM Assistant)
**Entity:** Null Arc LLC (side project)
**Business model:** $35 one-time purchase, perpetual license, no subscription
**Target user:** Dungeon Masters running D&D 5e (expandable to other systems)

## Architecture Summary

**Local-first, cloud-optional.** Everything can run offline on the DM's laptop.

| Component | Technology | Role |
|-----------|-----------|------|
| App shell | **Tauri** (Rust + React/TypeScript) | Desktop app, lightweight (~5MB), cross-platform |
| STT | **whisper.cpp** (bundled, always local) | Live mic → transcript, <3s latency, audio never leaves machine |
| LLM (local) | **Ollama** (llama3.1:8b-instruct Q4_K_M) | Suggestion generation, free, private, offline |
| LLM (cloud) | **Anthropic API** (claude-sonnet-4-6, user's own key) | Optional upgrade for superior suggestion quality |
| Storage | **SQLite** | Campaign persistence, session history, config |
| Music | **Built-in crossfade player** + optional Syrinscape/local folders | Automatic scene-adaptive background music |
| MCP Server | **FastMCP** (Python, separate package) | Free companion — connects campaign DB to Claude Desktop for session prep |

### LLM Provider Abstraction

The suggestion engine talks to an `LLMProvider` interface, never directly to Ollama or Claude. Both backends use identical prompts. The quality difference comes from model capability, not different code paths. Users can switch providers mid-session in settings.

```
Suggestion Engine → LLMProvider Interface → OllamaProvider (local, free)
                                          → AnthropicProvider (cloud, BYOK)
```

### Data Flow During a Session

```
Mic → whisper.cpp → Transcript Manager → Scene Classifier → Music Controller
                           ↓                    ↓
                    Suggestion Engine ←── Campaign Context (SQLite)
                           ↓                    ↑
                    LLM Provider ───────── Character Backstories
                           ↓
                    Suggestion Panel (UI)
```

## Key Features

### 1. Real-Time Suggestions (proactive, every 45-60 seconds)
- NPC/entity recall when mentioned by name or indirectly
- Rules clarification when mechanical questions arise
- Plot thread reminders when unresolved hooks become relevant
- Monster stat surfacing when combat starts
- Spell/ability details when players use them
- Backstory weaving — connects current scene to character personal stories
- Improvisation support when players go off-script

### 2. Panic Buttons (one-click, immediate response)
10 hotkey buttons for common DM problems:
- 📱 Phones Out — re-engage distracted player using their backstory
- 🤫 Quiet Player — spotlight the least-active character
- ⏳ Deliberation Loop — inject urgency event to break analysis paralysis
- 💀 Too Easy / 🔥 Too Hard — escalate or de-escalate combat
- 🎭 Dead Air — break silence with a character-specific prompt
- 🗺️ Off Script — quick location/NPC/hook for unplanned tangent
- ⚡ Energy Low — high-energy narrative beat injection
- 🎲 Need an NPC — instant name, personality, quirk
- 📜 Recap — session-so-far summary for post-break reorientation

### 3. Character Backstory Integration
Player backstories, bonds, flaws, and goals are first-class data. The suggestion engine and panic buttons use them to generate personalized hooks. The "Phones Out" button identifies the least-active player and generates a narrative intervention rooted in their backstory.

### 4. Adaptive Music System
Scene classifier (keyword-based, runs every 15-30s) detects: COMBAT, COMBAT_BOSS, EXPLORATION, SOCIAL, DRAMATIC, TENSION, DOWNTIME, AMBIENT. Crossfades between music tracks automatically. Three tiers: built-in loops (ships with app), local MP3 folders, Syrinscape URI triggers. Panic buttons have audio hooks (stings, ducks, fades).

### 5. MCP Server Companion (separate package, free, open-source)
FastMCP Python server that reads/writes the same SQLite database. Exposes campaign data as MCP resources and provides tools for Claude Desktop to add NPCs, plot hooks, session summaries. Includes pre-built prompts for session prep, post-session review, backstory integration, encounter building, and worldbuilding.

## Tech Stack Details

### Frontend (React + TypeScript + Tailwind)
- Single-page app, no routing
- Three-panel layout: transcript (left), suggestions (center/right), campaign context + panic buttons (top/bottom)
- Status bar: scene badge, LLM provider indicator, music controls, session timer
- Suggestion cards with type badges (📋 Recall, 📖 Rules, 🧵 Thread, ⚔️ Combat, ✨ Spell, 💡 Improv, ⏱️ Pacing), pin/dismiss, DM ONLY label
- Virtualized transcript list for 4+ hour session stability

### Backend (Tauri / Rust)
- Spawns and manages whisper.cpp process via stdio pipe
- HTTP client for Ollama (localhost:11434) and Anthropic API
- SQLite via rusqlite for campaign persistence
- Suggestion cycle timer (configurable, default 45s)
- Scene classifier with 10-second stability dampening
- Audio playback + crossfade engine
- Audio device enumeration (separate input/output)

### Database Schema (SQLite)
Tables: campaigns, characters, npcs, plot_hooks, encounters, sessions, suggestions. Transcripts stored as JSONL files alongside sessions. Full schema in specs/04-architecture.md.

### whisper.cpp Integration
- Bundled `ggml-small.en.bin` model (~466MB), user can swap in settings
- Uses `--prompt` flag with pre-registered character/NPC names from campaign context to improve fantasy name accuracy
- `whisper-stream` mode: 500ms step, 5s context window
- Output piped to Transcript Manager which buffers, timestamps, and deduplicates

### Ollama Integration
- Default model: `llama3.1:8b-instruct-q4_K_M` (~5-6GB VRAM)
- Health check via `GET /api/tags`
- Chat completions via `POST /api/chat`
- First-run wizard detects Ollama, recommends model based on hardware

### Anthropic API Integration
- Provider: `AnthropicProvider` implementing `LLMProvider` interface
- Endpoint: `POST https://api.anthropic.com/v1/messages`
- Headers: `x-api-key`, `anthropic-version: 2023-06-01`
- Default model: `claude-sonnet-4-6`
- API key stored in OS keychain (macOS Keychain, Windows Credential Manager)
- Estimated cost: ~$2.50-3.50 per 4-hour session with Sonnet

## Project Structure (Target)

```
dm-assistant/
├── CLAUDE.md                    # This file
├── docs/
│   ├── 01-market-research.md    # Competitive landscape, market data
│   └── 02-business-model.md     # Pricing, go-to-market, revenue projections
├── specs/
│   ├── 01-mvp-features-bdd.md   # 39 BDD scenarios across 5 MVP features
│   ├── 02-suggestion-engine-bdd.md  # 52 scenarios for the suggestion engine
│   ├── 03-pain-points-and-features.md  # Reddit research, backstory weaver, panic buttons
│   ├── 04-architecture.md       # Full technical architecture with code samples
│   ├── 05-mcp-server.md         # MCP server companion spec with FastMCP code
│   └── 06-adaptive-music.md     # Music system spec with BDD scenarios
├── src-tauri/                   # Rust backend (Tauri)
│   ├── src/
│   │   ├── main.rs
│   │   ├── whisper.rs           # whisper.cpp process management
│   │   ├── llm/
│   │   │   ├── mod.rs
│   │   │   ├── provider.rs      # LLMProvider trait
│   │   │   ├── ollama.rs        # OllamaProvider
│   │   │   └── anthropic.rs     # AnthropicProvider
│   │   ├── suggestion/
│   │   │   ├── mod.rs
│   │   │   ├── engine.rs        # Suggestion cycle, prompt builder
│   │   │   ├── classifier.rs    # Scene classifier
│   │   │   └── cooldown.rs      # Entity dedup/cooldown tracker
│   │   ├── music/
│   │   │   ├── mod.rs
│   │   │   ├── player.rs        # Audio playback + crossfade
│   │   │   └── syrinscape.rs    # URI dispatch
│   │   ├── db.rs                # SQLite operations
│   │   └── panic_buttons.rs     # Panic button dispatch
│   └── Cargo.toml
├── src/                         # React frontend
│   ├── App.tsx
│   ├── components/
│   │   ├── TranscriptPanel.tsx
│   │   ├── SuggestionPanel.tsx
│   │   ├── SuggestionCard.tsx
│   │   ├── PanicToolbar.tsx
│   │   ├── CampaignEditor.tsx
│   │   ├── BackstoryEditor.tsx
│   │   ├── MusicControls.tsx
│   │   ├── StatusBar.tsx
│   │   └── Settings/
│   │       ├── LLMSettings.tsx
│   │       ├── AudioSettings.tsx
│   │       └── MusicSettings.tsx
│   ├── hooks/
│   │   ├── useTranscript.ts
│   │   ├── useSuggestions.ts
│   │   ├── useSceneState.ts
│   │   └── useMusic.ts
│   └── lib/
│       ├── tauri-commands.ts    # Tauri IPC bindings
│       └── types.ts             # Shared TypeScript types
├── mcp-server/                  # Separate Python package
│   ├── dm_assistant_mcp/
│   │   ├── __init__.py
│   │   ├── server.py            # FastMCP server
│   │   ├── resources.py         # MCP resources
│   │   ├── tools.py             # MCP tools
│   │   └── prompts.py           # MCP prompts
│   ├── pyproject.toml
│   └── README.md
├── assets/
│   └── music/                   # Bundled royalty-free loops
│       ├── combat.mp3
│       ├── combat_boss.mp3
│       ├── exploration.mp3
│       ├── social.mp3
│       ├── dramatic.mp3
│       ├── tension.mp3
│       └── downtime.mp3
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── README.md
```

## Build Plan

| Week | Focus | Key Deliverables |
|------|-------|-----------------|
| 1 | Foundation | Tauri shell + React UI, whisper.cpp integration, Ollama API wiring |
| 2 | Core Features | Suggestion engine + prompts, campaign editor, panic buttons, backstory editor |
| 3 | Music + Claude + Polish | Scene classifier, built-in music player, Anthropic provider, crossfade, export |
| 4 | Distribution | Installers (.dmg/.msi/.AppImage), first-run wizard, docs, community launch |
| 5 | MCP Server (optional) | FastMCP resources/tools/prompts, PyPI publish, Anthropic directory submission |

## Coding Conventions

- **Rust:** Standard Rust conventions. Use `thiserror` for error types. `tokio` for async runtime. `serde` for serialization.
- **TypeScript/React:** Functional components with hooks. Tailwind for styling. No CSS modules. Types over interfaces.
- **Python (MCP server):** FastMCP 3.x decorators. Type hints everywhere. async where I/O bound.
- **General:** No abbreviations in variable names. Comments explain *why*, not *what*. Error messages should be user-facing quality.

## Important Design Decisions

1. **Prompts are the product.** The prompt templates in the suggestion engine and panic buttons are the core IP. Invest time in tuning them. A good prompt to an 8B model beats a lazy prompt to GPT-4.

2. **Silence is a feature.** The suggestion engine should return NONE more often than not. Over-suggesting trains the DM to ignore it. Only surface something when it's genuinely useful.

3. **DM ONLY labeling is non-negotiable.** Any suggestion containing information the players shouldn't see must be visually flagged. The DM's screen is visible at the table.

4. **Entity cooldown prevents spam.** Once an NPC/entity is surfaced, suppress re-surfacing for 5-10 minutes. Track in an in-memory registry with TTL.

5. **Scene classifier uses keywords for MVP.** Don't burn LLM tokens on classification. The keyword matcher is instant and good enough. LLM-based classification is a v1.1 upgrade.

6. **Audio input ≠ audio output.** The mic and speakers MUST be different devices or the app transcribes its own music. Warn in the UI if they match.

7. **The MCP server shares the SQLite database.** Both the app and the MCP server read/write the same file. This is the integration point. No API, no sync — just a shared DB.

## Spec Documents Reference

| Document | Contents | When to Reference |
|----------|----------|------------------|
| `docs/01-market-research.md` | Competitive landscape, market size, competitor analysis | Understanding the market positioning |
| `docs/02-business-model.md` | Pricing, go-to-market, revenue projections, distribution | Business decisions |
| `specs/01-mvp-features-bdd.md` | 39 BDD scenarios for Session Setup, Transcription, Suggestions, Questions, Export | Implementing MVP features |
| `specs/02-suggestion-engine-bdd.md` | 52 BDD scenarios across 7 suggestion categories + quality behaviors | Building the suggestion engine |
| `specs/03-pain-points-and-features.md` | Reddit pain point research, backstory weaver spec, panic button spec with BDD | Building backstory integration and panic buttons |
| `specs/04-architecture.md` | Full technical architecture: components, code samples, provider abstraction, DB schema, build plan, performance budget, risk register | All implementation work |
| `specs/05-mcp-server.md` | MCP server spec: FastMCP resources, tools, prompts, database integration, distribution | Building the MCP companion |
| `specs/06-adaptive-music.md` | Music system: scene classifier, crossfade engine, audio tiers, panic button audio, BDD scenarios | Building the music system |
