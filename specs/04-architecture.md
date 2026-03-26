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
- ~128 tok/sec on RTX 4090, ~40 tok/sec on RTX 3060, ~28 tok/sec on M1 Mac
- 100-word suggestion ≈ 130 tokens ≈ 1-2 sec (4090) / 4-5 sec (3060) / 6-7 sec (M1)
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

### 4. Suggestion Engine (Pull-Based + Smart Notifications)

**Design philosophy:** The DM is running a game, not monitoring a feed.
Suggestions should never interrupt. The DM pulls help when they need it.
The only exception is when the engine detects something genuinely
important — and even then, it just lights up a notification badge.

**Two interaction modes:**

1. **Pull (primary):** DM clicks "Suggest" button or a panic button → LLM
   generates a contextual suggestion → card appears. User-initiated, every time.
2. **Notify (secondary):** Background analyzer detects a high-relevance
   trigger using cheap keyword/pattern matching (zero LLM cost) → notification
   badge glows → DM clicks when ready → THEN the LLM fires.

**Why this is better:**
- No noise. The DM never has to filter through irrelevant suggestions.
- Dramatically better for laptop hardware. LLM calls happen maybe 15-30
  times per session instead of 300+. GPU sits idle 95% of the time.
- Battery life goes from "bring your charger" to "probably fine."
- Fan noise drops from constant to occasional.
- Latency is always user-expected — the DM clicked something, they know
  a response is coming.

#### 4a. Background Analyzer (Always Running, Zero LLM Cost)

The analyzer runs keyword/pattern matching on every transcript window
(every 10-15 seconds). It maintains a **relevance queue** — a list of
potential suggestions detected but not yet shown. No LLM calls, just
string matching against campaign context.

```python
class BackgroundAnalyzer:
    """Lightweight pattern matcher — runs on transcript, no LLM calls.
    Detects when something in the conversation matches campaign data
    and queues a notification if the relevance score is high enough."""

    def __init__(self, campaign: CampaignData):
        self.campaign = campaign
        self.relevance_queue: list[PendingNotification] = []
        self.notified_entities: dict[str, float] = {}  # entity → timestamp (cooldown)

    def analyze(self, transcript_window: str) -> PendingNotification | None:
        text = transcript_window.lower()
        best_match: PendingNotification | None = None
        best_score = 0.0

        # Check NPC names (exact and fuzzy)
        for npc in self.campaign.npcs:
            if npc.name.lower() in text and not self._on_cooldown(npc.name):
                score = 0.8  # High — direct name match
                if npc.secrets:
                    score = 0.95  # Very high — NPC has DM-only secrets
                if score > best_score:
                    best_score = score
                    best_match = PendingNotification(
                        type="RECALL",
                        trigger=f"NPC mentioned: {npc.name}",
                        context_hint=npc.name,
                        score=score
                    )

        # Check plot hook keywords
        for hook in self.campaign.plot_hooks:
            if hook.status == "unresolved":
                keywords = extract_keywords(hook.description)
                matches = sum(1 for kw in keywords if kw in text)
                if matches >= 2 and not self._on_cooldown(hook.id):
                    score = 0.7 + (matches * 0.05)
                    if score > best_score:
                        best_score = score
                        best_match = PendingNotification(
                            type="THREAD",
                            trigger=f"Plot hook referenced: {hook.description[:50]}",
                            context_hint=hook.id,
                            score=score
                        )

        # Check backstory keywords
        for char in self.campaign.characters:
            backstory_keywords = extract_keywords(char.backstory + char.bonds + char.goals)
            matches = sum(1 for kw in backstory_keywords if kw in text)
            if matches >= 2 and not self._on_cooldown(f"backstory_{char.name}"):
                score = 0.85  # High — backstory moments are valuable
                if score > best_score:
                    best_score = score
                    best_match = PendingNotification(
                        type="BACKSTORY",
                        trigger=f"Backstory moment for {char.name}",
                        context_hint=char.id,
                        score=score
                    )

        # Check combat/rules triggers
        combat_matches = sum(1 for kw in COMBAT_KEYWORDS if kw in text)
        if combat_matches >= 3 and self.campaign.has_planned_encounters():
            if not self._on_cooldown("combat_stats"):
                best_match = PendingNotification(
                    type="COMBAT",
                    trigger="Combat detected — encounter stats available",
                    context_hint="planned_encounter",
                    score=0.75
                )

        rules_triggers = RULES_TRIGGER_PATTERNS.findall(text)
        if rules_triggers and not self._on_cooldown("rules"):
            best_match = PendingNotification(
                type="RULES",
                trigger=f"Rules question: {rules_triggers[0]}",
                context_hint=rules_triggers[0],
                score=0.7
            )

        return best_match if best_match and best_match.score >= NOTIFY_THRESHOLD else None

    def _on_cooldown(self, entity: str) -> bool:
        if entity in self.notified_entities:
            return (time.time() - self.notified_entities[entity]) < 300  # 5 min
        return False
```

**Notification threshold:** Configurable (default 0.75). Higher = fewer
notifications, only the most relevant. Lower = more frequent but noisier.
The DM can tune this in settings.

#### 4b. Notification Badge UI

When the analyzer queues a notification, the UI shows a subtle indicator:

```
┌──────────────────────────────────────────────────────────────┐
│  Suggestion Panel                                             │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  [ 🔮 Suggest ]  [ notifications: 🧵● ]                │  │
│  │                                                          │  │
│  │  (empty — click Suggest or a panic button for help)      │  │
│  │                                                          │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  The ● dot glows amber when the analyzer detects something.   │
│  Click it to generate the full suggestion via LLM.            │
│  The 🧵 icon indicates the type (Thread, 📋 Recall, etc.)    │
│  If unclicked for 5 minutes, the notification fades.          │
└──────────────────────────────────────────────────────────────┘
```

