# DM Assistant — Technical Architecture (Local-Only, Revised)

## Architecture Overview

Local-first, cloud-optional. Everything *can* run on the DM's machine with
zero internet dependency. Audio is always processed locally (whisper.cpp) —
it never leaves the machine. Campaign data lives in a local SQLite database.

The LLM layer is abstracted behind a provider interface with two modes:
- **Local (default):** Ollama running an 8B model. Free, private, no internet.
- **Cloud (opt-in):** User provides their own Anthropic API key for Claude.
  Dramatically better suggestion quality, especially for backstory weaving,
  creative improvisation, and nuanced panic button responses. Transcripts
  are sent to the API only when this mode is active — the user makes that
  choice knowingly.

The app works great locally. It works *amazingly* with Claude.

```
┌───────────────────────────────────────────────────────────────────────┐
│                    DM's Machine (Laptop/Desktop)                       │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                       Desktop App (Tauri)                         │  │
│  │                                                                   │  │
│  │  ┌──────────┐ ┌─────────────┐ ┌────────────┐ ┌───────────────┐   │  │
│  │  │ Mic Input│ │ Suggestion  │ │ Campaign   │ │ Music Controls│   │  │
│  │  │ Controls │ │ Panel       │ │ Data Editor│ │ & Scene Badge │   │  │
│  │  └────┬─────┘ └──────▲──────┘ └─────┬──────┘ └───────▲───────┘   │  │
│  │       │              │              │                │            │  │
│  │  ┌────▼──────────────┴──────────────▼────────────────▼─────────┐  │  │
│  │  │                 App Backend (Rust / Python)                  │  │  │
│  │  │                                                              │  │  │
│  │  │ ┌──────────────┐ ┌──────────────────┐ ┌──────────────────┐  │  │  │
│  │  │ │ Transcript   │ │ Suggestion Engine│ │ Adaptive Music   │  │  │  │
│  │  │ │ Manager      │ │ - Prompt builder │ │ System           │  │  │  │
│  │  │ │ - Buffering  │ │ - Cycle timer    │ │ - Scene class.   │  │  │  │
│  │  │ │ - Dedup      │ │ - Entity dedup   │ │ - Crossfade eng. │  │  │  │
│  │  │ │ - Timestamps │ │ - Panic buttons  │ │ - Audio output   │  │  │  │
│  │  │ └──────┬───────┘ └─────┬──────┬─────┘ └──┬──────────┬────┘  │  │  │
│  │  │        │               │      │           │          │       │  │  │
│  │  └────────┼───────────────┼──────┼───────────┼──────────┼───────┘  │  │
│  │           │               │      │           │          │          │  │
│  └───────────┼───────────────┼──────┼───────────┼──────────┼──────────┘  │
│              │               │      │           │          │             │
│ ┌────────────▼─────┐ ┌──────▼────┐ │  ┌────────▼──────┐   │             │
│ │  whisper.cpp      │ │ LLM       │ │  │ Audio Engine  │   │             │
│ │  (always local)   │ │ Provider  │ │  │               │   │             │
│ │  ggml-small.en    │ │ Interface │ │  │ Built-in loops│   │             │
│ │  Live mic → text  │ └──┬────┬──┘ │  │ Local folders │   │             │
│ │  < 3s latency     │    │    │    │  │ Syrinscape URI│   │             │
│ └──────────────────┘    │    │    │  └───────────────┘   │             │
│                          │    │    │                      │             │
│ ┌────────────────────┐   │    │    │   ┌──────────────────▼───────────┐ │
│ │ LOCAL: Ollama      │◄──┘    └──►│   │ 🔊 Speaker / Audio Output    │ │
│ │ localhost:11434    │            │   │    (separate from mic input)  │ │
│ │ llama3.1:8b Q4_K_M│            │   └──────────────────────────────┘ │
│ │ Free, offline      │            │                                    │
│ └────────────────────┘            │                                    │
│                        ┌──────────▼──────────────────────┐             │
│                        │ CLOUD: Anthropic API             │             │
│                        │ claude-sonnet-4-6                │             │
│                        │ User's own API key               │             │
│                        └─────────────────────────────────┘             │
│                                                                        │
│ ┌──────────────────────────────────────────────────────────────────┐   │
│ │                    Local Storage (SQLite)                         │   │
│ │  campaigns/         sessions/           config/     music/       │   │
│ │  ├─ context       ├─ transcript.jsonl  ├─ prefs   ├─ bundled/   │   │
│ │  ├─ characters    ├─ suggestions.jsonl ├─ hotkeys  └─ scene_map │   │
│ │  ├─ npcs          ├─ questions.jsonl   └─ models                │   │
│ │  ├─ plot_hooks    └─ export/                                     │   │
│ │  └─ encounters                                                   │   │
│ └──────────────────────────────────────────────────────────────────┘   │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Component Details

### 1. Desktop App Shell: Tauri

**Why Tauri over Electron:**
- Tauri bundles are 5-10MB vs Electron's 150MB+. For a tool that sits
  alongside Ollama and whisper.cpp (which already consume resources), a
  lightweight shell matters.
- Rust backend gives native performance for audio handling and IPC.
- Smaller memory footprint — critical when sharing the machine with an
  LLM consuming 6-8GB.
- Cross-platform: Windows, macOS, Linux from one codebase.

**Frontend:** React (TypeScript) with Tailwind CSS. Single-page app.
No routing. The UI has three panels:
1. Transcript feed (left)
2. Suggestion panel (center/right)
3. Campaign context + panic button toolbar (top/bottom)

**Backend:** Rust (Tauri commands) handles:
- Spawning and managing the whisper.cpp process
- HTTP calls to the local Ollama API
- SQLite reads/writes for campaign persistence
- Suggestion cycle timer and dispatch
- Audio device enumeration and selection

### 2. Speech-to-Text: whisper.cpp

**Deployment:** Bundled with the app installer, or detected if already
installed. The app ships with the `ggml-small.en.bin` model (~466MB)
as the default. Users can swap models via settings.

**Runtime mode:** `whisper-stream` (or equivalent library binding)
- Captures audio from the selected input device
- Processes in chunks (500ms step, 5s context window)
- Outputs text segments with timestamps via stdout/pipe
- The Tauri backend reads this pipe and feeds the transcript manager

**Model recommendations by hardware:**

| Hardware | Model | RAM | Real-time Factor | Accuracy |
|----------|-------|-----|-----------------|----------|
| Any modern CPU (last 5yr) | ggml-tiny.en | 75MB | 4-8x RT | Adequate |
| M1/M2 Mac, Ryzen 5+ | ggml-base.en | 142MB | 10-12x RT | Good |
| M1 Pro+, i7/Ryzen 7+ | ggml-small.en | 466MB | 5-8x RT | Very Good |
| 16GB+ RAM, modern CPU | ggml-medium.en | 1.5GB | 2-4x RT | Excellent |

**Fantasy name handling:**
The app pre-processes campaign context to extract all proper nouns (NPC
names, locations, items) and passes them as an initial prompt to whisper.cpp
using the `--prompt` flag. This biases the decoder toward recognizing
those specific tokens. Not perfect, but significantly improves accuracy
on names like "Thalzar" or "Bleakwood" that would otherwise be garbled.

```bash
# Example whisper-stream invocation
./whisper-stream \
  -m ./models/ggml-small.en.bin \
  -t 4 \                           # threads
  --step 500 \                     # process every 500ms
  --length 5000 \                  # 5s context window
  --prompt "Vex, Drogan, Sable, Mayor Hild, Oldroot, Reva, \
            Bleakwood, Charred Flagon, Tomb of Kael, Ashen Crown"
