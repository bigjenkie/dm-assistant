# DM Assistant — Adaptive Music System Feature Spec

## Overview

The app already classifies the scene type (combat, exploration, social,
dramatic, downtime) to decide what kind of suggestion to generate. The
Adaptive Music System routes that same classification to an audio engine
that automatically crossfades between appropriate music tracks, eliminating
the most common audio problem DMs face: forgetting to change the music.

**Design principle:** The DM should never have to manually switch music
during a session. The app listens, understands the scene, and handles it.
The DM can override at any time, but the default is "it just works."

---

## Scene Classification

The Scene Classifier runs as a lightweight analysis on each transcript
window (every 15-30 seconds, cheaper than the full suggestion cycle).
It outputs one of these scene states:

| Scene State | Transcript Signals | Example |
|-------------|-------------------|---------|
| COMBAT | "roll initiative", "I attack", "take X damage", "saving throw", "hit points" | Active combat encounter |
| COMBAT_BOSS | COMBAT + named enemy from encounters, high damage numbers, spell names | Fighting the Wight, dragon, BBEG |
| EXPLORATION | "I search", "perception check", "what do I see", "we travel", "enter the room" | Dungeon crawling, traveling, investigating |
| SOCIAL | NPC names, "I say to", "persuasion", "insight check", "we ask about" | Tavern conversations, negotiations, NPC interaction |
| DRAMATIC | Sudden silence after intense exchange, DM monologue, backstory keywords, revelation language | Plot twists, character moments, emotional beats |
| TENSION | "stealth check", "quietly", "something feels wrong", "trap", "listen" | Sneaking, suspense, pre-combat buildup |
| DOWNTIME | "long rest", "short rest", "we set up camp", "shopping", "I want to buy" | Resting, shopping, inventory management |
| AMBIENT | Low speech activity, off-topic chatter, breaks | Table chatter, bio breaks, between-scene dead air |

The classifier is a simple prompt to the local LLM (or a rules-based
keyword matcher for zero-latency operation):

```python
SCENE_CLASSIFIER_PROMPT = """
Based on this recent table conversation, classify the current scene.
Respond with EXACTLY one word from: COMBAT, COMBAT_BOSS, EXPLORATION,
SOCIAL, DRAMATIC, TENSION, DOWNTIME, AMBIENT

Conversation:
{recent_transcript_30s}
"""
```

For MVP, a keyword-based classifier avoids the LLM call entirely:

```python
COMBAT_KEYWORDS = {"attack", "damage", "hit points", "initiative",
                   "saving throw", "armor class", "rolls to hit"}
EXPLORATION_KEYWORDS = {"search", "perception", "investigate", "travel",
                        "enter", "door", "corridor", "room"}
# ... etc

def classify_scene(transcript_window: str) -> SceneState:
    text = transcript_window.lower()
    scores = {state: 0 for state in SceneState}
    for word in text.split():
        if word in COMBAT_KEYWORDS: scores[SceneState.COMBAT] += 1
        if word in EXPLORATION_KEYWORDS: scores[SceneState.EXPLORATION] += 1
        # ...
    return max(scores, key=scores.get)
```

---

## Audio Engine

### Three Tiers of Audio Integration

#### Tier 1: Built-In Player (Ships with App, Zero Setup)

The app bundles 10-15 royalty-free ambient loops (~50-80MB total).
Each loop is 3-5 minutes, designed for seamless looping.

**Bundled track list (source from royalty-free libraries like
Pixabay, Freesound, or commission from a composer):**

| Scene State | Track Name | Character |
|-------------|-----------|-----------|
| COMBAT | "Clash of Steel" | Driving percussion, urgent strings |
| COMBAT_BOSS | "The Final Stand" | Epic orchestral, heavy brass |
| EXPLORATION | "Forgotten Paths" | Gentle strings, light woodwinds |
| EXPLORATION | "The Deep Below" | Echoing drips, low drone (dungeon variant) |
| SOCIAL | "The Warm Hearth" | Lute/acoustic, tavern feel |
| SOCIAL | "Market Day" | Bustling, cheerful, outdoor |
| DRAMATIC | "Revelation" | Slow build, piano/strings, emotional |
| TENSION | "Something Stirs" | Dissonant strings, heartbeat pulse, quiet |
| DOWNTIME | "Rest by the Fire" | Soft ambient, crackling fire, calm |
| AMBIENT | "Quiet Table" | Near-silence, very soft pad (or silence) |