**Badge behavior:**
- Appears with the notification type icon and a gentle pulse/glow.
- Shows a one-line hint: "Mayor Hild mentioned" or "Backstory moment: Drogan."
- Clicking it fires the LLM with the relevant context to generate the full
  suggestion. The DM waits 2-5 seconds (pull latency, expected).
- Multiple notifications can queue. Badge shows count: "●2"
- Oldest notification expires after 5 minutes if unclicked.
- Notification is silent — no sound, no popup, no toast. Just a visual change.

#### 4c. Pull Interactions

**"Suggest" button (general pull):**
The DM clicks "Suggest" at any time. The engine looks at the recent
transcript + campaign context and generates whatever's most relevant.

```python
async def suggest(self) -> Suggestion:
    """DM clicked the Suggest button — generate the best suggestion
    for the current moment."""
    system, prompt = self.prompt_builder.build(
        campaign_context=campaign.get_context(),
        character_backstories=campaign.get_backstories(),
        recent_transcript=transcript_manager.get_window(minutes=3),
        active_suggestions=suggestion_panel.get_active(),
        entity_cooldowns=self.cooldown_tracker.get_active(),
        session_elapsed=timer.elapsed(),
    )
    response = await self.provider.generate(
        system=system, prompt=prompt, max_tokens=200
    )
    return parse_suggestion(response)
```

**Notification click (targeted pull):**
The DM clicks a notification badge. The engine already knows what
triggered it (NPC name, plot hook, backstory keyword), so it sends a
more focused prompt with just the relevant context.

```python
async def expand_notification(self, notification: PendingNotification) -> Suggestion:
    """DM clicked a notification — generate a focused suggestion
    using the specific trigger context."""
    system, prompt = self.prompt_builder.build_targeted(
        notification_type=notification.type,
        context_hint=notification.context_hint,
        campaign_context=campaign.get_context(),
        character_backstories=campaign.get_backstories(),
        recent_transcript=transcript_manager.get_window(minutes=2),
    )
    response = await self.provider.generate(
        system=system, prompt=prompt, max_tokens=200
    )
    self.cooldown_tracker.register(notification.context_hint, ttl=300)
    return parse_suggestion(response)
```

**Panic buttons (unchanged — already pull-based):**
Same as before. One click, specialized prompt, immediate response.

```python
async def panic_button(self, button_id: str) -> Suggestion:
    """Panic buttons use stripped-down prompts for faster response."""
    system, prompt = self.prompt_builder.build_panic(
        button_id=button_id,
        campaign_context=campaign.get_context(),
        character_backstories=campaign.get_backstories(),
        recent_transcript=transcript_manager.get_window(seconds=60),
        full_session_transcript=transcript_manager.get_full(),
    )
    response = await self.provider.generate(
        system=system, prompt=prompt, max_tokens=300
    )
    return parse_suggestion(response)
```

**Ad-hoc questions (unchanged):**
DM types a question, submits, gets an answer.

#### 4d. Resource Usage Comparison: Push vs Pull

| Metric | Old Push Model (45s cycle) | New Pull Model |
|--------|--------------------------|----------------|
| LLM calls per 4-hr session | ~300 proactive + 15 panic + 10 questions = **~325** | ~20 suggest + 15 panic + 10 questions + 10 notifications = **~55** |
| GPU active time per session | ~25 min (325 × ~5s each) | ~4 min (55 × ~5s each) |
| GPU idle % | ~90% | **~98%** |
| API cost (Claude Sonnet) | ~$2.50-3.50 | **~$0.40-0.60** |
| Battery impact | Significant — constant GPU cycling | Minimal — GPU only when DM asks |
| Fan noise | Frequent spikes every 45 seconds | Rare, only on user action |
| Laptop thermal | Sustained warm | Cool most of the time |

This makes the app genuinely laptop-friendly. A MacBook Air or a thin
gaming laptop can run this without thermal throttling or battery anxiety.

**The prompt is the same regardless of provider.** This is still true.
Pull vs push changes when the prompt fires, not what it contains.
Prompt improvements benefit both local and Claude modes.

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

-- Suggestion history (persisted per session for after action report)
CREATE TABLE suggestions (
    id TEXT PRIMARY KEY,
    session_id TEXT REFERENCES sessions(id),
    type TEXT,               -- RECALL, RULES, THREAD, COMBAT, SPELL, IMPROV, BACKSTORY, PACING
    source TEXT,             -- 'pull' (Suggest button), 'panic' (panic button), 'notification' (badge click), 'question' (ad-hoc)
    trigger TEXT,            -- what caused this: panic button id, notification hint, or 'manual'
    title TEXT,
    body TEXT,
    dm_only BOOLEAN,
    timestamp REAL,          -- seconds since session start
    transcript_context TEXT,  -- the transcript window that was active when this was generated
    scene_state TEXT,        -- COMBAT, EXPLORATION, SOCIAL, etc. at time of generation
    outcome TEXT DEFAULT 'generated',  -- generated, used, dismissed, pinned, expired
    outcome_timestamp REAL,  -- when the DM acted on it (used/dismissed/pinned)
    was_pinned BOOLEAN DEFAULT FALSE,
    dm_rating INTEGER        -- optional 1-5 star rating, NULL if unrated
);

