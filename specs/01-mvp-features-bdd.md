# DM Assistant — MVP Feature Set & BDD Scenarios

## MVP Scope Definition

**Product name**: TBD
**Core hypothesis**: A DM will find value in an AI that passively listens to a session and proactively surfaces useful suggestions in real time.

### In Scope (MVP)
1. Session Setup — DM pastes campaign context before play begins
2. Live Transcription — Browser mic captures table audio and streams real-time transcript
3. Real-Time Suggestions — AI periodically analyzes transcript + context and surfaces DM-relevant suggestions
4. Ad-Hoc Questions — DM types a question and gets a context-aware answer
5. Session Export — DM can export the transcript and suggestion log when the session ends

### Out of Scope (MVP)
- User accounts / authentication
- Campaign persistence across sessions
- Post-session summarization
- Entity extraction / campaign wiki
- Discord integration
- Player-facing features
- Multi-system rules engine
- Mobile optimization
- Payment / subscription

---

## Feature 1: Session Setup

The DM configures the assistant before play begins by providing campaign context
as unstructured text. This context informs all suggestions and answers during the session.

```gherkin
Feature: Session Setup
  As a Dungeon Master
  I want to provide campaign context before my session begins
  So that the assistant's suggestions are grounded in my specific game

  Background:
    Given the DM has opened the application

  Scenario: DM provides campaign context
    Given the session has not been started
    When the DM enters the following campaign context:
      """
      Campaign: Curse of the Hollow King
      Party: Vex (half-elf ranger), Drogan (dwarf cleric), Sable (tiefling warlock)
      Current quest: Retrieve the Ashen Crown from the Tomb of Kael
      Last session: Party negotiated passage through the Bleakwood with a treant named Oldroot
      Key NPCs: Mayor Hild (quest giver), Oldroot (neutral treant), The Hollow King (BBEG)
      House rules: Critical hits do max damage + roll. Healing potions are a bonus action.
      """
    And the DM clicks "Start Session"
    Then the session should be active
    And the campaign context should be stored for the duration of the session
    And the transcript panel should display "Session started"

  Scenario: DM starts a session without campaign context
    Given the session has not been started
    When the DM clicks "Start Session" without entering any campaign context
    Then the session should be active
    And the assistant should operate without campaign-specific grounding

  Scenario: DM cannot modify campaign context after session start
    Given the DM has started a session with campaign context
    When the DM attempts to edit the campaign context text area
    Then the campaign context field should be read-only
    And a message should indicate "Context is locked during an active session"

  Scenario: DM ends and restarts with new context
    Given the DM has an active session
    When the DM clicks "End Session"
    And the DM enters new campaign context
    And the DM clicks "Start Session"
    Then the previous transcript and suggestions should be cleared
    And the new campaign context should be used for suggestions
```

---

## Feature 2: Live Transcription

The application captures audio from the DM's microphone and displays a
real-time transcript of table conversation during the session.

```gherkin
Feature: Live Transcription
  As a Dungeon Master
  I want the app to transcribe table conversation in real time
  So that the AI has context for generating suggestions

  Background:
    Given the DM has started a session
    And the browser has microphone permission

  Scenario: Microphone audio is transcribed in real time
    When a player at the table says "I want to search the chest for traps"
    Then the transcript panel should display text matching that utterance
    And the new text should appear within 3 seconds of being spoken

  Scenario: Transcript accumulates over the session
    Given the following utterances have occurred:
      | utterance                                         |
      | I want to search the chest for traps              |
      | Roll a perception check                           |
      | I got a 17                                        |
    Then the transcript panel should display all three utterances in chronological order
    And each entry should include a timestamp relative to session start

  Scenario: Transcription handles a period of silence
    Given transcription is active
    When no speech is detected for 30 seconds
    Then no new entries should appear in the transcript
    And the transcription service should remain connected and listening

  Scenario: Microphone permission is denied
    Given the DM has started a session
    When the browser denies microphone access
    Then the transcript panel should display "Microphone access denied"
    And the suggestion engine should still accept ad-hoc typed questions
    And the DM should be prompted with instructions to grant mic permission

  Scenario: Transcription recovers from a brief connection interruption
    Given transcription is actively streaming
    When the connection to the transcription service drops for less than 5 seconds
    Then the service should automatically reconnect
    And a brief indicator should show "Reconnecting..."
    And transcription should resume without requiring DM intervention

  Scenario: Transcription handles overlapping speakers
    When two people speak simultaneously at the table
    Then the transcript should capture at least a partial rendering of both utterances
    And the transcript should not hang or produce an error
```

---

## Feature 3: Real-Time Suggestions

The AI periodically analyzes the recent transcript combined with campaign context
and surfaces brief, actionable suggestions to the DM. Suggestions should feel
like a knowledgeable co-DM glancing over your shoulder.

