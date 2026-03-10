# DM Assistant App — Research & Market Analysis

## Executive Summary

The TTRPG market is valued at roughly $2 billion globally (2025) and growing at ~12% CAGR, projected to reach $5–7 billion by 2034–2035. The AI-powered DM tools space is young, fragmented, and heavily focused on **post-session note summarization**. Very few tools attempt **real-time in-play suggestions** — the core differentiator for your concept. This gap represents a meaningful opportunity.

---

## 1. Market Landscape

### 1.1 TTRPG Market Size & Demographics

- **Global market**: ~$2B in 2025, ~12% CAGR through 2034
- **North America**: ~38–42% of global share
- **Core demographic**: 18–35 age group = 46% of players, 55% of new product purchases
- **Average annual spend per player**: ~$250 on books/accessories
- **Digital tools/VTT segment**: projected to hit $551M by 2030
- **62%** of players engage in weekly sessions
- **48%** adoption of digital TTRPG platforms
- **78%** of online groups use Discord for communication
- Gen Con 2024 set an all-time record with 71,000+ attendees

### 1.2 Key Takeaway

The player base is large, digitally native, and actively spending on tools. The appetite for AI-augmented play is established but largely unmet beyond note-taking. The "DM cognitive load" problem is universally acknowledged but poorly addressed by existing products during actual play.

---

## 2. Competitive Landscape

### 2.1 Post-Session Note Takers (Primary Competitors)

These tools focus on transcription and summarization *after* the session:

| Product | Model | Key Features | Pricing | Notes |
|---------|-------|-------------|---------|-------|
| **Archivist AI** | SaaS, Discord bot + web | Transcription, session recaps, campaign wiki, entity tracking, quest log, campaign chatbot, timeline, trading cards | $10–60/mo | Most feature-complete. 10K+ sessions logged. Launched Oct 2025. Foundry VTT + Discord integrations. |
| **GM Assistant** | SaaS | Upload audio → notes, entity extraction, GDPR compliant, multi-language | Freemium (first free) | Simpler, focused on audio-in/notes-out pipeline |
| **SessionKeeper** | Mobile + Web | Auto recording, AI summaries, campaign wiki, achievements, voice ID | Unknown | iOS/Android native. Discord integration. Community testimonials strong. |
| **Loreify** | SaaS + Discord | Audio → notes, lore map, Discord auto-delivery, NPC/location tracking | Freemium | Newer entrant, polished marketing, visual "lore map" feature |
| **The DM's ARK** | SaaS + Discord bot | Real-time Discord transcription, session summaries, "Scribe" chatbot | $6+/mo | 3-person indie team. 5,000+ sessions. OpenAI Whisper-based. |
| **CharGen Session Notes** | SaaS | Upload audio/transcript → structured notes, NPC/location dossiers, Discord bot | Gold-based credits | Also has NPC/shop/tavern generators. Session Companion (real-time) "Coming Soon" |
| **RollSummary** | SaaS | AI session summaries, next-session suggestions, POI identification | Unknown | Lightweight, narrowly scoped |

### 2.2 Worldbuilding & Campaign Management (Adjacent)

| Product | Focus |
|---------|-------|
| **World Anvil** | Worldbuilding wiki, campaign management, 2M+ users, 45+ systems |
| **LegendKeeper** | Worldbuilding + DM tools, maps, auto-linking |
| **Notion** (DIY) | Many DMs use Notion databases for NPCs, items, locations |
| **Google NotebookLM** | Some DMs use as a personal campaign RAG system |

### 2.3 VTTs with DM Features (Tangential)

| Product | Notes |
|---------|-------|
| **Foundry VTT** | 18% of paid VTT market. Initiative, dynamic lighting, macros. |
| **Roll20** | 1.5M monthly active users. D&D 5e = 51.5% of games played. |
| **DM Helper** | Free VTT with two-window system, combat tracking |
| **Game Master 5e** | iOS app, encounter/initiative tracker, compendium |

### 2.4 AI "Replacement DM" Tools (Different Category)

| Product | Notes |
|---------|-------|
| **AI Dungeon** | AI-generated text adventures. Solo play. Not a DM assistant. |
| **AI Realm** | AI Game Master for solo D&D-like play. Character creation + story. |
| **HyperWrite AI DM** | GPT-powered scenario generator. Not real-time. |

### 2.5 DIY Approaches

Many DMs are cobbling together their own pipelines:
- **Discord bot (Craig)** → **Whisper** transcription → **GPT/Claude/Gemini** summarization
- One documented workflow uses Whisper + Foundry XML export + character summaries + summary template, all fed into Gemini 1.5's 128K context window
- Google NotebookLM used as a personal RAG over rulebooks and session notes

---

## 3. The Gap: Real-Time In-Play Suggestions

This is the **most underserved** part of the market. Here's what exists:

- **CharGen's "Session Companion"**: Advertised as "Coming Soon" — real-time transcription with automatic tracking of moments, NPCs, plot elements. Not shipped yet.
- **Archivist**: Has a campaign chatbot you can query mid-session, but it's reactive (you ask it a question) not proactive (it doesn't push suggestions).
- **Generic LLMs**: Some DMs keep a ChatGPT/Claude window open to ask ad-hoc questions during play.

**Nobody is shipping a product that listens to play and proactively surfaces contextual suggestions to the DM in real time.** This is your opening.

### What DMs Actually Need During Play

Based on community discussions and product reviews, the pain points during actual gameplay are:

1. **Rules lookups** — "How does grappling work underwater?" (latency killer)
2. **NPC consistency** — "What accent did I give that shopkeeper 3 sessions ago?"
3. **Forgotten plot threads** — "The party promised the mayor they'd return the artifact"
4. **Improvisation support** — "They went off-script, I need a quick NPC/location/encounter"
5. **Pacing awareness** — "We've been in combat for 45 minutes, maybe wrap it up"
6. **Name generation** — On-the-fly names that are consistent with the setting
7. **Stat/mechanic suggestions** — Quick DC recommendations, loot tables, etc.

---

## 4. Proposed Feature Set

### 4.1 Core: Real-Time DM Copilot

| Feature | Description | Priority |
|---------|-------------|----------|
| **Passive listening** | Audio transcription running during play (Whisper/similar) | P0 |
| **Context-aware suggestions** | AI monitors transcript and surfaces relevant notes, rules, NPC details | P0 |
| **Quick-reference sidebar** | Searchable access to campaign entities (NPCs, locations, items, plot hooks) | P0 |
| **Rules assistant** | Instant rule lookups from SRD/homebrew rules (RAG over uploaded PDFs) | P1 |
| **Improvisation prompts** | On-demand NPC names, tavern descriptions, encounter ideas, contextual to current scene | P1 |
| **Pacing nudges** | Optional alerts (e.g., "Combat has been running 40 min", "3 hours elapsed") | P2 |

### 4.2 Core: Post-Session Summarization

| Feature | Description | Priority |
|---------|-------------|----------|
| **Session recap** | Narrative summary + bullet points | P0 |
| **Entity extraction** | Auto-identify NPCs, locations, items, factions mentioned | P0 |
| **Campaign wiki updates** | Auto-suggest updates to campaign knowledge base | P1 |
| **"Previously on..." generator** | Read-aloud recap for next session's opening | P1 |
| **Plot thread tracker** | Surface unresolved hooks and promises | P1 |
| **Export** | Markdown, PDF, Discord webhook | P2 |

### 4.3 Differentiators vs. Existing Products

| Your App | Archivist / GM Assistant / etc. |
|----------|--------------------------------|
| **Proactive** suggestions during play | Reactive (query-based) or post-session only |
| Rules-aware (RAG over SRD + homebrew) | Campaign-data only, no rules engine |
| Pacing / session management awareness | No session flow awareness |
| Combined real-time + post-session | Most are post-session only |
| System-agnostic with pluggable rule modules | Most are system-agnostic but rules-unaware |

---

## 5. Technical Architecture (High-Level)

