# DM Assistant — Suggestion Engine BDD Scenarios

## Design Philosophy

The suggestion engine is the product. Everything else is plumbing to support it.

A good suggestion is:
- **Timely** — appears within one suggestion cycle of the triggering conversation
- **Concise** — scannable in 2-3 seconds while the DM is talking
- **Grounded** — references the DM's own campaign context, not generic advice
- **Non-obvious** — surfaces something the DM might have forgotten, not something they clearly already know
- **Silent when unneeded** — no suggestion is better than a bad suggestion

Suggestion categories (in priority order):
1. NPC / Entity Recall
2. Rules Clarification
3. Plot Thread & Promise Reminders
4. Monster / Enemy Stat Surfacing
5. Spell & Ability Details
6. Improvisation Support
7. Session Pacing

---

## Category 1: NPC & Entity Recall

When an NPC, location, faction, or item from the campaign context is mentioned
at the table, the assistant surfaces the DM's own notes about that entity.

```gherkin
Feature: NPC and Entity Recall Suggestions
  As a Dungeon Master
  I want the assistant to surface my notes about NPCs and entities when they come up in conversation
  So that I can stay consistent without flipping through my notes

  Background:
    Given the DM has started a session with the following campaign context:
      """
      NPCs:
      - Mayor Hild: Female human, mid-50s. Quest giver. Secretly working with the Hollow King
        under duress — her son is held hostage. Nervous demeanor, fidgets with a silver ring.
        Offered the party 500gp to retrieve the Ashen Crown.
      - Oldroot: Ancient treant in the Bleakwood. Neutral but territorial. Speaks in slow,
        rumbling sentences. Sable promised to return a stolen seedling to him. Knows a secret
        path to the Tomb of Kael but will only share it if the promise is kept.
      - Reva the Red: Tiefling fence in the market district. Buys and sells without questions.
        Has a pet pseudodragon named Cinder. Owes Drogan a favor from a past adventure.
      - Captain Thane: Guard captain. Lawful, suspicious of adventurers. Has been asking
        questions about the party since they arrived in town.

      Locations:
      - The Charred Flagon: Tavern where the party is staying. Barkeep is a half-orc named Gruul.
        Rumors circulate here. Back room is used for illegal card games.
      - Tomb of Kael: Destination. Ancient burial site. Rumored to be trapped and guarded by undead.
        Entrance is hidden behind a waterfall in the Bleakwood.

      Items:
      - The Ashen Crown: Artifact. Grants resistance to necrotic damage and can cast Speak With Dead
        once per day. Cursed — attuning to it gives the Hollow King a psychic link to the wearer.
      """

  Scenario: Player mentions an NPC by name
    When the transcript includes "We should go find Reva and sell this stuff"
    And the next suggestion cycle runs
    Then a suggestion card should appear with the heading "Reva the Red"
    And it should include that she is a tiefling fence in the market district
    And it should include that she has a pet pseudodragon named Cinder
    And it should include that she owes Drogan a favor

  Scenario: DM mentions an NPC by name while narrating
    When the transcript includes "As you approach the town gate, you see Captain Thane waiting"
    And the next suggestion cycle runs
    Then a suggestion card should appear with the heading "Captain Thane"
    And it should include that he is lawful and suspicious of adventurers
    And it should include that he has been asking questions about the party

  Scenario: NPC referenced indirectly without using their name
    When the transcript includes "Let's go talk to that lady who gave us the job"
    And the next suggestion cycle runs
    Then a suggestion card should appear with the heading "Mayor Hild"
    And it should include her key details including the quest and payment amount

  Scenario: NPC referenced with a partial or mispronounced name
    When the transcript includes "What about that tree guy, Oldroot or whatever"
    And the next suggestion cycle runs
    Then a suggestion card should appear with the heading "Oldroot"
    And it should include his key details

  Scenario: Location mentioned by name
    When the transcript includes "Let's head back to the Charred Flagon for the night"
    And the next suggestion cycle runs
    Then a suggestion card should appear with the heading "The Charred Flagon"
    And it should include that the barkeep is Gruul
    And it should include the detail about rumors and the back room card games

  Scenario: Item mentioned by name surfaces its properties
    When the transcript includes "So this Ashen Crown thing, what do we know about it?"
    And the next suggestion cycle runs
    Then a suggestion card should appear with the heading "The Ashen Crown"
    And it should include its mechanical properties (necrotic resistance, Speak With Dead)
    And it should include the curse detail about the Hollow King's psychic link

  Scenario: NPC's secret information is surfaced only to the DM
    When the transcript includes "I want to use Insight on Mayor Hild, does she seem trustworthy?"
    And the next suggestion cycle runs
    Then a suggestion card should appear with the heading "Mayor Hild — DM Notes"
    And it should include that she is secretly working with the Hollow King under duress
    And it should include that her son is held hostage
    And it should include her nervous demeanor and ring-fidgeting tell

  Scenario: Multiple entities mentioned in a single exchange
    When the transcript includes the following exchange:
      """
      DM: You arrive at the Charred Flagon. Gruul nods as you walk in.
      Player: Is Reva here? I want to sell the gems before we head to the tomb.
      """
    And the next suggestion cycle runs
    Then suggestion cards should appear for both "Reva the Red" and "Tomb of Kael"
    And the suggestions should be ordered by relevance to the most recent utterance

  Scenario: Entity mentioned that is NOT in campaign context
    When the transcript includes "I want to find a blacksmith to repair my armor"
    And the next suggestion cycle runs
    Then the suggestion should NOT attempt to recall notes about a blacksmith
    And the suggestion may optionally offer a quick improvisation prompt for a blacksmith NPC

  Scenario: Same NPC mentioned again shortly after a previous suggestion
    Given a suggestion card for "Mayor Hild" was generated 2 minutes ago
    When the transcript includes another reference to Mayor Hild
    And the next suggestion cycle runs
    Then no duplicate suggestion card for Mayor Hild should be generated
    And the suppression window should be at least 5 minutes for repeated entities
```

