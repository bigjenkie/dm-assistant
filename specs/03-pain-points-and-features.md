# DM Assistant — Pain Point Research & New Feature Concepts

## Part 1: Community Pain Points (Reddit, D&D Beyond, EN World, SlyFlourish)

Sourced from r/DMAcademy, r/DnDBehindTheScreen, D&D Beyond DM forums, SlyFlourish,
The Angry GM, The DM Lair, Gnome Stew, and related DM communities.

### Tier 1: Universal Problems (Nearly Every DM Hits These)

**1. Players on their phones / zoned out**
The single most discussed DM frustration. Not just rude players — often it's
a symptom that the current scene doesn't involve that player's character. DMs
describe feeling personally hurt after spending hours prepping, only to see
players watching YouTube. The community consensus: don't ban phones, make the
game more engaging than the phone. Pull distracted players in by name, give
them something specific to do, connect the scene to their character.

**2. Forgetting their own NPCs, plot hooks, and lore**
DMs routinely describe forgetting NPC names they made up on the fly, losing
track of promises the party made, contradicting their own established lore,
or blanking on what happened last session. One EN World poster: "I don't write
anything down... then during the game I forget about the NPC until after."
Another described panic-inventing lore that contradicted things the players
already knew.

**3. Pacing — sessions that drag or blow through content**
The #1 technical skill DMs say they struggle with. Manifests as: combat that
runs 60+ minutes and loses everyone, exploration/social scenes that stall out,
players deliberating for 20+ minutes without taking action, or blowing through
4 sessions of prep in 90 minutes. DMs describe being unable to predict how
long scenes will take. SlyFlourish recommends hourly timers and watching body
language — exactly the kind of thing an AI copilot could automate.

**4. One player dominates / quiet player gets ignored**
In groups of 4-6, one or two extroverted players often command the spotlight
while quieter players fade. DMs describe wanting to include everyone but
losing track of who hasn't spoken in a while during complex scenes. Forum
advice: track "spotlight time" mentally, but DMs admit they forget to do this
in the moment.

**5. Incorporating character backstories into the main plot**
Universally described as "the hardest and most rewarding part of DMing."
DMs receive backstories from players but struggle to weave them into an
ongoing narrative — especially when running published modules. Common failure
mode: the backstory sits in a Google Doc and never comes up in play. Players
eventually stop caring about their own backstory because it never mattered.
D&D Beyond forums show this as a perennial topic with hundreds of replies.

**6. Improvising when players go off-script**
Players are unpredictable. They ignore the quest, befriend the villain, adopt
the monster, or fixate on a throwaway NPC. DMs need names, personalities,
locations, and plot hooks in seconds. The DM who can't improv freezes, breaks
immersion, or says "let me check my notes" (which is the same thing). Reddit
is full of stories of DMs who panicked and made something up that contradicted
established canon.

### Tier 2: Frequent Problems (Experienced DMs Still Struggle)

**7. Rules lookup killing momentum**
"Can I grapple while prone?" "What happens if I counterspell a counterspell?"
Even experienced DMs can't memorize every rule. The 10-second pause to check
a book becomes a 3-minute disruption. Players start checking phones during
the lookup. Flow is destroyed.

**8. NPC consistency across sessions**
"What voice did I give the innkeeper?" "Did I say the mayor was male or
female?" After weeks between sessions, DMs lose track of details they
improvised. Players remember better than the DM does and call out
inconsistencies, which breaks immersion.

**9. Player absence derails backstory content**
DMs plan a scene tied to a character's backstory, then that player cancels.
Now the DM has to restructure the session on the fly. Community advice: never
make a session depend on one player, but this directly conflicts with the goal
of making backstories matter.

**10. Analysis paralysis / party deliberation loops**
The party spends 30+ minutes debating whether to go left or right. No new
information is being generated. The DM sits idle. Energy drains from the room.
Experienced DMs learn to interrupt with "something happens" but new DMs let
it spiral.

**11. Balancing encounters on the fly**
The encounter is too easy or too hard. DMs need to adjust HP, add/remove
enemies, or change tactics mid-combat without the players noticing. Requires
quick math and tactical thinking while also narrating.

### Tier 3: Subtle Problems (The "Secret Sauce" Layer)

**12. Not knowing when a player is having a bad time**
Some players don't speak up when they're bored or frustrated. They just
gradually disengage. The DM doesn't notice because they're focused on the
active players. By the time it's obvious, the player has mentally checked out.