```

### 3. LLM Layer: Provider Abstraction

The suggestion engine never talks directly to Ollama or Claude. It talks
to an `LLMProvider` interface that handles routing, formatting, and error
handling for both backends. This is the key architectural decision — it
means the entire prompt engineering layer works identically regardless of
which model is generating the response.

```python
# llm_provider.py — the abstraction that makes dual-mode work

from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
import httpx

class ProviderType(Enum):
    LOCAL = "local"       # Ollama
    ANTHROPIC = "anthropic"  # Claude API

@dataclass
class LLMConfig:
    provider: ProviderType
    # Local (Ollama) settings
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.1:8b-instruct-q4_K_M"
    # Anthropic settings
    anthropic_api_key: str | None = None
    anthropic_model: str = "claude-sonnet-4-6"
    # Shared settings
    max_tokens: int = 300
    temperature: float = 0.7

class LLMProvider(ABC):
    @abstractmethod
    async def generate(self, system: str, prompt: str, max_tokens: int) -> str:
        """Send a prompt and return the generated text."""
        pass

    @abstractmethod
    async def health_check(self) -> bool:
        """Verify the provider is reachable and ready."""
        pass

    @abstractmethod
    def estimated_latency(self) -> str:
        """Return human-readable latency estimate for UI display."""
        pass


class OllamaProvider(LLMProvider):
    """Local inference via Ollama REST API (OpenAI-compatible)."""

    def __init__(self, config: LLMConfig):
        self.base_url = config.ollama_base_url
        self.model = config.ollama_model
        self.client = httpx.AsyncClient(timeout=60.0)

    async def generate(self, system: str, prompt: str, max_tokens: int = 300) -> str:
        response = await self.client.post(
            f"{self.base_url}/api/chat",
            json={
                "model": self.model,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt}
                ],
                "stream": False,
                "options": {
                    "num_predict": max_tokens,
                    "temperature": 0.7
                }
            }
        )
        response.raise_for_status()
        return response.json()["message"]["content"]

    async def health_check(self) -> bool:
        try:
            r = await self.client.get(f"{self.base_url}/api/tags")
            return r.status_code == 200
        except Exception:
            return False

    def estimated_latency(self) -> str:
        return "5-15 sec (depends on hardware)"


class AnthropicProvider(LLMProvider):
    """Cloud inference via Anthropic Messages API."""

    def __init__(self, config: LLMConfig):
        self.api_key = config.anthropic_api_key
        self.model = config.anthropic_model
        self.client = httpx.AsyncClient(
            base_url="https://api.anthropic.com",
            headers={
                "x-api-key": self.api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json"
            },
            timeout=30.0
        )

    async def generate(self, system: str, prompt: str, max_tokens: int = 300) -> str:
        response = await self.client.post(
            "/v1/messages",
            json={
                "model": self.model,
                "max_tokens": max_tokens,
                "system": system,
                "messages": [
                    {"role": "user", "content": prompt}
                ]
            }
        )
        response.raise_for_status()
        data = response.json()
        return data["content"][0]["text"]

    async def health_check(self) -> bool:
        try:
            # Lightweight call to verify the key works
            response = await self.client.post(
                "/v1/messages",
                json={
                    "model": self.model,
                    "max_tokens": 10,
                    "messages": [{"role": "user", "content": "ping"}]
                }
            )
            return response.status_code == 200
        except Exception:
            return False

    def estimated_latency(self) -> str:
        return "2-5 sec (network dependent)"


