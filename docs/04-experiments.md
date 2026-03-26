# DM Assistant — Feasibility Experiments & Alpha Test Plan

## What Needs Proving (And In What Order)

The product has four technical risks that need to be retired before
building the full app. Ordered by "if this doesn't work, nothing else
matters":

1. **Can whisper.cpp produce usable transcripts from table audio?**
   (Fantasy names, multiple speakers, background noise, distance)
2. **Can a local 8B model generate useful suggestions from a prompt + transcript?**
   (Quality, structure, relevance, knowing when to say nothing)
3. **Can the keyword-based background analyzer reliably detect relevant moments?**
   (False positive rate, false negative rate, NPC matching, backstory matching)
4. **Does the full pipeline work end-to-end at acceptable latency?**
   (Audio → transcript → detection → LLM → suggestion, on real hardware)

Each experiment below targets one or more of these risks.

---

## Experiment 1: Whisper.cpp Solo Bench Test
**Risk addressed:** #1 (transcription quality)
**Time:** 1 evening
**Needs:** Your laptop, a microphone, whisper.cpp installed

### What To Do

Install whisper.cpp and run it in stream mode against your laptop mic.
Then talk through a simulated TTRPG session by yourself — narrate as
the DM, change your voice slightly for different "players," use real
fantasy names from one of your campaigns.

```bash
# Install
git clone https://github.com/ggml-org/whisper.cpp && cd whisper.cpp
make

# Download models (test multiple)
bash ./models/download-ggml-model.sh base.en
bash ./models/download-ggml-model.sh small.en

# Run stream mode with campaign name prompting
./build/bin/whisper-stream \
  -m ./models/ggml-small.en.bin \
  -t 4 --step 500 --length 5000 \
  --prompt "Vex, Drogan, Sable, Mayor Hild, Oldroot, Reva, \
            Bleakwood, Charred Flagon, Tomb of Kael, Ashen Crown, \
            Scorrath, Thessaly, Fendrel, Gruuk, Elowen"
```

### Test Script (Read Aloud, Different Voices)

```
DM: "As you enter the Charred Flagon, you see Gruul behind the bar.
     He nods at you. The tavern is mostly empty tonight."

Player 1: "I want to find Reva. Is she here?"

DM: "You don't see Reva, but there's a tiefling woman sitting in the
     corner with a small creature on her shoulder."

Player 2: "That's a pseudodragon! I go talk to her. What's her name?"

DM: "She introduces herself as Cinder's keeper. She seems cautious."

Player 3: "I cast Detect Magic. Is there anything unusual in the room?"

DM: "Roll Arcana for me."

Player 3: "I got a 17."

DM: "You sense faint transmutation magic coming from behind the bar,
     near where Gruul is standing."

Player 1: "I want to use Insight on Gruul. Something's off about him."

DM: "Roll Insight."

Player 1: "Natural 20!"

DM: "Gruul's hands are trembling slightly. He keeps glancing at the
     back door. He's afraid of something."
```

### What To Measure

| Question | How To Check |
|----------|-------------|
| Does it capture the words correctly? | Read output, compare to what you said |
| Does the --prompt flag help with fantasy names? | Try with and without the prompt flag. Does "Gruul" come out as "Gruel"? Does "Reva" become "Reba"? |
| How much delay between speaking and text appearing? | Subjective feel — is it under 3 seconds? |
| Does it handle voice changes (DM doing NPC voices)? | Check if volume/tone shifts cause garbled output |
| What happens during a pause? | Stop talking for 30 seconds. Does it hallucinate text? |
| base.en vs small.en quality difference? | Run the same script on both models, compare accuracy |

### Bonus: Table Distance Test

If you have a USB conference mic (or buy the $25 TONOR G11), place it
on a table and speak from different distances:
- 1 foot (DM position)
- 3 feet (adjacent player)
- 5 feet (across the table)
- 8 feet (far end of a large table)

Record how accuracy degrades with distance. This tells you the maximum
viable table size.

---