---

## Category 2: Rules Clarification

When the conversation at the table involves a rules question or an action
whose mechanics are non-trivial, the assistant surfaces the relevant rule.

```gherkin
Feature: Rules Clarification Suggestions
  As a Dungeon Master
  I want the assistant to surface relevant rules when mechanical questions arise at the table
  So that I can adjudicate quickly and correctly without stopping to look things up

  Background:
    Given the DM has started a session with the following campaign context:
      """
      System: D&D 5e (2014)
      House rules:
      - Critical hits do max damage + roll (not double dice)
      - Healing potions can be consumed as a bonus action
      - Flanking grants +2 to hit (not advantage)
      - We use encumbrance rules (Str x 15 carrying capacity)
      """
    And transcription is active

  Scenario: Player attempts a grapple
    When the transcript includes "I want to grapple the cultist"
    And the next suggestion cycle runs
    Then a suggestion should surface the grappling rules:
      | detail                                                        |
      | Grapple replaces one attack in the Attack action              |
      | Contested check: Athletics vs Athletics or Acrobatics         |
      | Target must be no more than one size larger                   |
      | Grappled condition: speed becomes 0                           |

  Scenario: Player asks about opportunity attacks
    When the transcript includes "Do I get an opportunity attack if he stands up from prone?"
    And the next suggestion cycle runs
    Then a suggestion should clarify that standing from prone does not provoke opportunity attacks
    And it should note that opportunity attacks are triggered by leaving reach using movement

  Scenario: DM needs to adjudicate falling damage
    When the transcript includes "I push him off the ledge, it's like 40 feet"
    And the next suggestion cycle runs
    Then a suggestion should surface falling damage rules (1d6 per 10 feet, max 20d6)
    And it should note 40 feet = 4d6 bludgeoning damage

  Scenario: House rule takes precedence over standard rules
    When the transcript includes "I rolled a nat 20 on my greataxe attack"
    And the next suggestion cycle runs
    Then the suggestion should reference the house rule: "max damage + roll"
    And it should NOT describe the standard PHB critical hit rules (double dice)
    And it should calculate the example: greataxe = 12 + 1d12 + modifier

  Scenario: Player uses healing potion in combat
    When the transcript includes "I want to drink a healing potion"
    And the next suggestion cycle runs
    Then the suggestion should note the house rule: "bonus action to drink"
    And it should include standard healing potion value (2d4+2 HP)

  Scenario: Obscure rule interaction
    When the transcript includes "Can I cast a bonus action spell and a regular spell in the same turn?"
    And the next suggestion cycle runs
    Then the suggestion should explain the bonus action spellcasting restriction:
      | detail                                                              |
      | If you cast a spell as a bonus action, any other spell that turn must be a cantrip |
      | This applies even if you have Action Surge                          |

  Scenario: Rule suggestion is not generated for obvious actions
    When the transcript includes "I attack the goblin with my sword"
    And the next suggestion cycle runs
    Then no rules clarification suggestion should be generated
    And the assistant should recognize this as a routine action not requiring rules help

  Scenario: Contested skill check guidance
    When the transcript includes "I try to sneak past the guard while Drogan distracts him"
    And the next suggestion cycle runs
    Then the suggestion should outline the applicable checks:
      | character | check                    |
      | Sneaker   | Stealth vs Perception    |
      | Drogan    | Deception or Performance |
    And it should note relevant modifiers if available from campaign context
```