```gherkin
Feature: Real-Time Suggestions
  As a Dungeon Master
  I want the AI to proactively surface relevant suggestions during play
  So that I can reference rules, recall details, and get ideas without breaking flow

  Background:
    Given the DM has started a session with the following campaign context:
      """
      Party: Vex (half-elf ranger), Drogan (dwarf cleric), Sable (tiefling warlock)
      Current quest: Retrieve the Ashen Crown from the Tomb of Kael
      Key NPCs: Mayor Hild (quest giver), Oldroot (neutral treant), The Hollow King (BBEG)
      House rules: Critical hits do max damage + roll. Healing potions are a bonus action.
      Unresolved hooks: Sable promised Oldroot she would return the stolen seedling.
      """
    And transcription is active

  Scenario: Suggestion triggered by rules-relevant conversation
    When the transcript includes "Can I grapple the skeleton while I'm prone?"
    And the next suggestion cycle runs
    Then a suggestion card should appear in the suggestion panel
    And the suggestion should reference the grappling rules relevant to the prone condition
    And the suggestion should be no longer than 3 sentences

  Scenario: Suggestion triggered by NPC reference
    When the transcript includes "Let's go back to town and talk to the mayor"
    And the next suggestion cycle runs
    Then a suggestion card should appear referencing "Mayor Hild"
    And it should include relevant context from the campaign notes about Mayor Hild

  Scenario: Suggestion triggered by unresolved plot hook
    When the transcript includes "Sable, didn't you make some kind of deal in the forest?"
    And the next suggestion cycle runs
    Then a suggestion card should appear referencing the stolen seedling promise to Oldroot

  Scenario: No suggestion when conversation is not game-relevant
    When the transcript for the last 2 minutes consists of:
      """
      Hey does anyone want more pizza?
      Yeah grab me a slice.
      What kind is left?
      Just pepperoni I think.
      """
    And the next suggestion cycle runs
    Then no new suggestion card should appear in the suggestion panel

  Scenario: Suggestion respects house rules
    When the transcript includes "I rolled a natural 20 on my attack"
    And the next suggestion cycle runs
    Then the suggestion should reference the house rule "max damage + roll"
    And it should not reference standard PHB critical hit rules

  Scenario: Suggestions arrive at a reasonable cadence
    Given the session has been running for 10 minutes with continuous game conversation
    Then the number of suggestions generated should be between 5 and 15
    And no two suggestions should appear within less than 30 seconds of each other

  Scenario: Suggestion panel displays most recent first
    Given multiple suggestions have been generated during the session
    Then the most recent suggestion should appear at the top of the panel
    And older suggestions should be scrollable below

  Scenario: DM can dismiss a suggestion
    Given a suggestion card is visible in the panel
    When the DM clicks the dismiss button on the suggestion card
    Then the suggestion should be removed from the panel
    And it should not reappear

  Scenario: Suggestion includes an improvisation prompt when players go off-script
    Given the campaign context indicates the party's objective is the Tomb of Kael
    When the transcript includes "Forget the tomb, I want to sail to the island we heard about"
    And the next suggestion cycle runs
    Then a suggestion should appear offering a brief improvisation hook for the island detour
    And it should include at least one NPC name and one point of interest
```

---

## Feature 4: Ad-Hoc Questions

The DM can type a question at any time and receive a context-aware answer that
considers both the campaign context and the recent transcript.

```gherkin
Feature: Ad-Hoc Questions
  As a Dungeon Master
  I want to type a question and get an immediate context-aware answer
  So that I can quickly resolve rules questions or get ideas without leaving the app

  Background:
    Given the DM has started a session with campaign context
    And transcription is active

  Scenario: DM asks a rules question
    When the DM types "What are the rules for casting a spell while concentrating on another?"
    And the DM submits the question
    Then an answer should appear in the suggestion panel within 5 seconds
    And the answer should accurately describe concentration rules
    And the answer should be visually distinct from proactive suggestions

  Scenario: DM asks a context-dependent question
    Given the transcript includes discussion about the party entering a dungeon
    When the DM types "Give me a quick random encounter for a stone corridor"
    And the DM submits the question
    Then an answer should appear with a brief encounter idea
    And the encounter should be appropriate to the dungeon context from the transcript

  Scenario: DM asks about campaign-specific information
    Given the campaign context includes "Mayor Hild (quest giver)"
    When the DM types "What does the party know about Mayor Hild?"
    And the DM submits the question
    Then the answer should reference information about Mayor Hild from the campaign context

  Scenario: DM asks a question with no active transcript
    Given no speech has been detected yet this session
    When the DM types "What's the DC for a hard difficulty check at level 5?"
    And the DM submits the question
    Then an answer should still be returned based on general rules knowledge

  Scenario: Ad-hoc answer does not interrupt the suggestion feed
    Given proactive suggestions are being generated
    When the DM submits an ad-hoc question
    Then the answer should appear in the panel without clearing existing suggestions
    And proactive suggestion generation should continue uninterrupted

  Scenario: DM submits an empty question
    When the DM submits a question with no text
    Then no API call should be made
    And the input field should indicate that a question is required

  Scenario: DM asks for a quick NPC
    When the DM types "I need a name and personality for a shady merchant"
    And the DM submits the question
    Then the answer should provide a name and 2-3 personality traits
    And the response should be concise enough to use immediately in play
```