```
┌─────────────────────────────────────────────────────┐
│                    Client (Tablet/Laptop)            │
│  ┌──────────┐ ┌──────────────┐ ┌─────────────────┐  │
│  │ Audio In  │ │ Suggestion   │ │ Campaign Wiki   │  │
│  │ (Mic)     │ │ Panel        │ │ / Entity View   │  │
│  └─────┬─────┘ └──────────────┘ └─────────────────┘  │
│        │                                              │
└────────┼──────────────────────────────────────────────┘
         │ audio stream
         ▼
┌─────────────────────────────────────────────────────┐
│                   Backend Services                   │
│                                                      │
│  ┌────────────┐    ┌──────────────────────────────┐  │
│  │ STT Engine │───>│ Transcript Buffer             │  │
│  │ (Whisper)  │    │ (rolling window)              │  │
│  └────────────┘    └──────────┬───────────────────┘  │
│                               │                      │
│                    ┌──────────▼───────────────────┐   │
│                    │ Suggestion Engine (LLM)      │   │
│                    │ - Context: transcript window │   │
│                    │ - RAG: campaign KB + rules   │   │
│                    │ - Mode: proactive / on-demand│   │
│                    └──────────┬───────────────────┘   │
│                               │                      │
│  ┌────────────────────────────▼──────────────────┐   │
│  │ Campaign Knowledge Base                        │   │
│  │ (Vector DB: entities, session history, rules)  │   │
│  └────────────────────────────────────────────────┘   │
│                                                      │
│  ┌────────────────────────────────────────────────┐   │
│  │ Post-Session Pipeline                          │   │
│  │ - Full transcript → structured summary         │   │
│  │ - Entity extraction → KB update suggestions    │   │
│  │ - Plot thread analysis                         │   │
│  └────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

### Key Technical Decisions to Explore

| Decision | Options | Considerations |
|----------|---------|---------------|
| **STT** | OpenAI Whisper (local or API), Deepgram, AssemblyAI | Whisper is free/local but GPU-hungry. Deepgram has real-time streaming API. Fantasy vocabulary accuracy is a known challenge. |
| **LLM** | Claude API, GPT-4, local (Llama 3) | Cloud for quality, local for latency/cost. Could use smaller model for suggestions, larger for summarization. |
| **Vector DB** | ChromaDB, Qdrant, Pinecone | ChromaDB for local/simple. Qdrant for self-hosted production. |
| **Client** | Web app (React), Electron desktop, tablet PWA | Tablet-friendly UI is critical — DMs use tablets at the table. |
| **Audio input** | Direct mic, Discord bot, system audio capture | Discord bot covers online play. Direct mic for in-person. Both is ideal. |
| **Deployment** | Cloud SaaS, self-hosted, hybrid | SaaS for ease, self-hosted option for privacy-conscious DMs |

### Stack Suggestion (Playing to Your Strengths)

- **Backend**: Python (FastAPI) — transcription pipeline, LLM orchestration, RAG
- **Frontend**: React (web/PWA) — tablet-optimized DM dashboard
- **STT**: Whisper API or Deepgram streaming
- **LLM**: Claude API (Sonnet for real-time suggestions, Opus for post-session deep analysis)
- **Vector DB**: ChromaDB (start simple, migrate later)
- **Storage**: PostgreSQL for structured data, S3-compatible for audio files

---

## 6. Business Model Considerations

### 6.1 Pricing Benchmarks

| Competitor | Price |
|------------|-------|
| Archivist AI | $10–60/mo |
| The DM's ARK | $6+/mo |
| World Anvil | Free tier + $5–13/mo paid |
| Foundry VTT | $50 one-time |
| GM Assistant | Freemium |

### 6.2 Suggested Model

- **Free tier**: Post-session summarization for 1 campaign, 2 sessions/month. No real-time features.
- **Pro ($12–15/mo)**: Real-time suggestions, unlimited sessions, campaign wiki, rules RAG, Discord integration.
- **Table ($25–30/mo)**: Pro + multiple campaigns, player access to recaps/wiki, priority STT.

The real-time suggestion engine is the premium feature that justifies higher pricing vs. note-taking-only competitors.

### 6.3 Revenue Potential (Napkin Math)

- ~50 million global TTRPG players, ~19M in the 18-35 core demo
- 48% using digital tools = ~9M digitally-active players
- If even 0.1% convert to paid at $15/mo = 9,000 users × $15 × 12 = **$1.6M ARR**
- Archivist has logged 10K+ sessions in ~5 months — market is proven if small

---

## 7. Risks & Challenges

| Risk | Mitigation |
|------|-----------|
| **STT accuracy with fantasy names** | Custom vocabulary/fine-tuning. Let DMs pre-register character/NPC names. Archivist reviews note this is an ongoing issue for everyone. |
| **Latency for real-time suggestions** | Use streaming STT + smaller/faster model for suggestions. Batch non-urgent analysis. |
| **"Creepy factor" of always-listening AI** | Make it transparent, give DM full control (pause/resume), don't store raw audio longer than needed. |
| **LLM cost at scale** | Start with cloud APIs, monitor per-session cost. Smaller models for routine tasks, larger for complex analysis. |
| **Crowded note-taking space** | Don't compete head-on with Archivist on post-session. Lead with the real-time copilot angle. |
| **System-specific rules complexity** | Start with D&D 5e SRD (open content), expand to Pathfinder 2e ORC. Don't try to support everything at launch. |
| **Indie team vs. funded competitors** | Archivist is also a 2-person team. Small teams can move fast in this niche. |

---

## 8. Recommended Next Steps

1. **Validate the core hypothesis**: Build a quick prototype that does passive transcription + context-aware suggestions using a Whisper + Claude pipeline. Test it at your own table.
2. **Define the MVP scope**: Real-time suggestion panel + post-session recap. Skip campaign wiki for v1.
3. **Pick one audio input path first**: Discord bot (for online play) OR direct mic (for in-person). Don't try both at once.
4. **Community validation**: Post the concept in r/DMAcademy, r/DnD, EN World forums. The TTRPG community is vocal and will tell you exactly what they want.
5. **Consider this as a Null Arc project**: Fits your side-project LLC perfectly — SaaS, technically interesting, personal passion alignment.

---

*Research compiled March 2026. Sources include Archivist AI, GM Assistant, SessionKeeper, Loreify, The DM's ARK, CharGen, World Anvil, LegendKeeper, industry market reports, and TTRPG community forums.*