## Experiment 2: LLM Suggestion Quality Test
**Risk addressed:** #2 (local model suggestion quality)
**Time:** 1 evening
**Needs:** Ollama installed, your campaign notes

### What To Do

Install Ollama, pull the default model, and manually send suggestion
prompts with sample transcripts. No app needed — just curl or a Python
script.

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull model
ollama pull llama3.1:8b-instruct-q4_K_M

# Test with curl
curl http://localhost:11434/api/chat -d '{
  "model": "llama3.1:8b-instruct-q4_K_M",
  "stream": false,
  "messages": [
    {"role": "system", "content": "You are a TTRPG assistant..."},
    {"role": "user", "content": "CAMPAIGN CONTEXT:\n...\nTRANSCRIPT:\n..."}
  ]
}'
```

### Test Cases

Create a file with 5-6 test prompts using the actual prompt template
from the architecture doc. Each test case should be a realistic scenario:

**Test 1 — NPC Recall (should trigger RECALL):**
Campaign context includes Mayor Hild. Transcript includes "Let's go talk
to that lady who gave us the quest." Does the model identify Mayor Hild
from an indirect reference?

**Test 2 — Rules Question (should trigger RULES):**
Transcript includes "Can I grapple while I'm prone?" Does the model
produce correct 5e grappling rules?

**Test 3 — Backstory Connection (should trigger BACKSTORY):**
Character backstory mentions "monastery of Pelor." Transcript includes
DM describing a burned chapel with a Pelor symbol. Does the model connect
them?

**Test 4 — Nothing Relevant (should return NONE):**
Transcript is just "Anyone want more pizza? Yeah grab me a slice."
Does the model correctly return NONE?

**Test 5 — Panic Button (Phones Out):**
Character backstories provided. Transcript shows one character hasn't
spoken in the last 3 minutes. Send the Phones Out panic prompt. Is the
generated hook specific to the quiet character's backstory?

**Test 6 — Combat Stats:**
Campaign context includes a planned encounter with skeletons (AC 13, HP 13).
Transcript includes "Roll initiative!" Does the model surface the stat block?

### What To Measure

| Question | How To Check |
|----------|-------------|
| Does the 8B model follow the output format (TYPE/TITLE/BODY/DM_ONLY)? | Parse the output — does it match the template? |
| Can it identify NPCs from indirect references? | Test 1 — does it find Mayor Hild from "the lady who gave us the quest"? |
| Does it return NONE when appropriate? | Test 4 — does it stay silent for pizza talk? |
| Is the suggestion concise (under 100 words)? | Count words in the BODY field |
| Are the rules suggestions accurate? | Test 2 — check against actual 5e SRD |
| How does it compare to Claude? | Run the same 6 tests through the Anthropic API (or right here in this chat) and compare |
| What's the latency? | Time each curl call |

### Compare Local vs Claude

Run all 6 tests on both:
- `llama3.1:8b-instruct-q4_K_M` (local via Ollama)
- `claude-sonnet-4-6` (via API or paste the prompts into Claude)

Build a comparison table: quality (1-5), accuracy, format compliance,
latency. This gives you real data for the "local vs Claude" quality
gap claims in the architecture doc.

---

## Experiment 3: Background Analyzer Keyword Test
**Risk addressed:** #3 (notification detection accuracy)
**Time:** A few hours
**Needs:** Python, a sample campaign context, sample transcripts

### What To Do

Write the keyword matching analyzer as a standalone Python script.
Feed it sample transcripts and campaign data. Measure detection
accuracy.

```python
# test_analyzer.py
# No LLM, no audio — pure keyword matching logic

campaign = {
    "npcs": [
        {"name": "Mayor Hild", "keywords": ["mayor", "hild", "quest giver"]},
        {"name": "Fendrel", "keywords": ["fendrel", "cartographer", "map seller"]},
        {"name": "Oldroot", "keywords": ["oldroot", "treant", "bleakwood"]},
    ],
    "plot_hooks": [
        {"description": "Coded letter with spider seal", "keywords": ["letter", "coded", "spider", "seal"]},
        {"description": "Sable promised to return the seedling to Oldroot", "keywords": ["seedling", "promise", "oldroot"]},
    ],
    "characters": [
        {"name": "Gruuk", "backstory_keywords": ["pelor", "monastery", "monks", "abandoned"]},
        {"name": "Elowen", "backstory_keywords": ["thessaly", "mentor", "bard", "lute", "disappeared"]},
    ]
}