---

## Feature 5: Session Export

When the session ends, the DM can export the full transcript and suggestion log
as a file for later reference or manual post-processing.

```gherkin
Feature: Session Export
  As a Dungeon Master
  I want to export the transcript and suggestions when my session ends
  So that I have a record I can use for session recaps and future prep

  Background:
    Given the DM has completed a session with transcript and suggestion data

  Scenario: DM exports session as Markdown
    When the DM clicks "End Session"
    Then the application should present an option to export the session
    When the DM clicks "Export as Markdown"
    Then a .md file should be downloaded containing:
      | section               |
      | Session metadata      |
      | Campaign context      |
      | Full transcript        |
      | Suggestions log        |
      | Ad-hoc Q&A log         |

  Scenario: Export includes timestamps
    When the DM exports the session
    Then each transcript entry should include a timestamp relative to session start
    And each suggestion should include the timestamp at which it was generated

  Scenario: Export includes campaign context
    Given the DM provided campaign context at session start
    When the DM exports the session
    Then the exported file should include the campaign context under a clearly labeled section

  Scenario: Export with no transcript data
    Given the DM started a session but no audio was captured
    When the DM exports the session
    Then the file should still include the campaign context and session metadata
    And the transcript section should indicate "No transcript data recorded"

  Scenario: DM ends session without exporting
    When the DM clicks "End Session"
    And the DM clicks "Start New Session" without exporting
    Then a confirmation dialog should warn "Previous session data will be lost. Export first?"
    And the DM should have the option to go back and export

  Scenario: Export as JSON for programmatic use
    When the DM clicks "End Session"
    And the DM selects "Export as JSON"
    Then a .json file should be downloaded
    And it should contain structured data with keys for metadata, context, transcript, suggestions, and questions
    And the JSON should be valid and parseable
```

---

## Non-Functional Scenarios

```gherkin
Feature: Performance and Reliability
  As a Dungeon Master
  I want the assistant to be responsive and unobtrusive during play
  So that it enhances the session without becoming a distraction

  Scenario: Transcript latency under normal conditions
    Given the session is active and microphone is streaming
    When a clear utterance is spoken
    Then the transcribed text should appear in the transcript panel within 3 seconds

  Scenario: Suggestion generation does not block the UI
    Given a suggestion cycle is in progress
    When the DM types an ad-hoc question
    Then the question input should remain responsive
    And the DM should be able to submit the question without waiting for the suggestion cycle

  Scenario: Application handles a 4-hour session
    Given the session has been running continuously for 4 hours
    Then the application should remain responsive
    And the transcript panel should be scrollable without lag
    And the suggestion engine should still be generating relevant suggestions

  Scenario: Application handles STT service outage gracefully
    Given transcription is active
    When the STT service becomes unavailable
    Then the application should display "Transcription temporarily unavailable"
    And the ad-hoc question feature should continue to function
    And the application should retry connection automatically

  Scenario: Suggestion engine handles LLM API timeout
    Given a suggestion cycle is triggered
    When the LLM API does not respond within 10 seconds
    Then the suggestion cycle should be skipped
    And no error should be displayed to the DM
    And the next cycle should proceed normally

  Scenario: Browser memory remains stable over a long session
    Given the session has been running for 4 hours
    Then browser memory usage should not exceed 500MB
    And no memory leak warnings should appear in the console
```

---

## Acceptance Criteria Summary

| Feature              | Scenarios | Key Risk                                    |
|----------------------|-----------|---------------------------------------------|
| Session Setup        | 4         | Low — straightforward state management       |
| Live Transcription   | 6         | High — STT accuracy, latency, speaker overlap |
| Real-Time Suggestions| 10        | High — suggestion relevance, cadence tuning   |
| Ad-Hoc Questions     | 7         | Medium — response quality, context grounding  |
| Session Export       | 6         | Low — file generation                        |
| Non-Functional       | 6         | Medium — long session stability               |
| **Total**            | **39**    |                                               |

## Next Steps

1. Stand up the project skeleton (FastAPI + React)
2. Spike on Deepgram streaming integration — validate latency and fantasy name accuracy
3. Spike on suggestion engine prompt — test with sample transcript against Claude Sonnet
4. Implement features in priority order: Transcription → Suggestions → Questions → Setup → Export