-- Notification history (tracks ALL detections, including ones the DM never clicked)
CREATE TABLE notifications (
    id TEXT PRIMARY KEY,
    session_id TEXT REFERENCES sessions(id),
    type TEXT,               -- RECALL, THREAD, BACKSTORY, COMBAT, RULES, PACING
    trigger TEXT,            -- what the analyzer detected: "NPC: Fendrel", "Backstory: Gruuk + Pelor"
    score REAL,              -- relevance score from the analyzer (0.0-1.0)
    timestamp REAL,          -- seconds since session start
    outcome TEXT DEFAULT 'shown',  -- shown (badge appeared), clicked (DM expanded), expired (5 min timeout), suppressed (cooldown)
    suggestion_id TEXT,      -- links to the suggestion generated if clicked, NULL if expired
    transcript_snippet TEXT  -- the ~30s of transcript that triggered detection
);
```

**Transcript storage:** JSONL files (one line per utterance), stored
alongside the session. Keeps SQLite lean while allowing easy export.

```json
{"ts": 142.5, "text": "I want to search the chest for traps", "confidence": 0.87}
{"ts": 145.1, "text": "Roll a perception check", "confidence": 0.92}
{"ts": 148.3, "text": "I got a 17", "confidence": 0.95}
```

### 7. After Action Report + Export

When the session ends, the app generates a DM After Action Report — a
structured debrief that helps the DM improve their craft and captures
everything the app observed during the session.

**What gets logged during the session (automatically, no DM action):**

| Data | Source | Cost |
|------|--------|------|
| Every suggestion generated | Suggestion cards | Already in memory |
| DM's action on each suggestion | Used / dismissed / pinned / expired | UI events |
| Every notification the analyzer detected | Background analyzer | Zero (keyword matching) |
| Which notifications the DM clicked vs ignored | Badge interactions | UI events |
| Which notifications expired unclicked | 5-minute timeout | Timer |
| Scene state timeline | Scene classifier | Zero (keywords) |
| Music transitions | Crossfade events | Audio engine |
| Panic button usage (which, when, what was generated) | Panic dispatch | Already logged |
| Ad-hoc questions and answers | Q&A pairs | Already in memory |
| Session pacing data (elapsed time, scene durations) | Timers | Zero |

**The After Action Report has three sections:**

#### Section 1: Session Summary (LLM-generated)

Generated from the full transcript on session end. One LLM call.
Includes: narrative recap, key events, decisions made, NPCs encountered,
character moments, and unresolved threads. This is the "previously on..."
the DM reads aloud next session.

#### Section 2: App Activity Log (Automatic, no LLM)

A chronological record of every interaction between the DM and the app:

```markdown
## App Activity Log — Session 12

### Notifications Detected: 14
  📋 00:12:31 — NPC detected: "Fendrel" (score: 0.82) → CLICKED → Suggestion used
  🧵 00:18:45 — Plot hook: "coded letter" (score: 0.71) → EXPIRED (unclicked)
  🎭 00:34:12 — Backstory: Gruuk + Pelor (score: 0.88) → CLICKED → Suggestion used
  📖 00:41:55 — Rules: "grapple while prone" (score: 0.73) → CLICKED → Suggestion dismissed
  ⚔️ 00:48:30 — Combat: planned encounter detected (score: 0.78) → CLICKED → Suggestion pinned
  🎭 01:02:18 — Backstory: Elowen + Thessaly (score: 0.91) → EXPIRED (unclicked)  ← AVAILABLE NEXT SESSION
  📋 01:15:44 — NPC detected: "Toblen" (score: 0.77) → CLICKED → Suggestion used
  ⏱️ 01:23:00 — Pacing: combat running 35 min (score: 0.65) → CLICKED → Suggestion used
  ...

### Suggestions Generated: 8
  Pulled (Suggest button): 3
  Panic buttons: 2 (📱 Phones Out, 🗺️ Off Script)
  Notification clicks: 3

### Suggestion Outcomes:
  Used: 5  (62%)
  Dismissed: 1  (12%)
  Pinned: 1  (12%)
  Expired: 1  (12%)

### Unread Notifications — Available for Next Session:
  🧵 00:18:45 — Plot hook: "coded letter"
     Context: Players discussed the letter they found but moved on.
     The app detected a match to the unresolved "coded letter" hook.
     This could be revisited next session.

  🎭 01:02:18 — Backstory: Elowen + Thessaly
     Context: The party passed through the noble's gallery.
     Elowen's mentor Thessaly was last seen at a noble court.
     This connection was never surfaced to the DM.
     ★ CONSIDER: Revisit this opportunity next session.

### Panic Button Usage:
  📱 01:45:22 — Phones Out → Targeted Elowen (least active 12 min)
     Generated hook referencing Thessaly's lute in the portrait.
     Outcome: USED. Player re-engaged immediately.

  🗺️ 02:10:08 — Off Script → Party went to tavern instead of castle
     Generated improvised scene with Toblen Stonehill.
     Outcome: USED. Scene ran 20 min and reconnected to main quest.

### Scene Timeline:
  00:00 - 00:15  SOCIAL (tavern)           🎵 "The Warm Hearth"
  00:15 - 00:45  EXPLORATION (ruins)       🎵 "Forgotten Paths"
  00:45 - 01:22  COMBAT (cultists)         🎵 "Clash of Steel"
  01:22 - 01:25  COMBAT → TENSION          🎵 crossfade
  01:25 - 01:45  SOCIAL (interrogation)    🎵 "Something Stirs"
  01:45 - 02:10  DRAMATIC (Elowen moment)  🎵 "Revelation"
  02:10 - 02:40  SOCIAL (tavern improv)    🎵 "The Warm Hearth"
  02:40 - 02:50  DOWNTIME (long rest)      🎵 "Rest by the Fire"