**Crossfade behavior:**
- Scene change triggers a 3-5 second crossfade between tracks.
- The outgoing track fades out while the incoming track fades in.
- If the scene state hasn't changed, the current track loops seamlessly.
- Rapid scene flapping (toggling between states every few seconds) is
  dampened: the engine requires a state to be stable for 10+ seconds
  before triggering a transition.

#### Tier 2: Local Music Folders (Bring Your Own Music)

The DM points to a folder of their own music files (MP3, WAV, OGG, FLAC).
Files are organized into subfolders by scene type:

```
~/dm-music/
  combat/
    battle_theme_1.mp3
    battle_theme_2.mp3
  combat_boss/
    epic_boss.mp3
  exploration/
    forest_ambience.mp3
    dungeon_crawl.mp3
  social/
    tavern_loop.mp3
  dramatic/
    emotional_reveal.mp3
  tension/
    creeping_dread.mp3
  downtime/
    campfire.mp3
```

When a scene change occurs, the engine randomly selects a track from the
appropriate subfolder (avoiding the track that just played) and crossfades.

**Settings UI for folder mapping:**

```
Music Source: ○ Built-in  ○ Local Folders  ○ Syrinscape

Local Folder Root: [ ~/dm-music                    ] [Browse]

Override Mappings (optional):
  COMBAT      → [ ~/dm-music/combat/              ] [Browse]
  COMBAT_BOSS → [ ~/dm-music/combat_boss/         ] [Browse]
  EXPLORATION → [ ~/dm-music/exploration/          ] [Browse]
  SOCIAL      → [ ~/dm-music/social/              ] [Browse]
  DRAMATIC    → [ ~/dm-music/dramatic/            ] [Browse]
  TENSION     → [ ~/dm-music/tension/             ] [Browse]
  DOWNTIME    → [ ~/dm-music/downtime/            ] [Browse]
```

#### Tier 3: Syrinscape Integration (For Subscribers)

For DMs who already use Syrinscape ($6-11/mo), the app fires Syrinscape's
3rd party integration URIs to trigger mood changes automatically.

**How Syrinscape integration works:**
1. DM enables "3rd party app integration" in Syrinscape settings.
2. DM copies URI links for their preferred moods (each mood has a URI
   like `syrinscape-fantasy:moods/d2l0Y2h3b29k/play/`).
3. In the DM Assistant settings, the DM pastes these URIs into the
   scene-to-mood mapping.
4. When the scene classifier detects a change, the app fires the
   appropriate URI, and Syrinscape switches moods automatically.

**Syrinscape settings UI:**

```
Syrinscape Integration

  COMBAT      → [ syrinscape-fantasy:moods/xxx/play/ ] [Paste]
  COMBAT_BOSS → [ syrinscape-fantasy:moods/xxx/play/ ] [Paste]
  EXPLORATION → [ syrinscape-fantasy:moods/xxx/play/ ] [Paste]
  SOCIAL      → [ syrinscape-fantasy:moods/xxx/play/ ] [Paste]
  DRAMATIC    → [ syrinscape-fantasy:moods/xxx/play/ ] [Paste]
  TENSION     → [ syrinscape-fantasy:moods/xxx/play/ ] [Paste]
  DOWNTIME    → [ syrinscape-fantasy:moods/xxx/play/ ] [Paste]

  [ ] Also trigger one-shots for panic buttons:
    ⚡ Energy Low → [ syrinscape-fantasy:oneshots/xxx/play/ ]
    📱 Phones Out → [ syrinscape-fantasy:oneshots/xxx/play/ ]
```

**Future:** If Syrinscape exposes a richer API (search, list moods),
the integration could auto-discover available moods and suggest mappings.

---

## Panic Button Audio Integration

The panic buttons already generate narrative suggestions. Adding an
audio component makes them more immersive:

| Button | Audio Action |
|--------|-------------|
| 📱 Phones Out | Play a dramatic sting (2-3 second attention-grabbing sound) followed by tension music, giving the DM a natural moment to deliver the backstory hook |
| ⚡ Energy Low | Ramp music intensity — shift from current track to a more energetic variant or the COMBAT_BOSS track |
| 🤫 Quiet Player | Subtle music dip (duck volume 50% for 10 seconds) to create a "spotlight moment" of relative quiet as the DM addresses the player |
| ⏳ Deliberation Loop | Gradually introduce tension music underneath the current track, building urgency |
| 🎭 Dead Air | Fade music to near-silence over 5 seconds, creating space for the dramatic moment to breathe |
| 💀 Too Easy | Shift to boss combat music or add intensity layer |
| 🔥 Too Hard | Soften combat music slightly, signaling a possible turning point |

---

## Audio Device Management

**Critical requirement:** The mic input and audio output MUST be on
different devices or the app will transcribe its own music, creating
a feedback loop that corrupts the transcript.