---

## Category 3: Plot Thread and Promise Reminders

When conversation touches on unresolved plot hooks, promises the party made,
or quest objectives, the assistant reminds the DM of relevant loose threads.

```gherkin
Feature: Plot Thread and Promise Reminders
  As a Dungeon Master
  I want to be reminded of unresolved plot threads when they become relevant in conversation
  So that I maintain narrative consistency and reward players for remembering

  Background:
    Given the DM has started a session with the following campaign context:
      """
      Unresolved plot hooks:
      - Sable promised Oldroot she would return the stolen seedling (Session 4)
      - The party found a coded letter on a dead courier but hasn't decoded it (Session 5)
      - Captain Thane is investigating the party — he spoke to the innkeeper about them (Session 6)
      - Mayor Hild's son is being held hostage by the Hollow King (party does not know this yet)
      - Reva mentioned a "shipment from the coast" arriving in 3 days — party showed interest but
        did not follow up (Session 6)

      Current quest: Retrieve the Ashen Crown from the Tomb of Kael for Mayor Hild (500gp reward)
      """

  Scenario: Player references an unresolved promise
    When the transcript includes "Sable, didn't you say something to that tree?"
    And the next suggestion cycle runs
    Then a suggestion should appear reminding the DM:
      | detail                                                          |
      | Sable promised Oldroot to return the stolen seedling (Session 4) |
      | Oldroot knows a secret path to the Tomb but requires the promise kept first |

  Scenario: Conversation drifts near an unresolved hook without directly referencing it
    When the transcript includes "Before we leave town, should we check the market?"
    And the next suggestion cycle runs
    Then a suggestion may appear noting that Reva's "shipment from the coast" is due soon
    And it should frame this as an optional hook, not a directive

  Scenario: Party discusses the main quest objective
    When the transcript includes "Okay let's review, we need to get this crown from the tomb"
    And the next suggestion cycle runs
    Then a suggestion should provide a brief status summary:
      | detail                                                       |
      | Quest: Retrieve the Ashen Crown for Mayor Hild (500gp)       |
      | Tomb entrance: hidden behind waterfall in the Bleakwood       |
      | Oldroot knows a secret path but the seedling promise is unresolved |

  Scenario: Undiscovered secret is NOT revealed to the table
    When the transcript includes "Do we trust Mayor Hild?"
    And the next suggestion cycle runs
    Then the suggestion should remind the DM that Hild is working under duress
    And the suggestion should be clearly labeled as DM-only information
    And the suggestion should NOT assume the party knows about the hostage son

  Scenario: Player brings up an item they haven't investigated
    When the transcript includes "Wait we still have that letter we found on the dead guy"
    And the next suggestion cycle runs
    Then a suggestion should appear noting:
      | detail                                                       |
      | Coded letter found on dead courier (Session 5)                |
      | Party has not decoded it yet                                  |
    And it may suggest possible decoding approaches (Intelligence check DC, cipher type)

  Scenario: No plot thread reminder when conversation is purely tactical
    When the transcript consists of combat narration:
      """
      I move 30 feet and attack the skeleton.
      That's a 19 to hit.
      Roll damage.
      8 slashing damage.
      """
    And the next suggestion cycle runs
    Then no plot thread reminders should be generated
```

---

## Category 4: Monster and Enemy Stat Surfacing

When combat begins or enemies are discussed, the assistant surfaces
relevant stat blocks and tactical notes.