def create_provider(config: LLMConfig) -> LLMProvider:
    """Factory function — suggestion engine calls this, doesn't care which."""
    if config.provider == ProviderType.ANTHROPIC and config.anthropic_api_key:
        return AnthropicProvider(config)
    return OllamaProvider(config)
```

**Why this abstraction matters:**
- The prompt template is identical for both providers. You write it once.
- The suggestion engine, panic buttons, and ad-hoc questions all use the
  same `generate()` call. Zero branching logic in the feature code.
- Users can switch providers mid-session (e.g., start local, realize they
  want better backstory suggestions, flip to Claude in settings).
- Testing is easy: mock the provider interface, test suggestion parsing
  without hitting any model.
- Future providers (OpenAI, Mistral API, local vLLM) plug in by
  implementing the same interface.

#### 3a. Local Mode: Ollama

**Why Ollama:**
- One-command install on macOS, Linux, Windows.
- One-command model pull: `ollama pull llama3.1:8b-instruct-q4_K_M`
- Exposes a local REST API at `localhost:11434` that is OpenAI-compatible.
- Handles GPU detection, quantization, memory management automatically.
- Supports model switching without restart.
- Massive community — if the user has Ollama already, they can use their
  preferred model.

**Default model:** `llama3.1:8b-instruct-q4_K_M`
- 5-6GB VRAM (GPU) or ~8GB RAM (CPU-only, slower)
- 30-50 tok/sec on Apple Silicon, 8-12 tok/sec on RTX 3060
- 100-word suggestion ≈ 130 tokens ≈ 2-4 seconds (GPU) / 10-15 sec (CPU)
- Good enough for entity recall, rules lookup, improvisation prompts
- Instruction-tuned for following structured prompt templates

**Alternative local models the user can select in settings:**

| Model | Size | VRAM | Quality | Speed | Best For |
|-------|------|------|---------|-------|----------|
| llama3.2:3b-instruct | ~2GB | 3GB | Adequate | Very Fast | Low-spec machines |
| llama3.1:8b-instruct | ~5GB | 6GB | Good | Fast | Default / recommended |
| qwen2.5:14b-instruct | ~9GB | 10GB | Very Good | Medium | 16GB+ VRAM users |
| llama3.3:70b | ~40GB | 48GB | Excellent | Slow | Workstation / multi-GPU |

**Where local falls short:**
The 8B model handles structured tasks well (entity recall, stat lookups,
rules clarification) but struggles with the nuanced, creative tasks:
- Backstory weaving (connecting subtle thematic parallels)
- Creative NPC improvisation (personality depth, motivations)
- "Phones Out" panic button (crafting an emotionally resonant hook
  that draws from a character's specific history)
- Post-session narrative summaries (prose quality)

These are exactly the tasks where Claude excels. That's the upgrade path.

#### 3b. Cloud Mode: Claude (Anthropic API)

**Why Claude specifically:**
- Best-in-class at creative writing and narrative tasks — exactly what
  the backstory weaver, improvisation support, and panic buttons need.
- Excels at following complex system prompts with multiple context sections
  (campaign notes + backstories + transcript + instructions).
- Reliable structured output when asked to format as TYPE/TITLE/BODY.
- The Anthropic API is straightforward: one endpoint, one auth header,
  clean JSON responses.
- Claude's personality is well-suited to TTRPG — it generates flavorful,
  setting-appropriate content without over-explaining.

**Recommended model: `claude-sonnet-4-6`**
- Best balance of quality, speed, and cost for real-time suggestions.
- Fast enough for the 45-60 second suggestion cycle (typically responds
  in 2-4 seconds).
- Significantly cheaper than Opus for a use case that sends 200-400
  requests per session.

**Available Claude models the user can select:**

| Model | Speed | Quality | Cost/Session | Best For |
|-------|-------|---------|-------------|----------|
| claude-haiku-4-5 | Very Fast | Good | ~$0.50-1.00 | Budget-conscious, high frequency |
| claude-sonnet-4-6 | Fast | Excellent | ~$2.00-3.50 | Default / recommended |
| claude-opus-4-6 | Slower | Best | ~$8.00-15.00 | Post-session summaries, deep analysis |

**Hybrid strategy — use different models for different tasks:**

| Task | Recommended Model | Rationale |
|------|------------------|-----------|
| Proactive suggestions (every 45-60s) | Sonnet | High volume, needs speed + quality balance |
| Panic button responses | Sonnet | Needs creativity and speed simultaneously |
| Ad-hoc questions | Sonnet | Latency-sensitive, user is waiting |
| Post-session summary | Opus | One-time call, quality matters most, latency doesn't |
| Simple entity recall | Haiku | Low complexity, high speed, save costs |

The app could implement intelligent routing: use Haiku for routine entity
lookups, Sonnet for creative suggestions and panic buttons, and Opus for
the end-of-session summary. This optimizes the cost/quality tradeoff
automatically. But for MVP, a single model selection is fine.

**Cost estimation per session (Claude Sonnet):**

| Component | Tokens | Cost |
|-----------|--------|------|
| System prompt (campaign + backstories) | ~1,500 input | — |
| Transcript window (per cycle) | ~500 input | — |
| Suggestion output (per cycle) | ~150 output | — |
| Cycles per 4-hour session (~45s interval) | ~300 calls | — |
| **Total input tokens** | ~600,000 | ~$1.80 |
| **Total output tokens** | ~45,000 | ~$0.45 |
| Panic buttons (~5 per session) | ~15,000 in / 3,000 out | ~$0.10 |
| Ad-hoc questions (~10 per session) | ~25,000 in / 5,000 out | ~$0.15 |
| Post-session summary (1 call) | ~10,000 in / 2,000 out | ~$0.10 |
| **Total estimated session cost** | | **~$2.50-3.50** |

For a DM running weekly sessions, that's roughly $10-14/month — comparable
to what they'd pay for Archivist, but with dramatically better real-time
features and only when they choose to use it.

**Privacy considerations for Claude mode:**

When the user enables Claude mode, the app should clearly communicate:
- "Transcript text will be sent to Anthropic's API for processing"
- "Anthropic's API does not train on API inputs (zero data retention)"
- "Audio is never sent — only the text transcript"
- "Campaign context and backstories are included in each request"
- "You can switch back to local mode at any time"

This should be displayed once when the user first enables Claude mode,
with a checkbox acknowledgment. Not buried in a ToS — front and center.

#### 3c. Settings UI for LLM Provider

```
┌─────────────────────────────────────────────────────────────┐
│  AI Engine Settings                                          │
│                                                              │
│  ┌─── Provider ──────────────────────────────────────────┐   │
│  │                                                        │   │
│  │  ● Local (Ollama)                                      │   │
│  │    Everything runs on your machine. Free. Private.     │   │
│  │    Model: [ llama3.1:8b-instruct        ▼ ] [Detect]  │   │
│  │    Status: ● Connected (GPU: RTX 3060, 12GB)           │   │
│  │    Est. suggestion time: ~5-8 seconds                   │   │
│  │                                                        │   │
│  │  ○ Claude (Anthropic API)                              │   │
│  │    Superior suggestion quality. Requires internet.      │   │
│  │    Your API key is stored locally and never shared.     │   │
│  │    API Key: [ sk-ant-•••••••••••••••••••••    ] [Test] │   │
│  │    Model: [ claude-sonnet-4-6              ▼ ]         │   │
│  │    Status: ○ Not configured                             │   │
│  │    Est. cost per session: ~$2.50-3.50                   │   │
│  │    ⓘ Transcript text is sent to Anthropic for          │   │
│  │      processing. Audio never leaves your machine.       │   │
│  │      Anthropic does not train on API data.              │   │
│  │                                                        │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─── Advanced ──────────────────────────────────────────┐   │
│  │  Suggestion cycle interval: [ 45 ] seconds             │   │
│  │  Max suggestion length: [ 100 ] words                  │   │
│  │  Temperature: [ 0.7 ] (higher = more creative)         │   │
│  │  □ Use Haiku for simple entity recalls (saves cost)    │   │
│  │  □ Use Opus for post-session summary (better quality)  │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                              │
│  [ Save ]  [ Cancel ]                                        │
└─────────────────────────────────────────────────────────────┘
```

**Key UX decisions:**
- The API key is stored in the local SQLite config table, encrypted at
  rest using the OS keychain (macOS Keychain, Windows Credential Manager,
  Linux Secret Service). Never stored in plaintext.
- The [Test] button fires a single lightweight API call and reports
  success/failure with the specific error (invalid key, rate limited,
  network error).
- Estimated cost per session is shown in the UI so the user knows what
  they're signing up for. No billing surprises.
- The provider can be switched mid-session. If the user starts local
  and decides they want better suggestions, they can enter their key
  and flip to Claude without restarting.
- A small badge in the suggestion panel header shows which provider is
  active: "🖥️ Local" or "☁️ Claude" so the DM always knows.

### 4. Suggestion Engine

**Core loop (runs every 45-60 seconds when transcription is active):**

```python
# Pseudocode for suggestion cycle
class SuggestionEngine:
    def __init__(self, config: LLMConfig):
        self.provider = create_provider(config)  # Local or Claude
        self.cooldown_tracker = CooldownTracker()
        self.prompt_builder = PromptBuilder()

    async def switch_provider(self, new_config: LLMConfig):
        """Hot-swap providers mid-session."""
        new_provider = create_provider(new_config)
        if await new_provider.health_check():
            self.provider = new_provider
            return True
        return False  # Keep current provider if new one fails

    async def suggestion_cycle(self):
        # 1. Get recent transcript (last 3-5 minutes)
        recent_transcript = transcript_manager.get_window(minutes=3)

        # 2. Check if transcript has meaningful new content
        if not has_new_game_content(recent_transcript):
            return None  # Don't generate noise

        # 3. Build prompt (identical for local and Claude)
        system, prompt = self.prompt_builder.build(
            campaign_context=campaign.get_context(),
            character_backstories=campaign.get_backstories(),
            recent_transcript=recent_transcript,
            active_suggestions=suggestion_panel.get_active(),
            entity_cooldowns=self.cooldown_tracker.get_active(),
            session_elapsed=timer.elapsed(),
            mode="proactive"
        )

        # 4. Call whichever provider is active
        #    The provider interface is identical — engine doesn't care
        response = await self.provider.generate(
            system=system,
            prompt=prompt,
            max_tokens=200
        )

        # 5. Parse response into structured suggestion
        suggestion = parse_suggestion(response)

        # 6. Apply dedup / cooldown
        if suggestion and not self.cooldown_tracker.is_suppressed(suggestion.entity):
            self.cooldown_tracker.register(suggestion.entity, ttl=300)
            return suggestion

        return None

    async def panic_button(self, button_id: str):
        """Panic buttons bypass the cycle and respond immediately."""
        system, prompt = self.prompt_builder.build_panic(
            button_id=button_id,
            campaign_context=campaign.get_context(),
            character_backstories=campaign.get_backstories(),
            recent_transcript=transcript_manager.get_window(minutes=5),
            full_session_transcript=transcript_manager.get_full(),
        )
        response = await self.provider.generate(
            system=system,
            prompt=prompt,
            max_tokens=300  # Panic buttons get more room
        )
        return parse_suggestion(response)