**Settings UI:**

```
Audio Devices

  Microphone Input:  [ Built-in Microphone          ▼ ] [Test]
  Music Output:      [ External Speakers             ▼ ] [Test]

  ⚠️ Input and output must be different devices to prevent
     the app from transcribing its own music.
```

**Auto-detection:** On first run, if only one audio output is available,
show a warning: "Music playback may interfere with transcription if
played through the same speakers the microphone picks up. Consider
using a separate audio output or keeping music volume low."

**Volume controls in the app:**

```
┌─── Music Volume ────────────────┐
│  Master:    ████████░░  80%     │
│  Crossfade: [ 3 ] seconds       │
│  Duck during suggestions: [✓]   │
│  Duck amount: ████░░░░░░  40%   │
└─────────────────────────────────┘
```

"Duck during suggestions" is subtle but important: when a new suggestion
card appears and the DM glances at it, dropping the music volume briefly
helps them read without distraction.

---

## BDD Scenarios

### Scene Classification

```gherkin
Feature: Scene Classification
  As a Dungeon Master
  I want the app to automatically detect what type of scene is happening
  So that the music changes appropriately without my intervention

  Background:
    Given the DM has started a session with music enabled
    And transcription is active

  Scenario: Combat detected from initiative call
    When the transcript includes "Everyone roll initiative"
    And the classifier runs on the next cycle
    Then the scene state should change to COMBAT
    And the transition should occur within 5 seconds of detection

  Scenario: Combat escalates to boss fight
    Given the scene state is COMBAT
    And the campaign context includes a planned encounter with a Wight
    When the transcript includes "The Wight steps out of the shadows"
    And the classifier runs
    Then the scene state should change to COMBAT_BOSS

  Scenario: Combat ends, transition to exploration
    Given the scene state is COMBAT
    When the transcript includes "The last skeleton crumbles to dust"
    And no combat keywords appear for 15 seconds
    Then the scene state should change to EXPLORATION

  Scenario: Social scene in a tavern
    When the transcript includes "We sit down at the bar and ask the
      innkeeper about the tomb"
    And the classifier runs
    Then the scene state should change to SOCIAL

  Scenario: Dramatic moment detected
    Given the scene state is SOCIAL
    When the transcript includes a long DM monologue with backstory
      keywords and emotional language
    And player speech drops to near-silence
    Then the scene state should change to DRAMATIC

  Scenario: Tension builds before combat
    When the transcript includes "I want to stealth past the guards"
    And "make a stealth check" appears
    And no combat keywords are present
    Then the scene state should change to TENSION

  Scenario: Scene flapping is dampened
    When the transcript rapidly alternates between combat and social
      keywords within a 10-second window
    Then the scene state should NOT change
    And the current music should continue playing
    And the classifier should wait for a stable state lasting 10+ seconds

  Scenario: Downtime detected
    When the transcript includes "We take a long rest and set up camp"
    And the next 30 seconds contain no action-oriented keywords
    Then the scene state should change to DOWNTIME

  Scenario: Off-topic chatter goes to ambient
    When the transcript consists primarily of:
      """
      Anyone want more snacks?
      Yeah let me grab some chips.
      Did you see that game last night?
      """
    And the classifier runs
    Then the scene state should change to AMBIENT
```

### Built-In Music Player

```gherkin
Feature: Built-In Adaptive Music Player
  As a Dungeon Master
  I want the app to automatically play appropriate background music
  So that the atmosphere matches the scene without manual effort

  Background:
    Given the DM has started a session
    And music source is set to "Built-in"
    And music is enabled

  Scenario: Music starts when session begins
    When the DM clicks "Start Session"
    Then ambient or exploration music should begin playing
    And the volume should match the configured master volume

  Scenario: Music changes on scene transition
    Given exploration music is currently playing
    When the scene state changes to COMBAT
    Then the exploration track should fade out over 3-5 seconds
    And a combat track should fade in simultaneously
    And the transition should sound smooth with no abrupt cut

  Scenario: Music loops seamlessly
    Given a combat track is playing
    When the track reaches its end
    Then it should loop back to the beginning without audible gap
    And there should be no silence between loops

  Scenario: Crossfade duration is configurable
    Given the crossfade setting is 5 seconds
    When a scene transition occurs
    Then the crossfade should take approximately 5 seconds

  Scenario: Same scene state does not re-trigger music
    Given combat music is playing and the scene state is COMBAT
    When the classifier confirms COMBAT on the next cycle
    Then the current combat track should continue uninterrupted
    And no crossfade should occur

  Scenario: Music volume can be adjusted during playback
    Given music is playing at 80% volume
    When the DM adjusts the volume slider to 50%
    Then the music volume should change smoothly over 0.5 seconds
    And no pop or click should be audible

  Scenario: Music can be paused without stopping the session
    Given music is playing
    When the DM clicks the music pause button
    Then the music should fade out over 2 seconds
    And transcription and suggestions should continue normally
    When the DM clicks play
    Then music appropriate to the current scene should fade in

  Scenario: DM manually overrides the automatic scene selection
    Given combat music is playing due to automatic detection
    When the DM manually selects "Dramatic" from the scene override dropdown
    Then dramatic music should crossfade in
    And automatic scene classification should pause
    And a "Return to Auto" button should be visible

  Scenario: Auto mode resumes after manual override
    Given the DM manually overrode the scene to DRAMATIC
    When the DM clicks "Return to Auto"
    Then the classifier should resume
    And music should transition to whatever the current detected scene is
```