test_transcripts = [
    # Should detect: Mayor Hild (indirect reference)
    ("Let's go talk to that lady about the quest", "Should detect Mayor Hild"),

    # Should detect: Fendrel (direct name)
    ("We should find Fendrel and confront him about the map", "Should detect Fendrel"),

    # Should detect: Backstory match (Gruuk + Pelor)
    ("You see a burned chapel with a symbol of Pelor on the wall", "Should detect Gruuk backstory"),

    # Should detect: Plot hook (coded letter)
    ("Wait, we still have that letter with the weird seal", "Should detect coded letter hook"),

    # Should NOT detect anything (off-topic)
    ("Anyone want more pizza? What kind is left?", "Should return None"),

    # Should NOT detect (fantasy words but no campaign match)
    ("The dragon flew over the mountain pass", "Should return None (no dragon in campaign)"),

    # Tricky: indirect NPC reference
    ("That merchant who sold us the bad map", "Should detect Fendrel (indirect)"),

    # Tricky: partial backstory match
    ("This chapel reminds me of somewhere", "Should NOT detect (too vague)"),
]

# Run your analyzer against each and score:
# True Positive, False Positive, True Negative, False Negative
```

### What To Measure

| Metric | Target |
|--------|--------|
| True Positive Rate (detects relevant moments) | > 80% |
| False Positive Rate (detects irrelevant moments) | < 15% |
| Indirect reference detection (NPC without name) | Expect low — this is where the LLM is needed |
| Backstory keyword matching | > 70% for 2+ keyword matches |

**Key insight from this experiment:** The analyzer will catch direct name
mentions reliably but struggle with indirect references ("that lady who
gave us the quest"). That's fine — indirect detection is the LLM's job
when the DM clicks "Suggest." The analyzer just needs to catch the
obvious stuff and avoid false alarms.

---

## Experiment 4: Simulated Session Recording Test
**Risk addressed:** #1 + #2 + #4 (full pipeline, realistic audio)
**Time:** 1 evening
**Needs:** All the above plus actual-play audio

### Option A: Use an Actual-Play Recording

Download a segment (15-20 minutes) from a publicly available actual-play
podcast or YouTube video. Good candidates:
- Critical Role (high production quality, clear audio)
- Dimension 20 (multiple speakers, fast-paced)
- Any homebrew actual-play with lower audio quality (more realistic)

Convert to WAV (16kHz mono) and run through whisper.cpp:

```bash
# Download a segment (use yt-dlp)
yt-dlp -x --audio-format wav "https://youtube.com/watch?v=XXXX" \
  --postprocessor-args "-ar 16000 -ac 1" -o test_session.wav

# Trim to 15 minutes
ffmpeg -i test_session.wav -t 900 -c copy test_15min.wav

# Transcribe
./build/bin/whisper-cli -m models/ggml-small.en.bin -f test_15min.wav \
  --prompt "Character names from the show"
```

Then feed the transcript into your suggestion prompt tests from
Experiment 2. This gives you a realistic end-to-end test without
needing live players.

### Option B: Solo Session Simulation (Extended)

Run a full 30-minute simulated session by yourself, playing all parts.
Use the whisper-stream mode so you get real-time transcription while
you narrate. Set up a scene with multiple NPCs, a combat encounter,
and a social scene. Record the session audio as a backup file for
re-testing later.

```bash
# Stream mode for real-time + save to file simultaneously
# Run whisper-stream in one terminal
./build/bin/whisper-stream -m models/ggml-small.en.bin -t 4 \
  --step 500 --length 5000 --prompt "NPC names here"