```

**The prompt is the same regardless of provider.** This is critical.
You write and tune prompts once. The quality difference between local
and Claude comes from the model's ability to follow the prompt, not
from different prompts. This means prompt improvements benefit both modes.

**Prompt template (core of the product — this is the craft):**

```
You are a TTRPG assistant helping a Dungeon Master during a live session.

CAMPAIGN CONTEXT:
{campaign_context}

CHARACTER BACKSTORIES:
{character_backstories}

RECENT TABLE CONVERSATION (last 3 minutes):
{recent_transcript}

SUGGESTIONS ALREADY SHOWN (do not repeat):
{active_suggestions_summary}

Based on the recent conversation, generate ONE brief suggestion for the DM.
Choose the most relevant type:

- RECALL: Surface notes about an NPC, location, or item that was mentioned
- RULES: Clarify a rule that seems relevant to what's happening
- THREAD: Remind the DM of an unresolved plot hook or promise
- COMBAT: Surface monster stats or tactical notes if combat is active
- SPELL: Surface spell/ability details if one was just used
- IMPROV: Offer quick improvisation material if players went off-script
- BACKSTORY: Connect the current scene to a character's personal story

If nothing useful comes to mind, respond with exactly: NONE

Format your response as:
TYPE: [type]
TITLE: [short title]
BODY: [2-3 sentences max, scannable in 3 seconds]
DM_ONLY: [true/false — true if this contains info players shouldn't see]
```

**Panic button dispatch:**
Each panic button sends a specialized prompt that overrides the standard
suggestion cycle. The prompt includes the same context but with a specific
instruction:

```python
PANIC_PROMPTS = {
    "phones_out": """
        A player seems disengaged. Identify the character who has spoken
        LEAST in the recent transcript. Generate a narrative hook that:
        1. Calls them out by character name
        2. Connects to their backstory if possible
        3. Requires them to respond with a decision or action
        4. Can be spoken aloud by the DM immediately
    """,
    "quiet_player": """
        Identify which character has had the least dialogue in this session.
        Suggest a moment that puts them in the spotlight using their
        class abilities, backstory, or a perception/insight check.
    """,
    "deliberation_loop": """
        The party has been deliberating without taking action. Generate
        an interruption event appropriate to the current location that
        creates urgency and forces a decision. Make it dramatic.
    """,
    "too_easy": """
        Combat is too easy. Suggest ONE escalation: reinforcements,
        environmental hazard, enemy tactic shift, or a complication.
        Include specific mechanics (AC, HP, damage) if adding enemies.
    """,
    "too_hard": """
        Combat is going badly for the party. Suggest ONE de-escalation
        that feels narratively earned: enemy morale break, environmental
        advantage, NPC intervention, or enemy mistake.
    """,
    "dead_air": """
        The table has gone silent after a dramatic moment. Instead of
        'What do you do?', suggest a specific prompt targeting one
        character that gives them something concrete to react to.
    """,
    "off_script": """
        The party went somewhere unplanned. Generate a quick location
        with: name, one NPC (name + personality), one interesting detail,
        and one possible hook connecting back to the main quest.
    """,
    "energy_low": """
        Session energy is low. Suggest a high-energy narrative beat:
        a sudden event, twist, revelation, or callback to an exciting
        unresolved thread. Must be deliverable in 1-2 sentences.
    """,
    "need_npc": """
        The DM needs an NPC right now. Generate: name, race, gender,
        2-word personality, one quirk, and one thing they know that's
        relevant to the current scene. Setting-appropriate.
    """,
    "recap": """
        Summarize the session so far in under 150 words. Include:
        key events, decisions made, NPCs encountered, and current
        situation. Write it so the DM can read it aloud to the table.
    """
}
```

### 5. Adaptive Music System

The app classifies the scene type from the transcript and automatically
crossfades between appropriate music. The DM never has to touch a
soundboard — the music just follows the story.

**Scene Classifier:** Runs every 15-30 seconds on the transcript window.
Outputs one of: COMBAT, COMBAT_BOSS, EXPLORATION, SOCIAL, DRAMATIC,
TENSION, DOWNTIME, AMBIENT. MVP uses keyword matching (zero LLM cost);
v1.1 upgrades to LLM-based classification for nuance.

**Audio sources (three tiers, user selects in settings):**

| Tier | Source | Setup | Quality |
|------|--------|-------|---------|
| Built-in (default) | 10-15 bundled royalty-free loops (~60MB) | Zero | Good enough |
| Local Folders | DM's own MP3s organized by scene type | 5 min | Personalized |
| Syrinscape | Fires URI triggers to Syrinscape app | 10 min config | Professional |

**Crossfade engine:**
- Scene change triggers a 3-5 second crossfade (configurable).
- Same scene = track loops seamlessly, no retriggering.
- Rapid scene flapping dampened: requires 10+ seconds of stable state.
- Track selection randomized within scene folder, no immediate repeats.

**Panic button audio hooks:**
- 📱 Phones Out → dramatic sting + music duck to 30%
- 🎭 Dead Air → fade to near-silence over 5 seconds
- ⚡ Energy Low → crossfade to boss/tension track, volume +20%
- 🤫 Quiet Player → duck volume to 40% for 10 seconds (spotlight moment)
- ⏳ Deliberation Loop → gradually shift to tension music

**Audio device management:**
Input (mic) and output (speakers) MUST be different devices to prevent
the app from transcribing its own music. Settings UI shows a warning if
the same device is selected for both. Volume ducking when suggestion
cards appear is optional and configurable.

**Session UI status bar:**

```
⚔️ COMBAT │ 🖥️ Local │ 🎵 "Clash of Steel" │ ◀ ⏸ ▶ 🔊━━━━░░ 75% │ 02:34:15
[Auto ▼]                                                    [Mute]
```

Full spec with BDD scenarios: `dm-assistant-adaptive-music-spec.md`

---

### 6. Local Storage: SQLite + JSON Files

**Why SQLite:**
- Zero configuration, single-file database, embedded.
- Handles campaign persistence across sessions.
- Fast enough for all operations in this app.
- Portable — the DM can back up their entire campaign by copying one file.

**Data schema:**

```sql
-- Campaigns
CREATE TABLE campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    system TEXT DEFAULT 'D&D 5e',
    context TEXT,  -- raw campaign context blob
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Characters (PC backstories)
CREATE TABLE characters (
    id TEXT PRIMARY KEY,
    campaign_id TEXT REFERENCES campaigns(id),
    name TEXT NOT NULL,
    player_name TEXT,
    class TEXT,
    backstory TEXT,
    bonds TEXT,
    flaws TEXT,
    goals TEXT,
    notes TEXT
);

-- NPCs
CREATE TABLE npcs (
    id TEXT PRIMARY KEY,
    campaign_id TEXT REFERENCES campaigns(id),
    name TEXT NOT NULL,
    description TEXT,
    secrets TEXT,         -- DM-only info
    first_appeared INTEGER,  -- session number
    is_improvised BOOLEAN DEFAULT FALSE
);

-- Sessions
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    campaign_id TEXT REFERENCES campaigns(id),
    session_number INTEGER,
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    transcript_path TEXT,  -- path to .jsonl file
    summary TEXT
);