### Local Music Folders

```gherkin
Feature: Local Music Folder Integration
  As a Dungeon Master
  I want to use my own music collection organized by scene type
  So that the adaptive music uses tracks I've personally chosen

  Background:
    Given the DM has configured local music folders
    And each scene type folder contains at least one audio file

  Scenario: Tracks are loaded from configured folders
    When the DM opens music settings
    Then each scene type should show the count of tracks found
    And a preview button should allow listening to any track

  Scenario: Random track selection avoids repetition
    Given the COMBAT folder contains 3 tracks
    When the scene changes to COMBAT three consecutive times
    Then each transition should play a different track
    And no track should repeat until all have been played

  Scenario: Missing folder handled gracefully
    Given the COMBAT_BOSS folder is empty or missing
    When the scene changes to COMBAT_BOSS
    Then the engine should fall back to the COMBAT folder
    And a subtle indicator should show "No boss tracks — using combat"

  Scenario: Unsupported audio format is skipped
    Given the EXPLORATION folder contains a .wma file
    When tracks are loaded from that folder
    Then the .wma file should be skipped
    And supported files (MP3, WAV, OGG, FLAC) should load normally

  Scenario: New files added to folders are detected
    Given the session is active
    When the DM adds a new MP3 to the SOCIAL folder
    And the DM clicks "Refresh Music Library"
    Then the new track should be available for the next scene change
```

### Syrinscape Integration

```gherkin
Feature: Syrinscape Integration
  As a Dungeon Master who uses Syrinscape
  I want the app to trigger Syrinscape mood changes automatically
  So that I get professional audio without manual soundboard management

  Background:
    Given the DM has Syrinscape running with 3rd party integration enabled
    And scene-to-mood URI mappings are configured in settings

  Scenario: Scene change triggers Syrinscape mood
    Given the COMBAT scene is mapped to a Syrinscape battle mood URI
    When the scene state changes to COMBAT
    Then the app should fire the configured Syrinscape URI
    And Syrinscape should begin playing the mapped mood

  Scenario: Syrinscape not running handled gracefully
    Given Syrinscape is not running on the system
    When a scene change triggers a URI fire
    Then the app should log a warning
    And the DM should see a subtle "Syrinscape not detected" message
    And the app should NOT crash or hang
    And subsequent scene changes should continue attempting the URI

  Scenario: Panic button triggers Syrinscape one-shot
    Given the "Phones Out" button is mapped to a Syrinscape one-shot URI
    When the DM clicks "Phones Out"
    Then the Syrinscape one-shot sound should fire
    And the suggestion should appear simultaneously

  Scenario: Invalid URI is handled gracefully
    Given a scene mapping contains an invalid Syrinscape URI
    When the scene changes to that state
    Then the app should log the error
    And music for that scene should be silently skipped
    And the DM should see a settings warning on next visit
```

### Panic Button Audio