**13. Transition fatigue**
The awkward moment between scenes: "Okay, so... you travel for two days...
nothing happens... you arrive at the city." DMs struggle to make transitions
feel natural without either boring the players or skipping content they
actually wanted to engage with.

**14. Emotional pacing mismatch**
A dramatic NPC death followed immediately by a goofy shopping scene. DMs
struggle to read the emotional temperature of the room and match it. The
players want to sit in the grief for a moment but the DM pushes forward.

**15. The "what do you do?" dead air**
After delivering a dramatic scene, the DM asks "what do you do?" and gets
silence. Players don't know how to react. The DM interprets silence as
failure. In reality, the players just need a prompt or a more specific
question.

---

## Part 2: Two New Feature Concepts

### Feature A: Character Backstory Integration ("Backstory Weaver")

**Concept**: The DM enters each player character's backstory, personality
traits, bonds, flaws, and goals as part of the campaign context. The
suggestion engine then uses this information to:

1. Suggest moments to connect the current scene to a character's backstory
2. Propose side quests or tangents rooted in a character's personal history
3. Identify when a character hasn't been in the spotlight recently and
   suggest a way to involve them
4. Suggest NPC callbacks to backstory elements (e.g., "This merchant could
   be from Vex's hometown — opportunity to drop lore about her family")

**Why this is the secret sauce**: Every DM advice column says "incorporate
backstories." Nobody has built a tool that actually helps you do it in real
time. The DM has the backstories in a doc somewhere, but during play, their
brain is consumed with running the encounter. An AI that monitors the
conversation and says "Hey — this scene is perfect for connecting to Drogan's
dead brother" is doing something no existing tool does.

### Feature B: DM Panic Buttons ("Situation Hotkeys")

**Concept**: A persistent toolbar of common DM problems that can be activated
with one click. Each button sends a specific prompt to the suggestion engine
that generates an immediate, contextual response using the current transcript
and campaign context (including character backstories).

**Proposed buttons:**

| Button | Label | What it does |
|--------|-------|-------------|
| 📱 | Phones Out | Generates a suggestion to re-engage distracted players. Uses character backstories to create a personal hook. e.g., "Drogan — you notice a symbol on the wall identical to the one your brother wore. What do you do?" |
| 🤫 | Quiet Player | Identifies which player character has been least active in the recent transcript. Generates a character-specific prompt to pull them in. |
| ⏳ | Deliberation Loop | Party has been talking in circles. Generates an interruption event: a noise, an NPC arrival, a timer/threat that forces a decision. Contextual to current location and situation. |
| 💀 | Too Easy | Combat is trivially easy. Suggests ways to escalate: reinforcements, environmental hazard, enemy tactic change. Uses current encounter context. |
| 🔥 | Too Hard | Combat is going badly. Suggests ways to give the party a break: enemy morale break, environmental advantage, NPC intervention, enemy makes a mistake. |
| 🎭 | Dead Air | Players don't know what to do next. Generates a specific prompt or NPC action that gives them something concrete to react to. |
| 🗺️ | Off Script | Party went somewhere unexpected. Generates a quick location, NPC, and hook for wherever they just went. |
| ⚡ | Energy Low | General energy is down. Suggests a high-energy beat: a sudden event, a twist, a revelation, a callback to something exciting. |
| 🎲 | Need an NPC | Quick-generate a name, personality, and 1-2 details for an NPC the DM needs right now. |
| 📜 | Recap | Generate a "previously on..." summary of the session so far, useful for post-break reorientation. |

**Why this is powerful**: These buttons encode *decades of DM advice* into
one-click actions. Every tip in every Reddit thread about distracted players
boils down to "make the game personal to that player's character." Our app
knows the characters. It knows the backstories. It knows who's been quiet.
It can generate exactly the kind of targeted intervention that veteran DMs
do instinctively but new DMs struggle with.

The "Phones Out" button is the killer feature. DM hits one button.
The app figures out which player has been least engaged, pulls from their
backstory, and suggests a specific, personalized narrative hook. That's
the kind of thing a DM would need years of experience to do instinctively.

---

## Part 3: BDD Scenarios

### Feature A: Character Backstory Integration

```gherkin
Feature: Character Backstory Integration
  As a Dungeon Master
  I want the assistant to weave character backstories into its suggestions
  So that every player feels personally connected to the story

  Background:
    Given the DM has started a session with the following character backstories:
      """
      Vex (Half-Elf Ranger):
        Background: Outlander. Grew up in the village of Ashenmere, which was
        destroyed by a black dragon named Scorrath when she was 12. Her mother
        Lyra was killed. Her father Aldric survived but became a recluse.
        Bond: Vex carries her mother's broken amulet and seeks to avenge her.
        Flaw: Freezes up around draconic creatures due to trauma.
        Goal: Find and kill Scorrath.

      Drogan (Dwarf Cleric):
        Background: Acolyte of Moradin. His brother Borik was a paladin who
        went missing investigating a cult called the Ashen Hand three years ago.
        Bond: Drogan carries Borik's holy symbol and prays for his return.
        Flaw: Refuses to leave anyone behind, even at great personal risk.
        Goal: Find out what happened to Borik.

      Sable (Tiefling Warlock):
        Background: Charlatan. Made her pact with a mysterious patron called
        The Whisper after being betrayed by her former thieves guild, the
        Violet Fang, in the city of Greyport. The guild leader, Maren,
        sold Sable out to the city guard.
        Bond: Sable trusts no organization or authority.
        Flaw: Lies reflexively, even when the truth would be easier.
        Goal: Discover the true identity of The Whisper.
      """
    And transcription is active

  Scenario: Scene naturally connects to a character's backstory
    When the transcript includes the DM describing "You find a shattered amulet
      on the body of the dead traveler"
    And the next suggestion cycle runs
    Then a suggestion should appear noting the parallel to Vex's mother's broken amulet
    And it should suggest the DM offer Vex a moment to react personally
    And the suggestion should reference Vex's bond: "carries her mother's broken amulet"

  Scenario: Encounter connects to a backstory enemy
    When the DM describes cultists wearing ash-colored robes
    And the next suggestion cycle runs
    Then a suggestion should flag the possible connection to the Ashen Hand cult
    And it should note this is relevant to Drogan's missing brother Borik
    And it should suggest giving Drogan an opportunity to recognize the cult symbols

  Scenario: NPC from a backstory could plausibly appear
    Given the party is traveling through a large trade city
    When the transcript includes discussion about visiting the thieves quarter
    And the next suggestion cycle runs
    Then a suggestion may propose introducing a contact from the Violet Fang
    And it should note this connects to Sable's backstory
    And it should include a caveat: "Sable's player may or may not want to engage
      with this — gauge their interest"

  Scenario: Suggest a side quest rooted in a character's goal
    Given the main quest does not involve dragons
    When the transcript includes an NPC mentioning "dragon sightings to the north"
    And the next suggestion cycle runs
    Then a suggestion should flag this as a potential hook for Vex's goal
    And it should propose a brief side quest: investigate the sighting, which
      may or may not connect to Scorrath
    And the suggestion should note "This gives Vex personal stakes without
      derailing the main quest"

  Scenario: Character flaw becomes relevant
    When the party encounters a young dragon or drake in combat
    And the next suggestion cycle runs
    Then a suggestion should remind the DM of Vex's flaw: "freezes up around
      draconic creatures due to trauma"
    And it should suggest offering Vex a Wisdom save or roleplaying moment
    And it should NOT dictate how the DM handles it, only surface the flaw

  Scenario: Backstory connection is suggested but not forced
    When a backstory-related suggestion is generated
    Then the suggestion should always be framed as an opportunity, not a directive
    And it should include phrasing like "if appropriate" or "optional hook"
    And it should never assume the DM will use it

  Scenario: Backstory suggestions do not spoil DM secrets
    Given the DM has noted in the campaign context that Drogan's brother Borik
      is alive but has joined the Ashen Hand cult
    When a backstory suggestion about Drogan is generated
    Then the suggestion may reference this DM secret to help the DM plan
    And it should be labeled "DM ONLY"
    And it should never be phrased in a way that assumes the players know
```

### Feature B: DM Panic Buttons

```gherkin
Feature: DM Panic Buttons
  As a Dungeon Master
  I want one-click buttons for common session problems
  So that I can get immediate, contextual help without typing a question

  Background:
    Given the DM has started a session with campaign context and character backstories
    And transcription is active
    And the panic button toolbar is visible

  # --- PHONES OUT / PLAYER DISENGAGEMENT ---

  Scenario: Phones Out button targets the least-active player
    Given the transcript shows that Vex and Drogan have been speaking frequently
    But Sable has not spoken in the last 10 minutes of transcript
    When the DM clicks the "Phones Out" button
    Then the suggestion should identify Sable as the least-active character
    And it should generate a narrative hook specific to Sable's backstory
    And the hook should be something the DM can say immediately at the table
    And it should be delivered within 5 seconds

  Scenario: Phones Out generates a backstory-rooted hook
    Given Sable has been quiet for 10+ minutes
    And the party is currently in a tavern
    When the DM clicks "Phones Out"
    Then the suggestion might propose something like:
      """
      Sable — you notice a woman at the bar with a violet
      tattoo on her wrist. It's a mark of the Violet Fang.
      She seems to be watching your group. What do you do?
      """
    And the suggestion should draw from Sable's backstory (Violet Fang guild)
    And it should require the player to respond, pulling them back in

  Scenario: Phones Out with no backstory available
    Given the DM did not enter backstories for the characters
    When the DM clicks "Phones Out"
    Then the suggestion should still identify the least-active player by name
    And it should generate a generic engagement hook:
      """
      [Least active player's character], make a Perception check.
      You notice something the others missed.
      """

  Scenario: Phones Out does not always target the same player
    Given the DM has clicked "Phones Out" targeting Sable in the last 15 minutes
    And Sable has since become active in the transcript
    But Vex has gone quiet
    When the DM clicks "Phones Out" again
    Then the suggestion should target Vex, not Sable

  # --- QUIET PLAYER ---

  Scenario: Quiet Player identifies who needs spotlight time
    When the DM clicks the "Quiet Player" button
    Then the suggestion should analyze the transcript for the current session
    And it should rank characters by speaking frequency
    And it should identify the character with the least dialogue
    And it should suggest a character-specific prompt to involve them

  Scenario: Quiet Player in combat
    Given the party is in combat
    And Drogan has only been saying "I attack" on his turns
    When the DM clicks "Quiet Player"
    Then the suggestion should note Drogan's minimal engagement
    And it should suggest a combat moment that leverages his abilities:
      """
      The cultist calls out to a dark god — Drogan, as a cleric of
      Moradin, you recognize this prayer. It's a ritual of binding.
      What does Drogan do?
      """

  # --- DELIBERATION LOOP ---

  Scenario: Break a party deliberation loop
    Given the transcript shows the party has been discussing the same topic
      for 15+ minutes without taking action
    When the DM clicks "Deliberation Loop"
    Then the suggestion should generate an interruption event contextual to
      the current scene
    And the event should force a decision or create urgency
    And it might suggest something like:
      """
      A scout bursts through the tavern door, bloodied:
      "They're coming — the cult is marching on the village.
      You have maybe an hour."
      """

  Scenario: Deliberation Loop adapts to location
    Given the party is in a dungeon corridor deliberating
    When the DM clicks "Deliberation Loop"
    Then the interruption event should be dungeon-appropriate:
      | possible events                              |
      | A distant rumble — something is coming        |
      | Torches begin to flicker and dim              |
      | A locked door behind them clicks open on its own |
    And it should NOT suggest a tavern scene or outdoor event

  # --- COMBAT DIFFICULTY ---

  Scenario: Too Easy escalation
    Given the party is in combat and winning decisively
    When the DM clicks "Too Easy"
    Then the suggestion should offer escalation options:
      | option                                          |
      | Reinforcements arrive (suggest quantity and type) |
      | Environmental hazard activates                    |
      | Enemy uses a previously-unused ability            |
      | Enemy calls for parley, adding social complexity  |
    And the options should be contextual to the current encounter

  Scenario: Too Hard de-escalation
    Given the party is in combat and losing badly
    When the DM clicks "Too Hard"
    Then the suggestion should offer mercy mechanics:
      | option                                           |
      | Enemy morale breaks — some flee                   |
      | Environmental advantage appears for the party     |
      | An NPC ally intervenes                            |
      | The enemy offers surrender terms                  |
    And no option should feel like a deus ex machina — all should have
      narrative justification

  # --- DEAD AIR ---

  Scenario: Break dead air after a dramatic moment
    Given the DM just delivered a dramatic narrative beat
    And the players have not responded for 30+ seconds
    When the DM clicks "Dead Air"
    Then the suggestion should offer a specific follow-up prompt:
      """
      Instead of "What do you do?", try:
      "Drogan, you're standing closest to the body. What's going
      through your mind right now?"
      """
    And the prompt should target a specific character rather than the group
    And it should be emotionally appropriate to the preceding scene

  # --- OFF SCRIPT ---

  Scenario: Party goes somewhere unplanned
    Given the campaign context does not include a harbor district
    When the transcript includes "Let's go check out the docks"
    And the DM clicks "Off Script"
    Then the suggestion should generate:
      | element      | content                                   |
      | Location     | Brief harbor district description          |
      | NPC          | A dockworker or harbormaster with name/personality |
      | Hook         | One interesting thing happening there       |
      | Connection   | Tie to campaign context or backstory if possible |

  # --- ENERGY LOW ---

  Scenario: Inject energy into a flagging session
    When the DM clicks "Energy Low"
    Then the suggestion should generate a high-energy narrative beat:
      | possible beats                                          |
      | A sudden attack or ambush                                |
      | An explosion, collapse, or dramatic environmental event  |
      | A shocking NPC revelation                                |
      | A callback to an unresolved plot hook with new urgency   |
    And the beat should be appropriate to the current scene context
    And it should be something the DM can deliver in 1-2 sentences

  # --- NEED AN NPC ---

  Scenario: Quick NPC generation
    When the DM clicks "Need an NPC"
    Then a suggestion should appear within 3 seconds containing:
      | element       | format                                  |
      | Name          | Setting-appropriate                      |
      | Race/Gender   | Brief                                    |
      | Personality   | 2-3 words (e.g., "gruff but fair")       |
      | Quirk         | One memorable detail                     |
      | Knowledge     | One thing they know relevant to the scene |
    And the NPC should be tonally consistent with the campaign context

  # --- RECAP ---

  Scenario: Mid-session recap after a break
    Given the session has been running for 90+ minutes
    When the DM clicks "Recap"
    Then a suggestion should appear summarizing the session so far:
      | content                                  |
      | Key events in chronological order          |
      | Decisions the party made                   |
      | NPCs encountered                           |
      | Current situation and location             |
    And the recap should be concise (under 150 words)
    And it should be phrased for the DM to read aloud to the table
```

### Cross-Cutting: Backstory + Panic Button Integration

```gherkin
Feature: Backstory-Aware Panic Buttons
  As a Dungeon Master
  I want the panic buttons to leverage character backstories
  So that every intervention feels personal and deepens the story

  Scenario: Every player-targeting panic button considers backstory
    When the DM clicks any button that targets a specific player character
      (Phones Out, Quiet Player, Dead Air)
    Then the generated suggestion should prefer a backstory-rooted hook
      over a generic one
    And if no relevant backstory connection exists for the current scene,
      it should fall back to a class/ability-based hook
    And if neither is available, it should use a generic engagement prompt

  Scenario: Panic button suggestions don't repeat the same backstory hook
    Given the DM clicked "Phones Out" targeting Sable and got a Violet Fang hook
    When the DM clicks "Phones Out" targeting Sable again within the same session
    Then the suggestion should use a different backstory element (e.g., The Whisper patron)
    And it should not repeat the Violet Fang hook

  Scenario: Backstory hooks escalate across sessions
    Given this is the third session where Drogan's brother has been referenced
    When a backstory suggestion about Borik is generated
    Then the intensity of the hook should escalate compared to previous suggestions
    And it should feel like a developing storyline, not a repetitive reminder

  Scenario: Panic buttons work without backstories
    Given the DM has not entered any character backstories
    When the DM clicks any panic button
    Then the button should still function using general DM techniques
    And the suggestion quality should be useful, just less personalized
    And a subtle prompt should suggest "Add character backstories for
      more personalized suggestions"
```

---

## Summary: The Competitive Moat

| Existing Tools Do | Our App Does |
|-------------------|-------------|
| Transcribe and summarize after the session | Transcribe and act on it in real time |
| Track NPCs, locations, items | Surface them proactively when mentioned |
| Store campaign data | Use campaign data + backstories to generate personalized hooks |
| Nothing for real-time DM problems | One-click panic buttons for common session issues |
| Nothing for player engagement | Detect quiet/disengaged players and suggest backstory-rooted interventions |
| Nothing for pacing | Monitor pacing and nudge the DM |

The backstory weaver + panic buttons together solve the two hardest
problems every DM faces: making every player feel like the story is about
them, and knowing what to do when the session is going sideways. No
existing product touches either of these.