```

#### Section 3: Opportunities & Recommendations (LLM-generated)

A second LLM call that analyzes the activity log and transcript together
to generate planning insights for the DM:

```markdown
## Session 12 — Strategic Review

### Moments That Landed
- The Phones Out intervention at 01:45 re-engaged Lily effectively.
  The backstory connection (Thessaly's lute) was well-received.
- The Off Script improvisation at 02:10 felt natural and reconnected
  to the main quest without railroading.
- Combat pacing notification at 01:23 was acted on immediately —
  the surrender transition kept energy up.

### Threads to Pick Up
- **Elowen + Thessaly (01:02):** The backstory connection between the
  noble's gallery and Thessaly's disappearance at a noble court was
  detected but the notification expired. This is a strong hook —
  consider revisiting it next session. The portrait could still be
  mentioned in passing, or another character could bring it up.
- **Coded letter (00:18):** The players mentioned the letter but the
  notification expired while you were managing a scene transition.
  The letter is an unresolved thread for 7 sessions now. Consider
  having an NPC ask about it to remind the players.

### Backstory Spotlight Tracker
  Gruuk:   ★★★★★  (Pelor chapel moment — player initiated RP for first time)
  Elowen:  ★★★☆☆  (Phones Out hook worked, but the Thessaly connection is still open)
  Aldric:  ★★☆☆☆  (No backstory moments this session — opportunity next time)
  Mira:    ★☆☆☆☆  (Mira's backstory hasn't been touched in 4 sessions)
  Kael:    ★★★☆☆  (Minor moment during combat — could be deepened)

### Player Engagement Estimate
  Based on transcript frequency analysis (not a perfect measure):
  Kat:     [========--] Very active (drove negotiation scene)
  James:   [=======---] Active (strong in combat)
  Sam:     [===-------] Quiet → [========] after Pelor moment
  Lily:    [==--------] Disengaged → [======] after Phones Out
  David:   [====------] Moderate (consistent but not driving scenes)

### For Next Session
  1. Revisit the Elowen/Thessaly connection — the gallery scene
  2. Surface the coded letter — 7 sessions unresolved
  3. Find a moment for Mira's backstory (her sister, the spy)
  4. Sam responded strongly to the Pelor connection — build on it
```

**UI note:** Player engagement and backstory scores should use styled
progress bars or percentage fills in the app UI, not Unicode block
characters (which render inconsistently across platforms and fonts).

#### Section 4: Suggestion Archive (Pure Data, Browseable)

Every suggestion generated during the session is preserved with its
full context — the transcript window that was active when it fired,
the scene state, the trigger source, and the DM's action. This is NOT
just for accountability. It's a **campaign planning resource.**

Many suggestions the DM dismissed or ignored during play contain ideas
worth revisiting later. A BACKSTORY suggestion dismissed at minute 45
because combat was about to start might be the perfect opening scene
for next session. An IMPROV NPC generated by a panic button might
deserve a permanent place in the campaign.

```markdown
## Suggestion Archive — Session 12

### Suggestion #3 (01:02:18) — EXPIRED, NEVER SEEN
  Source: Notification (backstory match)
  Type: BACKSTORY
  Trigger: "Pelor" in transcript matched Elowen backstory keywords
  Scene: EXPLORATION (noble's gallery)

  Transcript at time of detection:
  > DM: "The gallery stretches along the east wing. Portraits of the
  >  Ashford family line the walls. At the far end, a large painting
  >  shows a woman in ceremonial robes holding a lute."
  > Kat: "I look at the painting. Anything unusual?"
  > DM: "It's well-painted. The woman looks serene. The lute has
  >  a silver rose on the neck."

  Generated suggestion (expanded when reviewing, not during session):

    🎭 BACKSTORY: Elowen + Thessaly
    Elowen's mentor Thessaly was last seen performing at a noble court.
    The woman in the portrait could be Thessaly, or could own Thessaly's
    lute. Elowen would recognize the silver rose inlay — it was
    Thessaly's signature mark.

    Possible hooks:
    - Elowen recognizes the lute and asks about the woman
    - The Ashford family knows what happened to Thessaly
    - Thessaly's disappearance connects to the noble family's secrets

  ★ DM NOTES (added post-session): "Using this next session. The portrait
    IS Thessaly. Lady Ashford was her patron. She knows where Thessaly
    went but won't say unless the party does something for her first."

### Suggestion #5 (02:10:08) — USED
  Source: Panic button (Off Script)
  Type: IMPROV
  Trigger: DM pressed 🗺️ Off Script
  Scene: SOCIAL (tavern, unplanned)

  Transcript at time of trigger:
  > Player: "I want to go back to the tavern and interrogate the bartender."

  Generated:
    💡 IMPROV: The Suspicious Bartender
    Toblen Stonehill has been getting late-night visits from a hooded
    figure. If pressed, he reveals he's paying protection money to
    someone connected to the Black Spider.

  ★ DM NOTES (added post-session): "Toblen is now a recurring NPC.
    Adding him to the campaign DB with a connection to the Black Spider
    subplot. Players loved this scene — Sam especially engaged."
```

The archive is browseable in the app after the session. The DM can:
- Read every suggestion with full transcript context
- Add notes to any suggestion ("use this next time" / "expand this NPC")
- Promote an improvised NPC to the campaign database with one click
- Promote a dismissed backstory hook to a plot thread
- Mark suggestions as "seed for next session" which feeds the MCP
  server's session_prep prompt

#### Section 5: Campaign-Level Analysis (Cross-Session, LLM-Generated)

The single-session AAR is valuable. But the real power comes from
analyzing patterns across an entire campaign. This runs on-demand (not
every session) — the DM clicks "Campaign Review" when they want a
big-picture view.

**Data available across sessions (all in SQLite, no LLM cost to collect):**

| Metric | What It Shows |
|--------|-------------|
| Backstory integration per character per session | Who's being neglected over time |
| Plot hook age (sessions since created, still unresolved) | Threads that are going stale |
| Suggestion type distribution | What the DM asks for most (combat help? improv? backstory?) |
| Panic button frequency over time | Is the DM gaining confidence or relying on the app more? |
| Average combat duration trend | Are combats getting longer or shorter? |
| Player engagement curves | Who's consistently quiet? Who's trending down? |
| Scene type balance | Is the campaign combat-heavy? RP-heavy? Exploration-light? |
| Notification click rate over time | Is the DM trusting the app's detections more or less? |

**Campaign review prompt (LLM call, on-demand):**

```markdown
## Campaign Review — Curse of the Hollow King (Sessions 1-12)

### Campaign Arc Health
  Main quest progress: ~60% (party has 3 of 5 plot tokens)
  Sessions since last major plot advancement: 2
  Estimated sessions remaining at current pace: 8-10

### Character Backstory Integration Over Time

  Gruuk:   S1[--] S2[--] S3[--] S4[★-] S5[--] S6[--] S7[--] S8[--] S9[--] S10[--] S11[--] S12[★★]
  Elowen:  S1[★-] S2[--] S3[--] S4[--] S5[★-] S6[--] S7[--] S8[--] S9[--] S10[--] S11[--] S12[★-]
  Aldric:  S1[--] S2[★-] S3[★-] S4[--] S5[--] S6[--] S7[--] S8[★-] S9[--] S10[--] S11[--] S12[★-]
  Mira:    S1[--] S2[--] S3[★★] S4[★-] S5[--] S6[--] S7[--] S8[--] S9[--] S10[--] S11[--] S12[--]
  Kael:    S1[★-] S2[--] S3[--] S4[--] S5[--] S6[★-] S7[--] S8[--] S9[★-] S10[--] S11[--] S12[★-]

  ⚠️ Mira hasn't had a backstory moment in 8 sessions.
  Her sister (the spy) hasn't been referenced since Session 4.
  OPPORTUNITY: Introducing Mira's sister in the next 1-2 sessions
  would reconnect the player with their character's story.

### Plot Thread Status

  | Thread | Created | Age | Status | Ready to Surface? |
  |--------|---------|-----|--------|------------------|
  | Retrieve the Ashen Crown | S1 | 12 sessions | Active, progressing | On track |
  | Coded letter (spider seal) | S5 | 7 sessions | Waiting — no progress | ★ Yes |
  | Sable's promise to Oldroot | S4 | 8 sessions | Unresolved | When relevant |
  | Fendrel's Shadow Guild connection | S6 | 6 sessions | Discovered S12 | Active |
  | Captain Thane investigating party | S6 | 6 sessions | No progress | When relevant |
  | Thessaly's disappearance (Elowen) | S1 | 12 sessions | Dormant | ★ Yes |
  | Gruuk's monastery attack | S1 | 12 sessions | Seed planted S12 | Active |
  | Mira's sister | S3 | 9 sessions | Dormant | ★★ Soon |

  3 threads have been waiting a while. Players may have forgotten them.
  Consider having an NPC reference the coded letter or Thessaly to
  remind the table these threads exist.

### Session Pacing Trends

  Average session length: 2hr 45min
  Average combat duration: 28 min (trending UP from 22 min in sessions 1-6)
  Average RP/social duration: 45 min (stable)
  Average exploration: 35 min (trending DOWN)

  Combat is getting longer as the party levels up and has more abilities
  to manage. Consider using fewer, harder enemies instead of many weak
  ones to keep combat under 25 minutes.

### Scene Balance Across Campaign

  Combat:      [=========-] 32%
  Social/RP:   [========--] 30%
  Exploration: [======----] 22%
  Dramatic:    [===-------] 10%
  Downtime:    [==--------]  6%

  The campaign is well-balanced between combat and social but light on
  dramatic moments. The backstory connections (Gruuk/Pelor, Elowen/Thessaly)
  are your best source of drama — lean into them.

### Suggested Campaign Beats (Next 3-5 Sessions)

  1. **Session 13:** Resolve the Elowen/Thessaly thread. The portrait in
     the gallery is the hook. Lady Ashford can become a patron or obstacle.

  2. **Session 13-14:** Introduce Mira's sister. She could appear as a
     spy working for the Shadow Guild (connects to Fendrel thread) or
     as someone who's been tracking the Black Spider independently.

  3. **Session 14-15:** Force the coded letter to surface. An NPC who
     recognizes the spider seal approaches the party, or an enemy
     demands they hand it over — revealing its importance.

  4. **Session 15-16:** Gruuk's monastery connection deepens. The cult
     that attacked the village chapel is the same one that attacked
     his monastery. The Hollow King is connected.

  5. **Session 16-18:** Campaign climax arc begins. Multiple threads
     converge: the Ashen Crown, the Hollow King, the Shadow Guild,
     and the personal backstories all intersect at Cragmaw Castle
     or whatever the final destination is.
```

**The campaign review is the feature that makes experienced DMs say
"this is worth $35."** A new DM gets help at the table. A veteran DM
gets a strategic planning tool that tracks every thread, every character
arc, and every untapped opportunity across months of play.

**When the report generates:**
- Section 1 (Summary): One LLM call on session end, ~10-15 seconds.
- Section 2 (Activity Log): Pure data, no LLM call, generated instantly
  from the SQLite tables.
- Section 3 (Insights): One LLM call that takes the activity log + transcript
  as input, ~15-20 seconds. Optional — the DM can skip this or run it
  later via the MCP server.

**DM rating flow:**
After the session (or during the next week), the DM can open the activity
log and rate each suggestion 1-5 stars. This data accumulates over time
and serves two purposes:
1. The DM can see which suggestion types are most valuable to them
   (maybe they never use RULES suggestions but love BACKSTORY ones)
2. Future prompt tuning — if a pattern of low-rated suggestions emerges
   for a specific type, the prompts for that type need work

**Export formats:**
- **Markdown:** Full report as a single `.md` file, readable anywhere.
- **JSON:** Structured data for programmatic use or import into other tools.
- **MCP integration:** The MCP server's `post_session_review` prompt can
  read the activity log and generate additional analysis in Claude Desktop.

---

## Table Hardware Setup

### Microphone: Center-Table Omnidirectional

A single wireless mic on the DM won't work. Players across the table
would be distant and muffled — the app needs to hear everyone to detect
NPC mentions, backstory references, and who's been quiet.

**Recommended: USB omnidirectional conference mic, center of table.**

| Mic | Price | Pickup Range | Notes |
|-----|-------|-------------|-------|
| TONOR G11 (USB conference) | ~$25 | 360°, 10ft radius | Best value. Designed for 4-6 people around a table. Plug and play. |
| Ansten Conference Mic (USB) | ~$30 | 360°, 10ft radius | Similar to TONOR, slightly better noise reduction. |
| Blue Snowball (omni mode) | ~$50 | 360°, ~6ft radius | TTRPG actual-play community standard. Trusted and well-documented. |
| Laptop built-in mic | $0 | Forward-facing, 2-3ft | Usable for 2-3 players sitting close. Not reliable for a full table. |

**Setup:** Mic sits center-table, USB cable runs to the DM's laptop.
That's it. No audio interface, no mixer, no per-player mics.

**Known challenges at a real table:**
- **Overlapping speech:** When two people talk at once or everyone laughs,
  whisper.cpp accuracy drops. The app handles this by producing fewer
  notifications during noisy periods — the background analyzer simply
  finds fewer confident matches in garbled transcript.
- **Distance variation:** The DM 18 inches from the mic is much louder
  than a player 5 feet away. Whisper.cpp's VAD (Voice Activity Detection)
  helps, and audio normalization in the pipeline is a v1.1 improvement.
- **Background noise:** Game stores with other tables nearby are hard.
  A home game with a closed door is fine. Dice on a hard surface are
  surprisingly loud — a dice tray or rolling mat helps.
- **Music feedback:** If the app plays music through the laptop speakers,
  the mic picks it up and whisper.cpp transcribes the lyrics. Use a
  separate Bluetooth speaker for music output, or headphones if playing
  ambient audio just for yourself.

### Audio Device Configuration

```
Input:  USB Conference Mic (captures table conversation)
Output: Bluetooth Speaker (plays music to the table)
        — OR —
        Laptop speakers with music disabled
        — OR —
        Headphones (DM-only audio monitoring)
```

The app MUST use different devices for input and output. The first-run
wizard includes a mic test step: "Speak normally. Now have someone
across the table speak. Can you see both in the transcript preview?"

### Physical Setup at the Table

```
        ┌─────────────────────────┐
        │      Player 3            │
        │                          │
Player 2│     🎤 USB Mic          │ Player 4
        │     (center table)       │
        │                          │
        │      Player 1            │
        └─────────────┬───────────┘
                      │ USB cable
              ┌───────▼────────┐
              │  DM's Laptop   │    🔊 Bluetooth Speaker
              │  (running app) │    (music output, separate
              │  Screen facing │     from mic to avoid feedback)
              │  DM only       │
              └────────────────┘
```

The DM's laptop screen shows the app. The suggestion panel, panic
buttons, and notification badges face the DM. Players don't see it —
it's like the DM's notes, just smarter.

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

## Latency Analysis

### The Full Pipeline

When someone speaks at the table, the response chain is:

```
Speech → Mic capture → whisper.cpp chunks (500ms step) → Transcript appears
                                                               ↓
                                              Suggestion cycle triggers (45-60s timer)
                                                               ↓
                                              Prompt assembled (~2,000-2,500 input tokens)
                                                               ↓
                                              LLM generates response (~100-150 output tokens)
                                                               ↓
                                              Response parsed → Suggestion card appears
```

Each stage has different latency characteristics. Music transitions are
the exception — the keyword-based scene classifier runs in microseconds
and crossfade is a local audio operation, so scene detection to music
change is under 100ms. Latency is a non-issue for the music system.

### Stage 1: Transcription (Always Local)

whisper.cpp in stream mode with 500ms step and 5s context window. Text
appears roughly 2-4 seconds after someone finishes speaking.

| Hardware | Whisper Model | Latency | Notes |
|----------|-------------|---------|-------|
| Apple Silicon (M1/M2+) | small.en | ~2 sec | Excellent, near-real-time |
| Apple Silicon (M1/M2+) | base.en | ~1.5 sec | Faster but lower accuracy |
| Modern CPU (i7/Ryzen 7+) | small.en | ~3-4 sec | Good, feels like live captioning |
| Modern CPU (i7/Ryzen 7+) | base.en | ~2-3 sec | Adequate for MVP |
| Older CPU (i5/Ryzen 5) | tiny.en | ~2-3 sec | Usable but noticeably less accurate |

**Streaming revision behavior:** whisper.cpp sometimes revises recent
output as more audio context arrives. "I want to search the chest" may
update to "I want to search the chest for traps" a second later. The
Transcript Manager should handle this by replacing the last line rather
than appending a correction, to avoid visual jitter in the UI.

### Stage 2: Suggestion Cycle (Timer-Based, Background)

Proactive suggestions fire on a 45-60 second timer. The DM doesn't know
when the cycle triggers, so perceived latency is the time from cycle
trigger to card appearing — NOT from when something was said.

**Prompt size per cycle:**
- System prompt + campaign context + backstories: ~1,500 tokens
- Transcript window (last 3 min): ~500-800 tokens
- Active suggestions + dedup list: ~200 tokens
- **Total input: ~2,000-2,500 tokens**
- **Expected output: ~100-150 tokens** (one suggestion card)

**LLM generation time by hardware (Llama 3.1 8B Q4_K_M, ~130 token output):**

| Hardware | Gen Speed | Prompt Eval | Generation | Total | Feel |
|----------|----------|------------|-----------|-------|------|
| RTX 4090 (24GB) | ~128 tok/s | ~0.5 sec | ~1 sec | **~1.5-2 sec** | Near-instant, best local experience |
| RTX 3090 (24GB) | ~112 tok/s | ~0.5 sec | ~1.2 sec | **~2 sec** | Excellent, indistinguishable from 4090 for this use |
| RTX 4070 (12GB) | ~68 tok/s | ~0.5 sec | ~2 sec | **~2.5-3 sec** | Snappy, feels responsive |
| M3 Max (Ollama) | ~50-60 tok/s | ~1 sec | ~2.5 sec | **~3-4 sec** | Good, very usable |
| RTX 4060 Ti (16GB) | ~40-50 tok/s | ~0.5 sec | ~3 sec | **~3.5-4.5 sec** | Good |
| RTX 3060 (12GB) | ~38-45 tok/s | ~0.5 sec | ~3.5 sec | **~4-5 sec** | Fine, arrives between conversation beats |
| M1/M2 Pro (Ollama) | ~30-40 tok/s | ~1 sec | ~4 sec | **~5-6 sec** | Acceptable |
| M1/M2 base (Ollama) | ~28 tok/s | ~1 sec | ~4.5 sec | **~6-7 sec** | Noticeable delay, still usable |
| Modern CPU, no GPU | ~5-10 tok/s | ~3 sec | ~15-25 sec | **~18-28 sec** | Slow, recommend 3B model or Claude |

**Note on Apple Silicon vs NVIDIA:** Apple Silicon gets a lot of attention
in the local LLM community because its unified memory lets you run 70B+
models that won't fit on any single consumer GPU. But for models that fit
in VRAM (like the 8B model this app uses), NVIDIA GPUs with dedicated VRAM
are significantly faster. An RTX 4090 generates tokens roughly 4-5x faster
than a base M1 Mac. The Apple Silicon advantage is memory capacity, not
speed — which matters less for this app since the 8B model fits comfortably
on any modern GPU.

### Stage 3: Panic Buttons (User-Initiated, Latency-Critical)

Panic buttons are the critical latency test. The DM clicks a button
because they need help *right now*. If "Phones Out" takes 15 seconds,
the DM is sitting in awkward silence waiting for their AI to think.
The moment passes. The feature fails.

| Hardware | Model | Latency | Usable for Panic? |
|----------|-------|---------|------------------|
| RTX 4090 / 3090 | 8B Q4_K_M | 1.5-2 sec | ✅ Instant — faster than flipping a page |
| RTX 4070 | 8B Q4_K_M | 2.5-3 sec | ✅ Yes — very responsive |
| M3 Max (Ollama) | 8B Q4_K_M | 3-4 sec | ✅ Yes — comfortable |
| RTX 4060 Ti / 3060 | 8B Q4_K_M | 3.5-5 sec | ✅ Yes — like checking notes |
| M1/M2 Pro (Ollama) | 8B Q4_K_M | 5-6 sec | ⚠️ Marginal — fill time with narration |
| M1/M2 base (Ollama) | 8B Q4_K_M | 6-7 sec | ⚠️ Marginal |
| Modern CPU, no GPU | 8B Q4_K_M | 18-28 sec | ❌ Too slow — moment passes |
| Any hardware | Claude Sonnet | 2-4 sec | ✅ Yes — feels instant |

**Panic button prompt optimization:** The proactive cycle sends the full
context (~2,500 tokens input). For panic buttons, use a stripped-down
prompt with only the relevant character's backstory and the last 60
seconds of transcript (~800-1,000 tokens). This cuts prompt eval time
roughly in half, which is meaningful on local hardware.

```python
# Panic button uses shorter context for faster response
def build_panic_prompt(self, button_id, campaign_context,
                       character_backstories, recent_transcript,
                       full_session_transcript):
    # For player-targeting buttons, only include that character's backstory
    if button_id in ("phones_out", "quiet_player", "dead_air"):
        target = self.identify_least_active_character(recent_transcript)
        backstory = self.get_single_backstory(target, character_backstories)
    else:
        backstory = character_backstories  # Full backstories for non-targeted

    # Shorter transcript window for speed
    short_transcript = recent_transcript[-60_seconds:]

    return system_prompt, PANIC_PROMPTS[button_id].format(
        context=campaign_context,
        backstory=backstory,
        transcript=short_transcript
    )
```

### Stage 4: Ad-Hoc Questions (User-Initiated, Moderate Priority)

The DM types a question and submits it. They're waiting for an answer
but it's not as time-critical as a panic button — they chose to type
rather than react in the moment.

| Hardware | Model | Latency | Feel |
|----------|-------|---------|------|
| RTX 4090 / 3090 | 8B Q4_K_M | 2-3 sec | Conversational, feels instant |
| RTX 4070 / M3 Max | 8B Q4_K_M | 3-4 sec | Very responsive |
| RTX 4060 Ti / 3060 | 8B Q4_K_M | 4-6 sec | Good, like asking a knowledgeable friend |
| M1/M2 Pro | 8B Q4_K_M | 6-7 sec | Acceptable |
| M1/M2 base | 8B Q4_K_M | 7-8 sec | Noticeable wait but tolerable |
| Modern CPU, no GPU | 8B Q4_K_M | 18-28 sec | Slow but tolerable for a typed question |
| Any hardware | Claude Sonnet | 2-4 sec | Instant, conversational |

### Stage 5: Session Export + Summary (End of Session, Not Time-Critical)

Runs once at session end. The DM clicks "End Session" and waits for a
summary. Latency tolerance is high — 30 seconds to 2 minutes is fine.

The summary prompt is larger (~5,000-10,000 input tokens if it includes
the full transcript) and the output is longer (~300-500 tokens for a
narrative summary). This is the one place where Claude Opus is worth
the cost — better prose quality at a moment where latency doesn't matter.

| Hardware | Model | Latency | Notes |
|----------|-------|---------|-------|
| RTX 4090 / 3090 | 8B Q4_K_M | 10-20 sec | Fast, DM barely notices |
| RTX 4070 / M3 Max | 8B Q4_K_M | 15-30 sec | Quick |
| RTX 3060 / 4060 Ti | 8B Q4_K_M | 20-40 sec | Fine, DM is packing up |
| M1/M2 | 8B Q4_K_M | 30-60 sec | Acceptable |
| Modern CPU | 8B Q4_K_M | 60-120 sec | Slow but it's end of session |
| Any hardware | Claude Sonnet | 8-15 sec | Fast |
| Any hardware | Claude Opus | 15-30 sec | Best quality, still fast enough |

### Hardware Recommendation Matrix

Based on the latency analysis, here's what to recommend in the first-run
wizard and documentation:

| Hardware Profile | Recommendation |
|-----------------|---------------|
| NVIDIA RTX 4090/3090 (24GB VRAM) | **Local mode is outstanding.** Everything including panic buttons in ~2 seconds. Claude unnecessary for speed — only for quality upgrade. Best local experience possible. |
| NVIDIA RTX 4070 / M3 Max | **Local mode recommended.** All features work well including panic buttons (3-4 sec). Claude optional for quality upgrade. |
| NVIDIA RTX 4060 Ti / RTX 3060 | **Local mode works well.** Suggestions and panic buttons in 4-5 seconds. Claude optional — better for quality than for speed at this tier. |
| Apple Silicon M1/M2 Pro | **Local mode usable.** Background suggestions fine (5-6 sec). Panic buttons marginal — consider Claude for time-critical features. |
| Apple Silicon M1/M2 base (16GB) | **Hybrid recommended.** Local for background suggestions (6-7 sec). Claude for panic buttons and ad-hoc questions. |
| Any machine, no discrete GPU | **Claude mode recommended for real-time features.** Local 3B model as offline fallback. Panic buttons require Claude for usable latency. |
| Low-spec machine (8GB RAM, older CPU) | **Claude mode required.** Local transcription with tiny/base whisper model. All LLM calls via Claude API. |

**First-run wizard messaging (example for RTX 3060):**

```
Detecting your hardware...

GPU detected: NVIDIA RTX 3060 (12GB VRAM) — ~40 tok/s with 8B model
RAM: 16GB

✅ Local transcription: Excellent (whisper small.en recommended)
✅ Local suggestions: Fast (~4-5 sec per suggestion)
✅ Local panic buttons: Good (~4-5 sec response time)
✅ Claude mode: Available for premium quality (2-4 sec, requires API key)

Recommendation: Local mode handles everything well on your hardware.
Add a Claude API key if you want the highest quality backstory and
improvisation suggestions.

[ Continue with Local ]  [ Set Up Claude Mode ]  [ Use Both ]
```

### Latency Optimization Strategies

| Strategy | Impact | Effort | When |
|----------|--------|--------|------|
| Shorter panic button prompts (~800 vs 2,500 tokens) | -40-50% panic latency | Low | MVP |
| Use 3B model for entity recall, 8B for creative tasks | Mixed — fast recalls, good creative | Medium | v1.1 |
| Pre-warm the model with a keep-alive ping every 30s | Eliminates cold-start on first call | Low | MVP |
| Cache common rule lookups (grappling, concentration, etc.) | Instant for cached rules, no LLM call | Medium | v1.1 |
| Speculative decoding (draft model + validator) | Up to 2-3x generation speedup | High | v2.0 |
| Stream LLM output to UI (show suggestion as it generates) | Perceived latency drops significantly | Medium | v1.1 |
| Ollama's `keep_alive` parameter to prevent model unloading | Eliminates 5-10s reload penalty | Low | MVP |

**Streaming to UI** deserves special attention. Instead of waiting for the
full 130-token response and then showing the card, you can stream tokens
as they arrive and render the suggestion card progressively. The DM starts
reading the title while the body is still generating. This cuts *perceived*
latency roughly in half on local hardware and makes the experience feel
dramatically more responsive. Both Ollama and the Anthropic API support
streaming natively.

**Ollama keep_alive** is critical. By default, Ollama may unload the model
from GPU memory after a period of inactivity. If the suggestion cycle is
45 seconds and the model unloads after 30 seconds, every cycle incurs a
5-10 second model reload penalty. Set `keep_alive: -1` (never unload) or
`keep_alive: "10m"` in the Ollama API call to prevent this.

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