```gherkin
Feature: Panic Button Audio Effects
  As a Dungeon Master
  I want panic buttons to include audio cues
  So that the table's attention shifts before I even speak

  Background:
    Given music is enabled and playing
    And the DM has started a session

  Scenario: Phones Out plays attention sting
    When the DM clicks the "Phones Out" panic button
    Then a short dramatic sting sound (2-3 seconds) should play
    And the current music should duck to 30% volume
    And after the sting, tension music should fade in
    And the narrative suggestion should appear simultaneously

  Scenario: Dead Air fades music to silence
    When the DM clicks the "Dead Air" panic button
    Then the current music should fade to near-silence over 5 seconds
    And the silence should hold for at least 15 seconds
    And then music should slowly fade back in at 50% volume

  Scenario: Energy Low ramps intensity
    When the DM clicks the "Energy Low" panic button
    Then the music should crossfade to COMBAT_BOSS or TENSION track
    And the volume should increase by 20%
    And after 60 seconds, it should settle back to the scene-appropriate track

  Scenario: Quiet Player creates spotlight moment
    When the DM clicks the "Quiet Player" panic button
    Then the music volume should duck to 40% for 10 seconds
    And this creates a natural audio "spotlight" for the DM
      to address the quiet player

  Scenario: Deliberation Loop builds urgency
    Given the scene state is SOCIAL or EXPLORATION
    When the DM clicks "Deliberation Loop"
    Then the music should transition to TENSION over 10 seconds
    And the volume should gradually increase by 15%
    And this creates subliminal urgency without the DM saying anything

  Scenario: Audio effects are disabled if music is off
    Given music is disabled in settings
    When the DM clicks any panic button
    Then no audio should play
    And the suggestion should appear normally without audio
```

### Audio Device Management

```gherkin
Feature: Audio Device Management
  As a Dungeon Master
  I want to control which devices handle mic input and music output
  So that the app doesn't transcribe its own music

  Scenario: Separate input and output devices
    Given the system has a built-in microphone and external speakers
    When the DM configures input as "Built-in Microphone"
    And configures output as "External Speakers"
    Then the app should use the microphone for transcription
    And play music through the external speakers
    And the transcript should not contain music lyrics or sounds

  Scenario: Warning when input and output match
    When the DM selects the same device for both input and output
    Then a warning should appear: "Using the same device for mic and
      speakers may cause the app to transcribe its own music.
      Consider using a separate audio output."
    And the DM should still be able to proceed if they choose

  Scenario: Audio device disconnected during session
    Given music is playing through an external speaker
    When the external speaker is disconnected
    Then music playback should pause gracefully
    And a notification should appear: "Music output device disconnected"
    And transcription should continue unaffected

  Scenario: Volume ducking during suggestion display
    Given "Duck during suggestions" is enabled
    And music is playing at 80%
    When a new suggestion card appears
    Then the music volume should dip to the configured duck level (e.g., 40%)
    And after 5 seconds, the volume should smoothly return to 80%
```

---

## Scene State in the Session UI

The current scene state should be visible in the app's status bar so the
DM always knows what the classifier is detecting:

```
┌─────────────────────────────────────────────────────────────┐
│  ⚔️ COMBAT  │  🖥️ Local  │  🎵 "Clash of Steel"  │  02:34:15  │
│  [Auto ▼]   │            │  ◀ ⏸ ▶  🔊━━━━━━━░░ 75%          │
└─────────────────────────────────────────────────────────────┘
```

- Scene badge with icon updates in real time
- [Auto ▼] dropdown allows manual override to any scene state
- Music track name, playback controls, and volume slider
- Session timer

---

## Implementation Priority

| Component | Priority | Effort | Dependencies |
|-----------|----------|--------|-------------|
| Scene Classifier (keyword-based) | P0 | 1 day | Transcript manager |
| Built-in Player with bundled tracks | P0 | 2 days | Scene classifier, audio playback lib |
| Crossfade engine | P0 | 1 day | Built-in player |
| Audio device selection UI | P0 | 0.5 days | Settings page |
| Panic button audio hooks | P1 | 1 day | Panic buttons, built-in player |
| Local folder mapping | P1 | 1 day | Built-in player refactored to support multiple sources |
| Volume ducking on suggestions | P1 | 0.5 days | Suggestion panel, audio engine |
| Scene state UI badge + manual override | P1 | 0.5 days | Scene classifier |
| Syrinscape URI integration | P2 | 1 day | Scene classifier, URI dispatch |
| LLM-based scene classifier (upgrade from keywords) | P2 | 0.5 days | LLM provider |

**Total for MVP (P0):** ~4.5 days, added to Week 3 of the build plan.

---

## Music Licensing Notes

For the bundled tracks, options include:

1. **Commission a composer** — $200-500 for 10-15 loops. You own it outright.
   Several TTRPG-focused composers on Fiverr/Upwork would jump at this.
2. **Royalty-free libraries** — Pixabay, Freesound (CC0), or Incompetech
   (Kevin MacLeod, CC BY). Free but requires attribution.
3. **Community contribution** — After launch, invite composers to submit
   tracks. Creates a content ecosystem similar to Foundry's module system.

For the MVP, option 2 (royalty-free with attribution) gets you to launch
with zero cost. Option 1 is a worthwhile v1.1 investment if the product
gains traction — original music that becomes associated with the app is
a subtle brand differentiator.