```gherkin
Feature: Monster and Enemy Stat Surfacing
  As a Dungeon Master
  I want monster stats surfaced when combat starts or enemies are discussed
  So that I can run encounters smoothly without referencing the Monster Manual

  Background:
    Given the DM has started a session with the following campaign context:
      """
      Planned encounters:
      - Tomb entrance: 4 Skeletons (AC 13, HP 13, +4 to hit, 1d6+2 slashing)
        Vulnerable to bludgeoning. Immune to poison and exhaustion.
      - Tomb inner chamber: 1 Wight (AC 14, HP 45, +4 to hit, Longsword 1d10+2 or
        Life Drain 1d6+2 necrotic + DC 13 Con save or max HP reduced).
        Sunlight sensitivity. Commands the skeletons.
      - Optional: Swarm of Bats if party disturbs the ceiling (AC 12, HP 22,
        half damage from slashing/piercing)

      Monster notes:
      - Skeletons fight mechanically, no tactics.
      - The Wight is intelligent. It will use Life Drain on the lowest-AC target and
        retreat behind skeletons when below half HP.
      """

  Scenario: DM initiates combat with planned enemies
    When the transcript includes "As you enter the tomb, four skeletons rise from the alcoves. Roll initiative."
    And the next suggestion cycle runs
    Then a suggestion card should appear with the heading "Skeleton (x4)"
    And it should include AC 13, HP 13, attack bonus +4, damage 1d6+2 slashing
    And it should include vulnerability to bludgeoning and poison immunity

  Scenario: Player asks about enemy weakness mid-combat
    When the transcript includes "Are skeletons weak to anything?"
    And the next suggestion cycle runs
    Then the suggestion should surface the bludgeoning vulnerability
    And the DM can decide whether to share this with the player

  Scenario: Tougher enemy enters the fight
    When the transcript includes "A pale armored figure steps out of the shadows behind the skeletons"
    And the next suggestion cycle runs
    Then a suggestion card should appear with the heading "Wight"
    And it should include full stat information including Life Drain and its DC
    And it should include the DM's tactical notes about targeting and retreat behavior

  Scenario: DM's tactical notes are surfaced as combat progresses
    Given a suggestion for the Wight's stats was shown at the start of combat
    When the transcript includes "That brings the Wight down to 20 hit points"
    And the next suggestion cycle runs
    Then a suggestion should remind the DM of the retreat tactic: "retreats behind skeletons below half HP"

  Scenario: Unplanned enemy comes up in improvisation
    When the transcript includes "You hear wolves howling in the forest around you"
    And the campaign context does not include wolves
    Then the suggestion may offer basic Wolf stats from the SRD:
      | stat         | value            |
      | AC           | 13 (natural)     |
      | HP           | 11 (2d8+2)       |
      | Speed        | 40 ft            |
      | Bite         | +4, 2d4+2        |
      | Pack Tactics | advantage if ally within 5ft |
    And the suggestion should be labeled as "SRD Reference" to distinguish from campaign notes

  Scenario: Monster stat card is not regenerated repeatedly during combat
    Given a stat card for "Skeleton" was generated at the start of combat
    When skeletons continue to be discussed over the next 10 minutes
    Then no additional skeleton stat cards should be generated
    And the original card should remain accessible by scrolling
```

---

## Category 5: Spell and Ability Details

When a player casts a spell or uses a class ability, the assistant surfaces
the relevant mechanical details.

```gherkin
Feature: Spell and Ability Detail Suggestions
  As a Dungeon Master
  I want spell and ability details surfaced when players use them
  So that I can confirm mechanics quickly without asking the player to read their spell aloud

  Background:
    Given the DM has started a session with campaign context
    And the campaign context includes:
      """
      Party abilities of note:
      - Sable (Warlock): Eldritch Blast (2 beams at level 5), Hex, Hunger of Hadar, Counterspell
      - Drogan (Cleric): Spirit Guardians, Healing Word, Guiding Bolt, Turn Undead (CR 1/2)
      - Vex (Ranger): Hunter's Mark, Spike Growth, Multiattack (2 attacks)
      """

  Scenario: Player casts a spell by name
    When the transcript includes "I'm going to cast Spirit Guardians"
    And the next suggestion cycle runs
    Then a suggestion should appear with key mechanics:
      | detail                                      |
      | 3rd level conjuration, concentration         |
      | 15-foot radius, moves with caster            |
      | 3d8 radiant/necrotic on failed Wis save      |
      | Half damage on success                        |
      | Affects creatures entering or starting turn   |

  Scenario: Player uses a class feature
    When the transcript includes "Drogan uses Turn Undead"
    And the next suggestion cycle runs
    Then a suggestion should surface Turn Undead mechanics:
      | detail                                          |
      | 30-foot radius, Wisdom save                      |
      | Failed save: turned for 1 minute                 |
      | Drogan's level: destroys CR 1/2 and below        |
    And it should note relevance if undead are present in the current encounter

  Scenario: Counterspell is cast and level matters
    When the transcript includes "Sable wants to Counterspell that"
    And the next suggestion cycle runs
    Then a suggestion should include:
      | detail                                                         |
      | Auto-counters spells of 3rd level or lower (Warlock slot level)|
      | Higher level spells: ability check DC 10 + spell level         |
    And the DM should be prompted to state the level of the spell being countered

  Scenario: Spell not in campaign context but in SRD
    When the transcript includes "I cast Fireball"
    And Fireball is not listed in the campaign context
    And the next suggestion cycle runs
    Then the suggestion may surface Fireball details from SRD knowledge:
      | detail                               |
      | 3rd level, 8d6 fire, 20ft radius     |
      | Dex save for half                    |
    And the suggestion should be labeled as "SRD Reference"

  Scenario: No suggestion for routine cantrip usage
    When the transcript includes "I Eldritch Blast the skeleton"
    And Sable has cast Eldritch Blast multiple times this session already
    Then no suggestion should be generated for a routine repeated cantrip
    And the suggestion engine should track which spells have already been surfaced this session
```