-- Entity mention cooldowns (in-memory, not persisted)
-- Suggestion history (persisted per session for export)
CREATE TABLE suggestions (
    id TEXT PRIMARY KEY,
    session_id TEXT REFERENCES sessions(id),
    type TEXT,
    title TEXT,
    body TEXT,
    dm_only BOOLEAN,
    timestamp REAL,  -- seconds since session start
    was_dismissed BOOLEAN DEFAULT FALSE,
    was_pinned BOOLEAN DEFAULT FALSE
);
```

**Transcript storage:** JSONL files (one line per utterance), stored
alongside the session. Keeps SQLite lean while allowing easy export.

```json
{"ts": 142.5, "text": "I want to search the chest for traps", "confidence": 0.87}
{"ts": 145.1, "text": "Roll a perception check", "confidence": 0.92}
{"ts": 148.3, "text": "I got a 17", "confidence": 0.95}
```

### 7. Export

**Markdown export:** One-click generates a `.md` file containing:
- Session metadata (date, duration, campaign name)
- Campaign context snapshot
- Full transcript with timestamps
- All suggestions generated (with types and timestamps)
- All ad-hoc Q&A pairs
- Auto-generated session summary (calls LLM once on export)

**JSON export:** Same data in structured JSON for programmatic use.

**Future:** Foundry VTT module export, Obsidian vault integration.

---

## Installation & First Run

**What the user does:**

```
1. Install Ollama           → ollama.com (one-click installer)
2. Pull a model             → ollama pull llama3.1:8b-instruct-q4_K_M
3. Install DM Assistant     → Download .dmg / .msi / .AppImage
4. Launch app               → Ollama detected ✓, Whisper model downloading...
5. Create campaign          → Paste notes, add character backstories
6. Start session            → Select mic, click "Start Session"
```

**First-run wizard:**
1. Detect Ollama → If not found, show install link
2. Detect/recommend model → Based on available RAM/VRAM
3. Download whisper.cpp model → Progress bar, ~466MB for small.en
4. Select audio input device → Show list, test with "speak now"
5. Create first campaign → Guided template with sections

**System requirements:**

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| OS | Windows 10, macOS 12+, Ubuntu 22.04 | Latest |
| RAM | 16GB | 32GB |
| GPU | None (CPU-only works) | 8GB+ VRAM (RTX 3060+, M1+) |
| Storage | 8GB free | 15GB free |
| CPU | Any x86_64 or ARM64 (last 5 years) | 8+ cores |

---

## Performance Budget

**Two profiles depending on LLM mode:**

### Local Mode (16GB RAM machine, no discrete GPU)

| Component | RAM Usage |
|-----------|-----------|
| Tauri app + React UI | ~150MB |
| whisper.cpp (small.en) | ~500MB |
| Ollama + llama3.1:8b Q4_K_M (CPU) | ~8GB |
| Audio engine + bundled loops | ~80MB |
| SQLite + session data | ~50MB |
| OS + overhead | ~4GB |
| **Total** | **~13GB** |

Tight but feasible. Users with less than 16GB can drop to the `tiny` or
`base` whisper model and the `llama3.2:3b` LLM, sacrificing quality for fit.

### Claude Mode (8GB RAM machine — much lighter)

| Component | RAM Usage |
|-----------|-----------|
| Tauri app + React UI | ~150MB |
| whisper.cpp (small.en) | ~500MB |
| HTTP client (no Ollama needed) | ~20MB |
| Audio engine + bundled loops | ~80MB |
| SQLite + session data | ~50MB |
| OS + overhead | ~4GB |
| **Total** | **~5GB** |

Claude mode dramatically reduces local resource usage. The LLM runs in
Anthropic's cloud, so the user's machine only needs to handle audio
transcription and the UI. This makes the app viable on:
- Older laptops with 8GB RAM
- MacBook Air (base model)
- Tablets with keyboard (if whisper.cpp compiles for the platform)
- Any machine where Ollama won't fit

**This is a genuine product advantage, not just a fallback.** A DM with
a lightweight ultrabook at the table might *prefer* Claude mode even if
they have a gaming rig at home, because they want the laptop at the table
and the desktop is running Foundry VTT.

**Latency targets:**

| Operation | Local (GPU) | Local (CPU) | Claude | 
|-----------|------------|-------------|--------|
| Transcript display | < 3s | < 3s | < 3s (always local) |
| Proactive suggestion | 5-8s | 15-25s | 2-5s |
| Panic button response | 3-5s | 10-15s | 2-4s |
| Ad-hoc question | 5-10s | 15-25s | 2-5s |
| Session export + summary | 30-60s | 60-120s | 10-20s |

Claude mode is consistently faster than local CPU and comparable to local
GPU, because Anthropic's inference infrastructure is purpose-built for
throughput. This means the "premium" experience isn't just better quality
suggestions — it's also snappier response times.

---

## Build Plan (Revised for Local-Only + Music)

### Week 1: Foundation
- **Day 1-2:** Set up Tauri project with React frontend. Get a window
  rendering with a basic three-panel layout plus status bar.
- **Day 3-4:** Integrate whisper.cpp. Spawn the process from Tauri,
  pipe audio from mic, display transcript in the UI. This is the
  highest-risk item — validate it works on your machine first.
- **Day 5:** Wire up Ollama API calls from Tauri. Send a test prompt,
  display the response. Confirm model detection and error handling.

### Week 2: Core Features
- **Day 1-2:** Build the suggestion engine: prompt template, cycle
  timer, response parsing, suggestion card UI with type badges.
- **Day 3:** Campaign context editor. Paste-in text area that gets
  included in every prompt. Save to SQLite.
- **Day 4:** Panic button toolbar. Wire up all 10 buttons with their
  specialized prompts. Test each one.
- **Day 5:** Character backstory editor. Structured form per character
  that feeds into the prompt template.

### Week 3: Music + Claude + Polish
- **Day 1:** Scene classifier (keyword-based). Wire transcript manager
  to classify scenes every 15 seconds. Display scene badge in status bar.
- **Day 2:** Built-in music player. Bundle royalty-free loops, implement
  crossfade engine, wire to scene classifier. Audio device selection UI.
- **Day 3:** Claude API provider. Implement `AnthropicProvider`, settings
  UI with API key entry and model selection, provider switching.
  Panic button audio hooks (sting, duck, fade effects).
- **Day 4:** Entity cooldown/dedup logic. Pin/dismiss on suggestion
  cards. Transcript scrolling and virtualization. Volume ducking.
- **Day 5:** Session export (Markdown + JSON). Post-session summary
  generation. First real session test at your own table.

### Week 4: Distribution
- **Day 1-2:** Installer packaging for macOS (.dmg), Windows (.msi),
  Linux (.AppImage). First-run wizard including Ollama detection,
  whisper model download, and audio device setup.
- **Day 3:** README, documentation, screenshots, demo video.
  Local folder music mapping settings page.
- **Day 4-5:** Post to r/DMAcademy, r/DnDBehindTheScreen, EN World,
  Foundry VTT Discord. Collect feedback.

### Week 5 (Optional): MCP Server
- **Day 1:** MCP server core: resources (campaign, characters, NPCs,
  sessions, transcripts).
- **Day 2:** MCP tools (add/update NPCs, plot hooks, backstories).
- **Day 3:** MCP prompts (session prep, post-session review, backstory
  integration, encounter builder). PyPI publish + Anthropic directory
  submission.

---

## Cost Structure (Revised)

### Development Costs
| Item | Cost |
|------|------|
| Your time (4 weeks side project) | $0 (sweat equity) |
| Domain + landing page | ~$20/year |
| Code signing certificate (macOS/Windows) | ~$100-200/year |
| **Total year 1** | **~$220** |

### Per-User Costs
| Item | Cost |
|------|------|
| Cloud API calls | $0 (runs locally) |
| Hosting | $0 (no server) |
| Bandwidth | $0 (direct download or GitHub releases) |
| Support | Your time |
| **Total per user** | **$0** |

### Revenue at $35/license
| Sales | Revenue | Net (after signing cert) |
|-------|---------|------------------------|
| 10 | $350 | $150 |
| 50 | $1,750 | $1,550 |
| 100 | $3,500 | $3,300 |
| 500 | $17,500 | $17,300 |
| 1,000 | $35,000 | $34,800 |

Every sale after the first 7 is pure profit. No ongoing costs that
scale with users. No infrastructure to maintain. No bills that grow
with success.

---

## Competitive Positioning

```
                    Cloud-Only ──────────────────────── Local-First
                         │                                │
  Post-Session     Archivist ($10-60/mo)                  │
  Only             SessionKeeper                          │
                   GM Assistant                           │
                   Loreify                                │
                   DM's ARK ($6/mo)                       │
                         │                                │
                         │                                │
  Real-Time +      [Nobody]              ──→    DM Assistant ($35 once)
  Post-Session                                  Local: free forever
                         │                      Claude: BYOK for premium
                         │                                │
                         │                                │
  VTT /            Roll20 ($6-15/mo)         Foundry VTT ($50 once)
  Campaign Mgmt    D&D Beyond ($6/mo)        LegendKeeper
                   World Anvil ($5-13/mo)
