# DM Assistant — Business Model (Revised: Local-Only)

## The Model: Buy Once, Own Forever

**Price:** $35 one-time purchase. Perpetual license. All updates included
for the current major version. Major version upgrades (v2, v3) at a
discounted upgrade price ($15-20).

**Why this works now:** Going local-only eliminates the per-session API
costs that made the subscription math punishing. There are zero marginal
costs per user. Every sale after the first 7 (to cover your code signing
certificate) is nearly pure profit.

**Why this is right for the market:** Foundry VTT proved the TTRPG
community will rally behind a buy-once product built by a player for
players. Their founder stayed at $50 for 4+ years, grew to a 21-person
team, and the community actively evangelizes the model. You're entering
that same cultural lane at a lower price point ($35 vs $50) with a
product that complements rather than competes with Foundry.

---

## Unit Economics

### Cost Structure

| Item | Annual Cost |
|------|------------|
| Your time | Sweat equity (Null Arc side project) |
| Domain + landing page hosting | $20 |
| Code signing (Apple + Windows) | $200 |
| **Total fixed costs** | **~$220/year** |

| Item | Per-User Cost |
|------|--------------|
| Cloud infrastructure | $0 |
| API calls | $0 |
| Bandwidth | $0 (GitHub Releases / direct download) |
| **Total marginal cost** | **$0** |

### Revenue Model

| Metric | Value |
|--------|-------|
| License price | $35 |
| COGS per unit | $0 |
| Gross margin | ~100% |
| Break-even | 7 sales/year |

### Scenarios

| Year 1 Sales | Revenue | Net Profit | Context |
|-------------|---------|------------|---------|
| 50 | $1,750 | $1,530 | Covers costs, proves demand |
| 200 | $7,000 | $6,780 | Solid side-project income |
| 500 | $17,500 | $17,280 | Meaningful revenue |
| 1,000 | $35,000 | $34,780 | Comparable to a part-time salary |
| 2,000 | $70,000 | $69,780 | Full-time-job equivalent |

For reference, Foundry VTT's first year saw license owners doubling
every 6 months with 35% trailing quarterly growth — and that was a $50
VTT competing against free Roll20. A $35 AI copilot with no direct
competitor in the local-only real-time space has room.

---

## Revenue Streams

### Primary: Software License ($35)
The core product. One purchase, full feature set, no feature gating.
This is the Foundry model and it's non-negotiable for community trust.

### Secondary: Major Version Upgrades ($15-20)
When v2.0 ships (with significant new features like Foundry integration,
multi-system rules, player companion), existing users get a discounted
upgrade. v1.x continues to work forever — no forced upgrades. This is
the JetBrains model and it's well-understood by developers and power users.

### Tertiary: Community Marketplace (Future, v2+)
If the product gains traction, a marketplace for:
- Custom prompt packs (genre-specific: horror, sci-fi, political intrigue)
- Pre-built campaign templates with structured backstory hooks
- System-specific rule modules (Pathfinder 2e, Call of Cthulhu, etc.)
- Community-created panic button presets

Revenue split: 70/30 (creator/platform). This creates an ecosystem
that generates ongoing revenue without a subscription.

