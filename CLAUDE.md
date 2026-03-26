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
| LLM (cloud) | **Anthropic API** (claude-sonnet-4-6, user's own key) | Optional upgrade for superior suggestion quality and faster responses |
| Storage | **SQLite** | Campaign persistence, session history, config |
| Music | **Built-in crossfade player** + optional Syrinscape/local folders | Automatic scene-adaptive background music |
| MCP Server | **FastMCP** (Python, separate package) | Free companion — connects campaign DB to Claude Desktop for session prep |

### Suggestion Engine: Pull-Based + Smart Notifications

The DM is never bombarded with unsolicited suggestions. Instead:

1. **Pull (primary):** DM clicks "Suggest" or a panic button → LLM generates response.
2. **Notify (secondary):** A lightweight background analyzer (keyword matching, zero LLM cost) monitors the transcript. When it detects a high-relevance match (NPC mentioned, backstory keyword, plot hook reference), it lights up a notification badge. DM clicks when ready → THEN the LLM fires.

This means LLM calls happen ~55 times per session instead of ~325 (push model). GPU sits idle 98% of the time. Laptops stay cool. Battery lasts.

**Notification triggers (zero LLM cost, keyword matching only):**
- NPC name from campaign context appears in transcript → 📋 badge
- Plot hook keywords detected → 🧵 badge  
- Character backstory keyword match → 🎭 badge
- Combat keywords + planned encounters exist → ⚔️ badge
- Rules-heavy action attempted → 📖 badge

Notifications are a subtle badge glow, not a popup. Unclicked notifications expire after 5 minutes. The threshold is configurable.

### Data Flow During a Session

```
Mic → whisper.cpp → Transcript Manager → Background Analyzer (keywords, no LLM)
                           ↓                        ↓
                    Scene Classifier ──→ Music    Notification Badge (glow)
                           ↓                        ↓ (DM clicks)
                    Campaign Context (SQLite) ──→ LLM Provider ──→ Suggestion Card
                                                     ↑
                              DM clicks: Suggest / Panic Button / Question
```

### LLM Provider Abstraction

The suggestion engine talks to an `LLMProvider` interface, never directly to Ollama or Claude. Both backends use identical prompts. Users can switch providers mid-session.

```
Pull Request → LLMProvider Interface → OllamaProvider (local, free)
                                     → AnthropicProvider (cloud, BYOK)
```

### Table Hardware Setup

A USB omnidirectional conference mic ($25-50) sits center-table, plugged
into the DM's laptop. Music plays through a separate Bluetooth speaker
(not the laptop speakers). That's the entire physical setup.

Recommended mic: TONOR G11 (~$25) or Blue Snowball in omni mode (~$50).
Laptop built-in mic works for 2-3 players nearby but won't cover a full table.

## Latency Profile

The pipeline from speech to suggestion is a chain, not a single number.
Full analysis with hardware benchmarks is in `specs/04-architecture.md`.

### Summary by Operation

| Operation | RTX 4090/3090 | RTX 3060/4060Ti | M1/M2 base (Ollama) | CPU-only | Claude Sonnet |
|-----------|--------------|----------------|-------------------|---------|--------------|
| Transcription | ~2-3 sec | ~2-3 sec | ~2-3 sec | ~3-4 sec | ~2 sec (always local) |
| Proactive suggestion | 1.5-2 sec | 4-5 sec | 6-7 sec | 18-28 sec | 2-4 sec |
| Panic button | 1.5-2 sec | 4-5 sec | 6-7 sec | 18-28 sec | 2-4 sec |
| Ad-hoc question | 2-3 sec | 4-6 sec | 7-8 sec | 18-28 sec | 2-4 sec |
| Post-session summary | 10-20 sec | 20-40 sec | 30-60 sec | 60-120 sec | 8-15 sec |
| Music transition | <100ms | <100ms | <100ms | <100ms | <100ms (always local) |

**Note on Apple Silicon vs NVIDIA:** Apple Silicon's unified memory
lets you run very large models (70B+) that won't fit on consumer GPUs.
But for the 8B model this app uses, NVIDIA GPUs with dedicated VRAM
are significantly faster. An RTX 4090 (~128 tok/s) is roughly 4-5x
faster than a base M1 Mac (~28 tok/s). Apple Silicon's advantage is
memory capacity, not inference speed.

### Panic Buttons Are the Critical Test

Proactive suggestions fire in the background on a 45-second timer — latency
is invisible to the DM. But panic buttons are user-initiated and time-critical.
"Phones Out" needs to produce a usable hook before the moment passes.

| Hardware | Local 8B | Claude Sonnet | Recommendation |
|----------|---------|--------------|----------------|
| RTX 4090/3090 (24GB) | 1.5-2 sec ✅ | 2-4 sec ✅ | Local is faster than cloud |
| RTX 4070 / M3 Max | 3-4 sec ✅ | 2-4 sec ✅ | Both excellent |
| RTX 4060 Ti / RTX 3060 | 4-5 sec ✅ | 2-4 sec ✅ | Local works well |
| M1/M2 Pro | 5-6 sec ⚠️ | 2-4 sec ✅ | Claude recommended for best experience |
| M1/M2 base | 6-7 sec ⚠️ | 2-4 sec ✅ | Claude recommended |
| CPU-only | 18-28 sec ❌ | 2-4 sec ✅ | Claude required |

### Hardware Recommendation (for first-run wizard)

| Hardware Profile | Default Mode |
|-----------------|-------------|
| NVIDIA RTX 4090/3090 (24GB) | Local mode. Faster than Claude. Claude optional for quality only. |
| NVIDIA RTX 4070 / M3 Max | Local mode. Claude optional for quality. |
| NVIDIA RTX 4060 Ti / RTX 3060 (12-16GB) | Local mode. Claude optional — quality upgrade, not speed. |
| Apple Silicon M1/M2 Pro | Local mode usable. Claude recommended for panic buttons. |
| Apple Silicon M1/M2 base (16GB) | Hybrid. Local for suggestions, Claude for panic buttons. |
| No discrete GPU | Claude mode for real-time. Local 3B as offline fallback. |
| Low-spec (8GB RAM, older CPU) | Claude mode required. Tiny/base whisper for transcription. |

### Key Optimizations

- **Shorter panic button prompts** (~800 tokens vs ~2,500): send only the target character's backstory and last 60 seconds of transcript. Cuts local latency ~40-50%.
- **Streaming to UI**: render suggestion card progressively as tokens arrive. Cuts perceived latency roughly in half.
- **Ollama keep_alive**: set `keep_alive: -1` or `keep_alive: "10m"` to prevent model unloading between cycles. Eliminates 5-10 second reload penalty.
- **Pre-warm model**: send a lightweight keep-alive ping every 30 seconds to prevent cold starts.
- **Cache common rules**: grappling, concentration, opportunity attacks — serve from cache without LLM call.

## Key Features

### 1. Pull-Based Suggestions + Smart Notifications
- DM clicks "Suggest" for on-demand help — LLM generates contextual suggestion
- Background analyzer (keyword matching, zero LLM cost) watches transcript
- Notification badge glows when something relevant is detected (NPC mentioned, backstory keyword, plot hook)
- DM clicks the notification when ready → full suggestion generated
- No unsolicited suggestions. No noise. DM is always in control.

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

### 5. After Action Report
Every interaction between the DM and the app is logged: suggestions generated, notification detections (including ones the DM never clicked), panic button usage, scene timeline, and music transitions. On session end, the app generates a multi-part report: narrative summary (LLM), chronological activity log (pure data), suggestion archive with full transcript context (browseable for campaign planning ideas), strategic review with threads to pick up and per-character backstory spotlight tracking (LLM), and campaign-level analysis across sessions showing plot thread aging, pacing trends, and scene balance. DMs can rate suggestions 1-5 stars to track which types are most valuable. The archive doubles as a campaign planning workbench — dismissed suggestions often contain seeds for future sessions.

### 6. MCP Server Companion (separate package, free, open-source)
FastMCP Python server that reads/writes the same SQLite database. Exposes campaign data as MCP resources and provides tools for Claude Desktop to add NPCs, plot hooks, session summaries. Includes pre-built prompts for session prep, post-session review, backstory integration, encounter building, and worldbuilding.

## Tech Stack Details

### Frontend (React + TypeScript + Tailwind)
- Single-page app, no routing
- Three-panel layout: transcript (left), suggestions (center/right), campaign context + panic buttons (top/bottom)
- Status bar: scene badge, LLM provider indicator, music controls, session timer
- Suggestion cards with type badges (📋 Recall, 📖 Rules, 🧵 Thread, ⚔️ Combat, ✨ Spell, 💡 Improv, ⏱️ Pacing), pin/dismiss, DM ONLY label
- Virtualized transcript list for 4+ hour session stability
- Streaming suggestion rendering (show card progressively as tokens arrive)

### Backend (Tauri / Rust)
- Spawns and manages whisper.cpp process via stdio pipe
- HTTP client for Ollama (localhost:11434) and Anthropic API
- SQLite via rusqlite for campaign persistence
- Suggestion cycle timer (configurable, default 45s)
- Scene classifier with 10-second stability dampening
- Audio playback + crossfade engine
- Audio device enumeration (separate input/output)
- Ollama keep_alive management to prevent model unloading

### Database Schema (SQLite)
Tables: campaigns, characters, npcs, plot_hooks, encounters, sessions, suggestions. Transcripts stored as JSONL files alongside sessions. Full schema in specs/04-architecture.md.

### whisper.cpp Integration
- Bundled `ggml-small.en.bin` model (~466MB), user can swap in settings
- Uses `--prompt` flag with pre-registered character/NPC names from campaign context to improve fantasy name accuracy
- `whisper-stream` mode: 500ms step, 5s context window
- Output piped to Transcript Manager which buffers, timestamps, and deduplicates
- Handles streaming revisions (replaces last line rather than appending corrections)

### Ollama Integration
- Default model: `llama3.1:8b-instruct-q4_K_M` (~5-6GB VRAM)
- Health check via `GET /api/tags`
- Chat completions via `POST /api/chat` with `stream: true` for progressive rendering
- First-run wizard detects Ollama, recommends model based on hardware
- `keep_alive: -1` to prevent model unloading between suggestion cycles

### Anthropic API Integration
- Provider: `AnthropicProvider` implementing `LLMProvider` interface
- Endpoint: `POST https://api.anthropic.com/v1/messages`
- Headers: `x-api-key`, `anthropic-version: 2023-06-01`
- Default model: `claude-sonnet-4-6` (recommended for real-time features)
- Optional: `claude-haiku-4-5` for simple entity recall, `claude-opus-4-6` for post-session summaries
- Streaming via SSE for progressive suggestion rendering
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
| 3 | Music + Claude + Polish | Scene classifier, built-in music player, Anthropic provider, streaming rendering, crossfade, export |
| 4 | Distribution | Installers (.dmg/.msi/.AppImage), first-run wizard with hardware detection, docs, community launch |
| 5 | MCP Server (optional) | FastMCP resources/tools/prompts, PyPI publish, Anthropic directory submission |

## Coding Conventions

- **Rust:** Standard Rust conventions. Use `thiserror` for error types. `tokio` for async runtime. `serde` for serialization.
- **TypeScript/React:** Functional components with hooks. Tailwind for styling. No CSS modules. Types over interfaces.
- **Python (MCP server):** FastMCP 3.x decorators. Type hints everywhere. async where I/O bound.
- **General:** No abbreviations in variable names. Comments explain *why*, not *what*. Error messages should be user-facing quality.

## Important Design Decisions

1. **Pull-based, not push-based.** The DM asks for help when they need it. The background analyzer detects relevant moments and lights up a notification, but the LLM only fires when the DM clicks. This keeps the app quiet and laptop-friendly (~55 LLM calls/session instead of ~325).

2. **Prompts are the product.** The prompt templates in the suggestion engine and panic buttons are the core IP. Invest time in tuning them. A good prompt to an 8B model beats a lazy prompt to GPT-4.

3. **Notifications are subtle, not interruptive.** A notification badge glows when the analyzer detects something relevant. No popups, no sounds, no toasts. Unclicked notifications expire after 5 minutes. The DM's attention stays on the game.

3. **DM ONLY labeling is non-negotiable.** Any suggestion containing information the players shouldn't see must be visually flagged. The DM's screen is visible at the table.

4. **Entity cooldown prevents spam.** Once an NPC/entity is surfaced, suppress re-surfacing for 5-10 minutes. Track in an in-memory registry with TTL.

5. **Scene classifier uses keywords for MVP.** Don't burn LLM tokens on classification. The keyword matcher is instant and good enough. LLM-based classification is a v1.1 upgrade.

6. **Audio input ≠ audio output.** The mic and speakers MUST be different devices or the app transcribes its own music. Warn in the UI if they match.

7. **The MCP server shares the SQLite database.** Both the app and the MCP server read/write the same file. This is the integration point. No API, no sync — just a shared DB.

8. **Stream LLM output to UI.** Both Ollama and the Anthropic API support streaming. Render suggestion cards progressively as tokens arrive. This cuts perceived latency roughly in half.

9. **Ollama keep_alive is mandatory.** Set `keep_alive: -1` or `keep_alive: "10m"` to prevent model unloading between suggestion cycles. Without this, every cycle incurs a 5-10 second model reload penalty.

10. **Panic button prompts are shorter.** Send only the target character's backstory and 60 seconds of transcript (~800 tokens vs ~2,500). This cuts local latency ~40-50%.

## Spec Documents Reference

| Document | Contents | When to Reference |
|----------|----------|------------------|
| `docs/01-market-research.md` | Competitive landscape, market size, competitor analysis | Understanding the market positioning |
| `docs/02-business-model.md` | Pricing, go-to-market, revenue projections, distribution | Business decisions |
| `specs/01-mvp-features-bdd.md` | 39 BDD scenarios for Session Setup, Transcription, Suggestions, Questions, Export | Implementing MVP features |
| `specs/02-suggestion-engine-bdd.md` | 52 BDD scenarios across 7 suggestion categories + quality behaviors | Building the suggestion engine |
| `specs/03-pain-points-and-features.md` | Reddit pain point research, backstory weaver spec, panic button spec with BDD | Building backstory integration and panic buttons |
| `specs/04-architecture.md` | Full technical architecture: components, code samples, provider abstraction, DB schema, latency analysis, build plan, performance budget, risk register | All implementation work |
| `specs/05-mcp-server.md` | MCP server spec: FastMCP resources, tools, prompts, database integration, distribution | Building the MCP companion |
| `specs/06-adaptive-music.md` | Music system: scene classifier, crossfade engine, audio tiers, panic button audio, BDD scenarios | Building the music system |