```

You occupy a unique position: the only product that offers both local-first
privacy AND cloud-grade quality as an opt-in. Cloud competitors can't offer
local mode without rebuilding their architecture. Local-only tools can't
match your Claude integration. You're the only one that gives the user the
choice.

---

## Risk Register (Revised)

| Risk | Severity | Mitigation |
|------|----------|-----------|
| 8B local model suggestion quality insufficient | High | Claude mode exists as the upgrade path. Invest in prompt engineering — a well-crafted prompt to an 8B model still beats a lazy prompt to GPT-4. Test both modes and document the quality difference honestly. |
| whisper.cpp fantasy name accuracy | Medium | Pre-register names via --prompt flag. Post-process corrections. Let users add custom vocabulary. This affects both modes equally since STT is always local. |
| 16GB RAM too tight for all components | Medium | Document minimum specs clearly. Offer a "lite mode" with tiny whisper + 3B LLM. Claude mode actually *helps* here — users with limited RAM can offload LLM to the cloud while keeping whisper local. |
| Ollama installation friction for non-technical users | Medium | First-run wizard with detection + guided install. Video walkthrough. Claude mode serves as a fallback: if the user can't get Ollama working, they can still use the app with an API key and no local model. |
| Anthropic API key security | Medium | Store key in OS keychain (macOS Keychain, Windows Credential Manager), never in plaintext. Show key as masked dots. Never log the key. Transmit only via HTTPS. |
| Anthropic API rate limits or outages mid-session | Medium | Graceful fallback: if a Claude call fails, show "Cloud unavailable — retrying" and auto-retry once. If the second attempt fails, suggest the DM switch to local mode. Never crash or lose state. |
| User accidentally runs up a large API bill | Low | Show estimated cost per session in the settings UI. Display a running cost estimate in the status bar during the session. Optionally set a per-session cost cap in settings. |
| Competitor copies the concept with cloud LLM quality | High | Ship fast, iterate on prompts, build community. Local + cloud dual-mode means you match cloud competitors on quality while also offering what they can't: true offline, zero-cost, private operation. |
| App resource usage drains laptop battery during long sessions | Medium | Claude mode is actually lighter on the local machine (no Ollama GPU/CPU load). Offer guidance: "Use Claude mode on battery, local mode when plugged in." |
| Tauri + whisper.cpp integration complexity | Medium | Spike this first. If the IPC between Tauri and whisper-stream is unreliable, fall back to an HTTP wrapper around whisper.cpp. |
| Prompt behaves differently on local vs Claude | Medium | Test every prompt template on both the default Ollama model and Claude Sonnet. Maintain a regression test suite of sample transcripts and expected suggestion types. Accept that Claude will produce higher quality — that's the feature, not a bug. |

---

## Quality Comparison: Local vs Claude

Honest assessment based on what 8B models and Claude each handle well:

| Suggestion Type | Local (8B) | Claude Sonnet | Notes |
|----------------|-----------|--------------|-------|
| Entity recall (NPC mentioned by name) | ★★★★ | ★★★★★ | Both handle well — mostly pattern matching on context |
| Rules clarification | ★★★★ | ★★★★★ | 8B models know D&D 5e rules reasonably well |
| Monster stat surfacing | ★★★★ | ★★★★★ | Structured recall from context — works fine locally |
| Spell/ability details | ★★★☆ | ★★★★★ | Local sometimes hallucinates spell details not in context |
| Plot thread reminders | ★★★☆ | ★★★★★ | Local can match keywords; Claude understands narrative threads |
| Indirect NPC reference ("the lady who gave us the job") | ★★☆☆ | ★★★★★ | This is where the quality gap is most visible |
| Backstory weaving (connect scene to character history) | ★★☆☆ | ★★★★★ | Claude's creative reasoning shines here |
| "Phones Out" backstory hook generation | ★★☆☆ | ★★★★★ | Needs nuance, emotional resonance, creativity |
| Creative NPC improvisation | ★★★☆ | ★★★★★ | Local produces generic NPCs; Claude gives personality depth |
| Post-session narrative summary | ★★☆☆ | ★★★★★ | Prose quality is the most obvious gap |
| Knowing when to say NONE (no suggestion) | ★★★☆ | ★★★★★ | Local models tend to over-suggest; Claude has better judgment |

**The honest pitch to users:**
"Local mode handles the fundamentals — rules, stats, names, and basic
suggestions — for free, forever, with complete privacy. Claude mode
unlocks the creative features — backstory weaving, improvisation,
and the panic buttons at their best. Try local first. If you find
yourself wishing the suggestions were sharper, add your API key and
experience the difference."

This isn't upselling. It's being transparent about what each mode does
well, and letting the DM decide what's worth paying for.

---

## Future Roadmap (Post-MVP)

| Phase | Features |
|-------|----------|
| v1.1 | Campaign persistence across sessions. Entity extraction from transcripts. Session history search. Local music folder mapping. Syrinscape URI integration. LLM-based scene classifier upgrade. |
| v1.2 | Foundry VTT module integration. Discord audio capture mode. MCP server companion (free, open-source). Community music pack submissions. |
| v1.3 | Multi-system rules support (Pathfinder 2e, OSR, system-agnostic). Pluggable rule modules. Commissioned original soundtrack. |
| v1.4 | Community prompt library — users share and rate suggestion prompt templates. Community scene-to-music mapping presets. |
| v2.0 | Player companion app (read-only, shows recaps and their character's wiki). Music sync to player devices. |
| v2.x | Fine-tuned local model trained on curated DM patterns dataset. Adaptive music intensity (dynamic within scenes, not just between them). |