### Non-Revenue: BYOK Cloud Mode
Users who want Claude/GPT-4 quality suggestions can enter their own
API key. This costs you nothing to support (the API call goes directly
from the user's machine to Anthropic/OpenAI) and serves as an upsell
path to a premium experience without you bearing the cost.

---

## Pricing Justification

**Competitor comparison (monthly costs):**

| Tool | Price | Annual Cost | What You Get |
|------|-------|-------------|-------------|
| Archivist AI | $10-60/mo | $120-720/yr | Post-session notes, wiki, chatbot |
| DM's ARK | $6+/mo | $72+/yr | Post-session notes, Discord bot |
| World Anvil | $5-13/mo | $60-156/yr | Worldbuilding wiki |
| D&D Beyond | $6/mo | $72/yr | Digital books, character sheets |
| **DM Assistant** | **$35 once** | **$35 total** | **Real-time copilot, backstory weaver, panic buttons, notes** |

At $35, you're cheaper than 4 months of Archivist, 6 months of DM's ARK,
or 6 months of D&D Beyond. And you never pay again. This is an easy
impulse buy for a DM who's already spending $250/year on the hobby.

**Value framing:**
- Less than the price of one D&D sourcebook ($50)
- Less than a nice set of dice ($30-60)
- Less than one month of most competitor subscriptions
- Equivalent to ~2 hours of DM prep time saved (if you value your time at $15-20/hr)

---

## Go-to-Market

### Phase 1: Soft Launch (Week 4-6)

**Target:** Get 50 users and validate the core experience.

**Channels:**
- r/DMAcademy (900K+ members) — "I built a free local AI copilot for DMs"
- r/DnDBehindTheScreen (800K+ members) — same angle
- r/FoundryVTT — natural ally community, same philosophy
- EN World forums — engaged DM community
- TTRPG Discord servers (Foundry, Matt Colville's, etc.)

**Initial pricing:** Free during beta. Build goodwill, collect feedback,
fix bugs. This is the same playbook Foundry used — extended beta with
community feedback before charging.

**Ask:** Feedback, bug reports, and session recordings of them using the
tool (with permission) for testimonials and prompt tuning.

### Phase 2: Paid Launch (Month 2-3)

**Trigger:** When you have 50+ active beta users who confirm the
suggestion engine is genuinely useful.

**Launch price:** $29 introductory (first 100 licenses), then $35.

**Launch post template:**
"I'm a DM who built a tool I wished existed. It listens to your session,
knows your NPCs and your players' backstories, and whispers suggestions
to you in real time. Everything runs on your machine — no cloud, no
subscription, no data collection. It's $35, once, forever."

That post will resonate with this community because it hits every value
they care about: built by a player, local-first, privacy-respecting,
no subscription, no corporate BS.

### Phase 3: Growth (Month 3-12)

**Word of mouth is the primary channel.** The TTRPG community is tight
and vocal. If DMs love the tool, they'll tell their DM friends. Foundry
VTT's founder explicitly credits community evangelism as their primary
marketing channel.

**Secondary channels:**
- YouTube DM content creators (demo/review copies)
- TTRPG podcasts (guest spots talking about AI-assisted DMing)
- Convention presence (demo the tool at local game stores, cons)
- Foundry VTT module — creates a natural discovery path

**NOT worth spending money on:**
- Paid ads (TTRPG audience is too niche for efficient ad targeting)
- SEO (too slow, too competitive against established tools)
- Influencer sponsorships (community sees through this instantly)

---

## What Creates Stickiness (Since There's No Moat)

| Friction Source | How It Works |
|----------------|-------------|
| **Campaign data** | After 20 sessions, the DM has a rich database of NPCs, plot threads, backstory connections, and session history. Switching means starting over. |
| **Prompt quality** | Your suggestion prompts improve with every session you observe. This institutional learning is embedded in the product and can't be easily replicated by a new entrant. |
| **Muscle memory** | The panic buttons become reflexes. DMs build workflows around the tool. Switching has a cognitive cost. |
| **Community** | If you build a Discord where DMs share prompt templates, campaign structures, and tips, people stay for the community even if a competitor appears. |
| **Integration** | A Foundry VTT module or Obsidian plugin creates dependency. The tool becomes part of a larger workflow. |
| **Trust** | "Built by a DM, runs locally, no subscription" is an identity, not just a feature. A VC-funded competitor can copy features but can't copy that story. |

---

## Realistic Expectations

This is a Null Arc side project. Frame expectations accordingly:

| Outcome | Likelihood | Value |
|---------|-----------|-------|
| Tool works, nobody buys it | 30% | You have a cool portfolio piece and learned Tauri + local AI |
| 50-200 sales, covers costs | 30% | Validated product, community reputation, foundation to build on |
| 200-1000 sales, meaningful side income | 25% | $7K-35K, funds further development, opens doors |
| 1000+ sales, sustainable product | 10% | Real business potential, consider full investment |
| Breakout success (5000+) | 5% | Quit your — actually, don't quit anything yet |

The worst case is you spend a month building something cool and
learn a new stack. The best case is you build a product DMs love
and it generates passive income for years. The expected case is
somewhere in the "covers costs and builds reputation" range, which
is exactly what a Null Arc project should target.

---

## Decision Log

| Decision | Rationale |
|----------|-----------|
| Local-only as default | Eliminates all per-user costs, enables buy-once model, aligns with TTRPG community values |
| $35 one-time | Below the "impulse buy" threshold for hobby spending, undercuts all subscription competitors on annual basis |
| Tauri over Electron | Lightweight shell leaves resources for the LLM and whisper |
| Ollama as LLM runtime | One-command install, model flexibility, OpenAI-compatible API, massive community |
| whisper.cpp for STT | Free, local, fast enough for real-time, proven on consumer hardware |
| BYOK as optional upsell | Captures users who want frontier quality without costing you anything |
| Free beta before paid launch | Builds trust, collects feedback, follows the Foundry playbook |
| No subscription, no cloud tier | Philosophical commitment that earns community trust — the most valuable asset in this market |