# Record audio in another terminal (for replay testing)
arecord -f cd -t wav test_session.wav
# (or use Audacity, or just record on your phone as backup)
```

### Option C: Phone-a-Friend Quick Test

Get 1-2 friends (doesn't have to be your game group) to sit around a
table for 15 minutes and read through a scripted scene. This tests the
real microphone physics: multiple voices, different distances, crosstalk,
laughing, table noise.

No game knowledge needed — just hand them a script:
- "You're Player 1, read these lines when I point at you"
- "You're Player 2, read these lines"
- "I'll be the DM reading everything else"

This is the cheapest way to test multi-speaker audio without scheduling
a full session.

---

## Experiment 5: Prompt Engineering Sprint
**Risk addressed:** #2 (suggestion quality — the core product)
**Time:** 1-2 evenings
**Needs:** Ollama + Claude API access

### What To Do

Take the 6 test cases from Experiment 2 and expand them to 20.
Cover every suggestion type: RECALL, RULES, THREAD, COMBAT, SPELL,
IMPROV, BACKSTORY, PACING, and NONE. Include edge cases:

- NPC mentioned by nickname not in the campaign context
- Two NPCs mentioned in the same exchange
- Player attempts a rule that has a house rule override
- Combat starts but the encounter isn't in the planned list
- Backstory keyword appears in a non-relevant context
  ("We go to the temple" when a character's backstory mentions temples
  but about a DIFFERENT temple)
- Very short transcript (player just said "I attack")
- Very noisy transcript (garbled, partial words)

For each test case, iterate on the prompt template until the 8B model
produces acceptable output on at least 15/20 cases. Track which cases
are hardest and document them — those become the cases where you
recommend Claude mode.

### The Real Deliverable

A refined prompt template that you've tested against 20 real scenarios
on both local and Claude. This is the most important artifact of the
entire experiment phase. The prompt IS the product.

---

## Experiment 6: Alpha Test (Real Table)
**Risk addressed:** All four — real-world validation
**Time:** One session with your new group
**Needs:** All the above working together, even if held together with
duct tape

### Minimum Viable Alpha

You don't need the Tauri app for the alpha. You need:
1. **whisper.cpp streaming** in a terminal window (transcription)
2. **A Python script** that reads the transcript output, runs the
   keyword analyzer, and prints notifications to the console
3. **Ollama running** so you can paste transcript chunks and get
   suggestions (could be a simple web UI or even a second terminal)
4. **Your campaign context** pasted into a system prompt that you
   reuse for each query

This is ugly but it tests the core hypothesis: **does a DM find value
in an AI that knows their campaign and can help on demand during play?**

### What the Alpha Session Looks Like

```
Laptop screen layout (split into regions):