---

## Category 6: Improvisation Support

When players go off-script or the DM needs to create something on the fly,
the assistant proactively offers material the DM can use immediately.

```gherkin
Feature: Improvisation Support Suggestions
  As a Dungeon Master
  I want the assistant to offer improvisation material when the situation calls for it
  So that I can keep the game flowing when players do something unexpected

  Background:
    Given the DM has started a session with campaign context
    And transcription is active

  Scenario: Party goes somewhere unplanned
    Given the campaign context does not mention a library
    When the transcript includes "I want to go to the town library and research the Ashen Crown"
    And the next suggestion cycle runs
    Then a suggestion should offer a quick improvised location:
      | element     | example content                        |
      | Name        | A suggested name for the library       |
      | Librarian   | A name and 1-2 personality traits      |
      | Detail      | One interesting or useful environmental detail |
    And the suggestion should be tonally consistent with the campaign context

  Scenario: Party talks to an unnamed NPC
    When the transcript includes "I go up to one of the market vendors and ask about the shipment"
    And no specific vendor NPC is in the campaign context
    And the next suggestion cycle runs
    Then a suggestion should offer:
      | element       | description                              |
      | Name          | A setting-appropriate vendor name         |
      | Race/Gender   | Brief physical description                |
      | Personality   | 1-2 traits                                |
      | Knowledge     | What they might know about the shipment   |

  Scenario: DM needs a quick name on the fly
    When the transcript includes "What's the guard's name... uh..."
    And the next suggestion cycle runs
    Then a suggestion should offer 3-4 setting-appropriate names
    And the names should be consistent with the naming conventions in the campaign context

  Scenario: Unexpected social encounter
    When the transcript includes "I challenge the drunk guy to an arm wrestling contest"
    And the next suggestion cycle runs
    Then a suggestion should offer:
      | element        | description                                  |
      | Mechanic       | Suggested check (Athletics, contested)        |
      | Stakes         | A suggested wager or consequence               |
      | Complication   | An optional twist to make it more interesting  |

  Scenario: Players ask about something the DM hasn't prepared
    When the transcript includes "What's the political situation between this town and the next one?"
    And the campaign context does not address inter-town politics
    And the next suggestion cycle runs
    Then a suggestion should offer a brief improvised political hook
    And it should be compatible with existing NPCs and factions in the context
    And it should be framed as a suggestion, not a definitive answer
```

---

## Category 7: Session Pacing

The assistant monitors the flow of the session and offers gentle pacing
nudges when appropriate.

```gherkin
Feature: Session Pacing Suggestions
  As a Dungeon Master
  I want to receive gentle pacing nudges during the session
  So that I can manage time effectively and keep the session engaging

  Background:
    Given the DM has started a session
    And transcription is active

  Scenario: Combat has been running for a long time
    Given the transcript has contained combat-related dialogue for 40 consecutive minutes
    And the suggestion engine detects ongoing combat narration
    Then a pacing suggestion should appear: "Combat has been running ~40 minutes. Consider wrapping up or introducing a turning point."

  Scenario: Session has been running for 3 hours
    Given 3 hours have elapsed since session start
    Then a pacing suggestion should appear noting the elapsed time
    And it may suggest "Good time for a break or to begin steering toward a session-ending beat"

  Scenario: Extended planning without action
    Given the transcript has consisted primarily of player deliberation for 20 minutes
    And no actions, rolls, or narrative progression have been mentioned
    Then a pacing suggestion may appear: "Party has been deliberating ~20 minutes. Consider introducing a time pressure or new information to move things along."

  Scenario: Pacing suggestions do not interrupt high-energy moments
    Given the transcript indicates an intense narrative moment (e.g., dramatic reveal, boss encounter)
    Then pacing suggestions should be suppressed
    And the engine should resume pacing suggestions after the intensity subsides

  Scenario: Pacing suggestions are infrequent
    Then no more than one pacing suggestion should appear per 30-minute window
    And pacing suggestions should be visually subtle compared to content suggestions
```