┌──────────────────────────┬──────────────────────────┐
│                          │                          │
│  Terminal 1:             │  Terminal 2:             │
│  whisper-stream output   │  Background analyzer     │
│  (live transcript)       │  (prints notifications)  │
│                          │                          │
│  "I want to search the   │  📋 NPC: "Fendrel"      │
│   chest for traps"       │     detected at 0:12:31  │
│  "Roll a perception      │                          │
│   check"                 │  🎭 Backstory: Gruuk     │
│  "I got a 17"            │     + "Pelor" at 0:34:12 │
│                          │                          │
├──────────────────────────┼──────────────────────────┤
│                          │                          │
│  Terminal 3:             │  Notes:                  │
│  Ollama chat             │  Campaign context doc    │
│  (paste transcript,      │  (reference)             │
│   get suggestions)       │                          │
│                          │                          │
│  > You: [paste context   │                          │
│    + transcript + prompt]│                          │
│  > AI: RECALL: Fendrel   │                          │
│    Half-elf cartographer..│                          │
│                          │                          │
└──────────────────────────┴──────────────────────────┘
```

Yes, this is janky. You're manually pasting transcript into Ollama.
The "panic buttons" are just pre-written prompts you copy-paste with
the recent transcript appended. The analyzer is a Python script
printing to a terminal. It looks terrible.

But it answers the only question that matters: **when you used the
suggestion, did it help? When the analyzer flagged something, was it
relevant? Did you wish you had this during play?**

### What To Capture During Alpha

Have a notebook (physical, not digital — you're running the game) and
after each time you interact with the system, jot down:
- What you needed (NPC info? rules? backstory idea?)
- What the system gave you
- Did you use it? (Yes / Partially / No)
- How long did it take? (Fast enough? Too slow?)
- Would a real app with a button have been better? (Obviously yes —
  but how much better?)

### Post-Alpha Decision

After the alpha session, you know:
- Whether the core hypothesis is validated (DMs want this at the table)
- Whether the 8B model quality is good enough for the main use cases
- Whether the transcript quality is usable from a center-table mic
- Which suggestion types were most valuable in practice
- Whether the pull model + notification badges feel right
- Whether to proceed to building the Tauri app

If the alpha works even in its janky terminal-window form, the polished
app version will be dramatically better. If the alpha doesn't work —
if the transcription is too garbled, or the suggestions are useless,
or you never look at the screen during the game — you've saved yourself
weeks of UI development on a bad idea.

---

## Timeline

| Week | Experiment | Time Needed | What You Learn |
|------|-----------|-------------|---------------|
| This week | Exp 1: Whisper.cpp solo bench | 2-3 hours | Is transcription viable? Fantasy name accuracy? Model choice? |
| This week | Exp 2: LLM suggestion quality | 2-3 hours | Is the 8B model good enough? Where does it fail? Local vs Claude gap? |
| Next week | Exp 3: Analyzer keyword test | 2-3 hours | Does the notification system detect real moments? False positive rate? |
| Next week | Exp 5: Prompt engineering sprint | 4-6 hours | Refined prompt template — the most important artifact |
| When available | Exp 4: Simulated session (recording or friend) | 2-3 hours | Full pipeline on realistic audio |
| When group starts | Exp 6: Alpha test at real table | One session + janky terminal setup | The real answer: does this help? |

**You can do Experiments 1-3 this week without anyone else.** They
require nothing but your laptop, a microphone, and an evening. If any
of them produce a hard "no" (whisper.cpp can't handle fantasy names at
all, the 8B model ignores the prompt format, the keyword analyzer is
all false positives), you've identified the problem before investing
in the app.

Experiment 5 (prompt sprint) is the highest-value time investment.
Every hour you spend refining the prompt pays off permanently across
every session every user ever runs.

Experiment 6 (alpha) waits for your new group to start. By then you'll
have validated everything except the live table experience, and the
alpha is a scrappy terminal setup, not a polished app. If the alpha
validates, THEN you build the Tauri app with confidence.

---

## Go / No-Go Criteria

| Experiment | GO if... | NO-GO if... |
|-----------|----------|-------------|
| Whisper.cpp | Fantasy names are recognizable with --prompt flag. Multi-voice works at 3-5 ft. Latency under 4 seconds. | Names are consistently garbled even with prompting. Audio beyond 3 feet is unusable. |
| LLM Quality | 8B model follows format on 80%+ of test cases. Suggestions are concise and relevant. NONE is returned for irrelevant transcripts. | Model ignores format, produces long rambling output, or never returns NONE. |
| Analyzer | True positive rate > 70%. False positive rate < 20%. Direct name matches are reliable. | False positive rate > 30% (too noisy) or true positive rate < 50% (misses too much). |
| Prompt Sprint | Refined prompt works on 15/20 test cases for 8B. Works on 18/20 for Claude. | Can't get above 10/20 on 8B even after iteration. The model just isn't capable enough. |
| Simulated Session | End-to-end pipeline produces at least 3 useful suggestions in a 15-minute test. | Zero useful suggestions from real audio. Pipeline breaks under realistic conditions. |
| Alpha (live table) | You used the system 5+ times during the session and it helped at least 3 times. You wished it was an app instead of terminals. | You never looked at it during play. The suggestions were never relevant. The transcript was too garbled to be useful. |