---

## Cross-Cutting: Suggestion Quality and Behavior

```gherkin
Feature: Suggestion Quality and Engine Behavior
  As a Dungeon Master
  I want the suggestion engine to behave predictably and maintain quality
  So that I trust the assistant and don't have to filter through noise

  Scenario: Suggestions are concise
    When any suggestion is generated
    Then it should be no longer than 100 words for a standard suggestion
    And stat blocks and rules references may be formatted as short tables
    And the DM should be able to read it in under 5 seconds

  Scenario: Suggestion cards are categorized by type
    When a suggestion is generated
    Then it should include a visual type indicator:
      | type           | indicator  |
      | NPC/Entity     | 📋 Recall  |
      | Rules          | 📖 Rules   |
      | Plot Thread    | 🧵 Thread  |
      | Monster Stats  | ⚔️ Combat  |
      | Spell/Ability  | ✨ Spell   |
      | Improvisation  | 💡 Improv  |
      | Pacing         | ⏱️ Pacing  |

  Scenario: Suggestions never reveal DM secrets to be read aloud
    When a suggestion contains information the party does not know
    Then the suggestion card should include a visible "DM ONLY" label
    And it should be visually distinct (e.g., different border color)

  Scenario: Suggestion engine degrades gracefully under noisy transcript
    Given the transcript contains significant crosstalk and non-game chatter
    When the suggestion cycle runs
    Then the engine should prefer generating no suggestion over a low-confidence one
    And it should not generate suggestions based on misheard or garbled text

  Scenario: DM can pause and resume suggestion generation
    Given suggestions are actively being generated
    When the DM clicks "Pause Suggestions"
    Then no new suggestions should be generated
    And transcription should continue
    When the DM clicks "Resume Suggestions"
    Then suggestions should resume using the current transcript window

  Scenario: DM can pin a suggestion to keep it visible
    Given a suggestion card is visible
    When the DM clicks the pin icon on the card
    Then the card should move to a pinned section at the top of the panel
    And it should not scroll away or be dismissed by new suggestions

  Scenario: Suggestion engine uses a sliding transcript window
    Given the session has been running for 2 hours
    When the suggestion cycle runs
    Then the engine should only analyze the most recent 3-5 minutes of transcript
    And the full campaign context should always be included
    And older transcript should not be sent to the LLM to manage token usage
```

---

## Scenario Summary

| Category              | Scenarios | Implementation Complexity |
|-----------------------|-----------|---------------------------|
| NPC & Entity Recall   | 10        | Medium — fuzzy matching on context, dedup |
| Rules Clarification   | 8         | Medium — house rules override logic |
| Plot Thread Reminders | 6         | Low-Medium — context matching |
| Monster Stat Surfacing| 6         | Medium — stat block formatting, combat detection |
| Spell & Ability Detail| 5         | Medium — SRD fallback, repetition suppression |
| Improvisation Support | 5         | Low — mostly prompt quality |
| Session Pacing        | 5         | Low — timer-based with transcript analysis |
| Quality & Behavior    | 7         | Medium — UI + engine config |
| **Total**             | **52**    | |

## Key Implementation Notes

1. **Deduplication is critical.** Almost every category needs suppression logic so the same
   NPC/spell/rule doesn't get surfaced every time it's mentioned. Use a cooldown window
   per entity (5-10 min suggested).

2. **House rules must override SRD.** The prompt engineering needs to make this explicit:
   "If the campaign context contains a house rule that contradicts standard rules, always
   use the house rule."

3. **The "DM ONLY" labeling** is important for trust. If the DM's partner is sitting nearby
   or a player glances at the screen, secret info needs to be visually flagged.

4. **Combat detection** is a useful meta-state. Several categories behave differently in
   combat vs. exploration vs. social encounters. A simple classifier on the transcript
   window ("is this combat narration?") enables better suggestion selection.

5. **The sliding window + full context approach** keeps token costs manageable. Campaign
   context might be 1-2K tokens. A 3-minute transcript window is maybe 500-800 tokens.
   Total per suggestion call stays well under 4K input tokens.
