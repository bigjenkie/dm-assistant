# DM Assistant — Gap Coverage BDD Scenarios

Scenarios covering areas identified as missing from specs 01-06.
These fill behavioral gaps in: LLM provider management, campaign persistence,
first-run wizard, transcript internals, entity cooldown, suggestion parsing,
session resilience, security/privacy, settings, and the MCP server.

---

## 1. LLM Provider Management

The dual-mode architecture (local Ollama + cloud Claude) is the product's
competitive differentiator. These scenarios specify how provider detection,
switching, health checking, and failure handling behave from the user's
perspective.

```gherkin
Feature: LLM Provider Management
  As a Dungeon Master
  I want to choose between local and cloud AI providers
  So that I can balance cost, privacy, and suggestion quality

  # --- PROVIDER DETECTION & STATUS ---

  Scenario: Ollama detected and healthy on app launch
    Given Ollama is running on localhost:11434
    And the model "llama3.1:8b-instruct-q4_K_M" is available
    When the DM opens the application
    Then the provider status should show "Local — Connected"
    And the status bar should display "Local" with a green indicator
    And the estimated suggestion time should display "~5-8 seconds"

  Scenario: Ollama not running on app launch
    Given Ollama is not running on localhost:11434
    And no Anthropic API key is configured
    When the DM opens the application
    Then the provider status should show "Local — Not Connected"
    And a warning should display "Ollama is not running. Start Ollama or configure a Claude API key."
    And the suggestion engine should be disabled
    And transcription should still function normally

  Scenario: Ollama running but no model pulled
    Given Ollama is running on localhost:11434
    But no models are available
    When the DM opens the application
    Then the provider status should show "Local — No Model"
    And a message should display the recommended model and pull command
    And the DM should be able to copy the command to clipboard

  Scenario: Ollama becomes unavailable mid-session
    Given the DM has an active session using the local provider
    When Ollama stops responding
    And the next suggestion cycle runs
    Then the suggestion cycle should fail silently (no error shown to DM)
    And the status bar should change to "Local — Disconnected"
    And a subtle notification should appear: "Local AI unavailable — retrying"
    And the engine should retry on the next cycle
    And transcription should continue unaffected

  Scenario: Ollama recovers mid-session
    Given the provider status shows "Local — Disconnected"
    When Ollama becomes available again
    And the next suggestion cycle runs
    Then the suggestion should generate normally
    And the status bar should return to "Local — Connected"
    And the recovery should require no DM intervention

  # --- ANTHROPIC API KEY MANAGEMENT ---

  Scenario: DM enters a valid Anthropic API key
    When the DM navigates to AI Engine Settings
    And selects "Claude (Anthropic API)" as the provider
    And enters a valid API key
    And clicks "Test"
    Then the test should succeed
    And the status should show "Claude — Connected"
    And the API key should be stored in the OS keychain
    And the key should display as masked dots in the UI

  Scenario: DM enters an invalid Anthropic API key
    When the DM enters an invalid API key
    And clicks "Test"
    Then the test should fail
    And an error should display "Invalid API key — please check and try again"
    And the provider should remain on the previous setting
    And the invalid key should NOT be saved

  Scenario: Anthropic API key has expired or been revoked
    Given the DM has a previously valid API key stored
    When the suggestion engine attempts to use the key
    And the API returns a 401 Unauthorized error
    Then the status bar should change to "Claude — Auth Error"
    And a notification should appear: "API key rejected — check your key in Settings"
    And the suggestion engine should pause (not crash or retry in a loop)
    And transcription should continue unaffected

  Scenario: Anthropic API rate limited
    Given the DM is using Claude mode
    When the Anthropic API returns a 429 rate limit error
    Then the suggestion cycle should back off (double the interval temporarily)
    And a subtle notification should appear: "Rate limited — slowing suggestions"
    And the engine should resume normal cadence after the rate limit window passes
    And no suggestion should be lost or duplicated

  # --- PROVIDER SWITCHING ---

  Scenario: DM switches from local to Claude mid-session
    Given the DM has an active session using the local provider
    When the DM opens Settings and switches to "Claude (Anthropic API)"
    And a valid API key is configured
    Then the status bar should change to "Claude"
    And the next suggestion cycle should use the Anthropic provider
    And existing suggestions in the panel should remain unchanged
    And the transcript should continue without interruption

  Scenario: DM switches from Claude to local mid-session
    Given the DM has an active session using Claude
    When the DM opens Settings and switches to "Local (Ollama)"
    And Ollama is running with a model available
    Then the status bar should change to "Local"
    And the next suggestion cycle should use the Ollama provider
    And no further API calls should be made to Anthropic

  Scenario: DM switches to Claude but Ollama was the only option
    Given the DM is using the local provider
    And no API key is configured
    When the DM selects "Claude (Anthropic API)"
    Then the settings should prompt for an API key
    And the provider should NOT switch until a valid key is tested
    And the local provider should remain active during configuration

  Scenario: Provider switch fails — previous provider retained
    Given the DM has an active session using the local provider
    When the DM switches to Claude
    But the API key test fails
    Then the provider should remain on Local
    And a message should explain why the switch failed
    And the session should continue uninterrupted

  # --- PRIVACY & CONSENT ---

  Scenario: First-time Claude mode activation shows privacy notice
    Given the DM has never used Claude mode before
    When the DM selects "Claude (Anthropic API)" for the first time
    Then a privacy notice should appear explaining:
      | information                                                    |
      | Transcript text will be sent to Anthropic's API for processing |
      | Audio is never sent — only the text transcript                 |
      | Campaign context and backstories are included in each request  |
      | Anthropic does not train on API data (zero data retention)     |
      | You can switch back to local mode at any time                  |
    And the DM must check an acknowledgment checkbox to proceed
    And the notice should NOT appear again after acknowledgment

  Scenario: Privacy notice does not reappear after acknowledgment
    Given the DM has previously acknowledged the Claude privacy notice
    When the DM switches to Claude mode again
    Then the provider should switch immediately without showing the notice

  # --- COST TRACKING ---

  Scenario: Running cost estimate displayed during Claude session
    Given the DM has an active session using Claude
    When suggestions have been generated for 30 minutes
    Then the status bar should display an estimated session cost
    And the cost should update after each API call
    And the estimate should reflect input + output token usage

  Scenario: Cost cap warning
    Given the DM has configured a per-session cost cap of $5.00
    When the estimated session cost reaches 80% of the cap ($4.00)
    Then a warning should appear: "Approaching session cost cap ($4.00 / $5.00)"
    When the cap is reached
    Then suggestions should pause
    And the DM should be prompted to raise the cap or switch to local mode
```

---

## 2. Campaign Data Management & Persistence

Campaign data persists across sessions in SQLite. These scenarios cover
the full CRUD lifecycle for campaigns, characters, NPCs, and plot hooks.

```gherkin
Feature: Campaign Data Management
  As a Dungeon Master
  I want to create and manage persistent campaign data
  So that my campaigns carry context across multiple sessions

  # --- CAMPAIGN CRUD ---

  Scenario: DM creates a new campaign
    When the DM clicks "New Campaign"
    And enters the name "Curse of the Hollow King"
    And selects the system "D&D 5e"
    And enters initial campaign context
    And clicks "Create"
    Then the campaign should be saved to the database
    And it should appear in the campaign list
    And it should be selected as the active campaign

  Scenario: DM edits campaign context between sessions
    Given no session is currently active
    And the campaign "Curse of the Hollow King" exists
    When the DM edits the campaign context text
    And clicks "Save"
    Then the updated context should be persisted
    And the updated_at timestamp should reflect the change

  Scenario: DM switches between campaigns
    Given campaigns "Curse of the Hollow King" and "Sunken Isles" exist
    And "Curse of the Hollow King" is the active campaign
    When the DM selects "Sunken Isles" from the campaign list
    Then the campaign editor should load the Sunken Isles context
    And all character, NPC, and plot hook panels should update

  Scenario: DM cannot switch campaigns during an active session
    Given a session is currently active for "Curse of the Hollow King"
    When the DM attempts to switch to a different campaign
    Then the switch should be blocked
    And a message should indicate "End the current session before switching campaigns"

  Scenario: DM deletes a campaign
    Given the campaign "Old Test Campaign" exists with sessions and data
    When the DM clicks "Delete Campaign"
    Then a confirmation dialog should appear warning of permanent data loss
    And it should display the number of sessions, NPCs, and characters that will be deleted
    When the DM confirms deletion
    Then the campaign and all associated data should be removed
    And the campaign list should update

  # --- CHARACTER BACKSTORY MANAGEMENT ---

  Scenario: DM adds a player character with full backstory
    Given the campaign "Curse of the Hollow King" is active
    When the DM clicks "Add Character"
    And fills in:
      | field       | value                                       |
      | Name        | Vex                                         |
      | Player Name | Sarah                                       |
      | Class       | Ranger                                      |
      | Backstory   | Grew up in Ashenmere, destroyed by Scorrath  |
      | Bonds       | Carries her mother's broken amulet            |
      | Flaws       | Freezes around draconic creatures             |
      | Goals       | Find and kill Scorrath                        |
    And clicks "Save Character"
    Then the character should be saved to the database
    And it should appear in the character list for this campaign
    And the backstory should be available to the suggestion engine

  Scenario: DM edits an existing character's backstory
    Given the character "Vex" exists in the active campaign
    When the DM edits Vex's goals to "Find Scorrath and discover why he attacked Ashenmere"
    And clicks "Save"
    Then the updated goal should be persisted
    And subsequent suggestion cycles should use the updated backstory

  Scenario: DM removes a character from the campaign
    Given the character "Retired Bard" exists in the active campaign
    When the DM clicks "Remove Character" on "Retired Bard"
    Then a confirmation should appear
    When confirmed
    Then the character should be removed from the database
    And the character should no longer appear in suggestion context

  # --- NPC MANAGEMENT ---

  Scenario: Improvised NPC is saved to the campaign
    Given an improvised NPC "Gruul the Barkeep" was generated during a session
    When the session ends
    Then the DM should be prompted: "Save improvised NPCs to your campaign?"
    And "Gruul the Barkeep" should be listed with its generated details
    When the DM clicks "Save"
    Then the NPC should be persisted with is_improvised = true
    And it should appear in the NPC list for future sessions

  Scenario: DM manually adds an NPC
    When the DM clicks "Add NPC"
    And enters name "The Hollow King"
    And enters description "Undead warlord seeking the Ashen Crown"
    And enters secrets "Was once a paladin of the same order as Drogan's brother"
    And clicks "Save"
    Then the NPC should be saved with the secrets field
    And the secrets field should be marked as DM-only in the UI

  Scenario: DM edits NPC details
    Given the NPC "Mayor Hild" exists
    When the DM adds to her secrets "Her son's name is Edric"
    And clicks "Save"
    Then the updated secrets should be persisted

  # --- PLOT HOOK TRACKING ---

  Scenario: DM adds an unresolved plot hook
    When the DM clicks "Add Plot Hook"
    And enters "Sable promised Oldroot to return the stolen seedling"
    And links it to character "Sable"
    And sets created session to 4
    Then the hook should be saved with status "unresolved"

  Scenario: DM resolves a plot hook
    Given the plot hook "Return the stolen seedling" exists with status "unresolved"
    When the DM clicks "Resolve"
    And enters the resolution "Sable returned the seedling in Session 8"
    Then the hook status should change to "resolved"
    And resolved_session should be set to 8
    And the hook should appear in a "Resolved" section rather than "Active"

  Scenario: DM abandons a plot hook
    Given the plot hook "Investigate the coded letter" exists
    When the DM marks it as "Abandoned"
    Then the hook status should change to "abandoned"
    And it should no longer be included in suggestion engine context
```

---

## 3. First-Run Wizard

The user's first experience with the app. Guides them through dependency
detection, model setup, audio configuration, and first campaign creation.

```gherkin
Feature: First-Run Wizard
  As a new user
  I want to be guided through initial setup
  So that I can start using the app quickly without technical confusion

  Background:
    Given the application has been launched for the first time
    And no configuration exists

  # --- STEP 1: OLLAMA DETECTION ---

  Scenario: Ollama detected on first launch
    Given Ollama is installed and running
    When the wizard reaches the "AI Engine" step
    Then it should display "Ollama detected" with a green check
    And it should list available models
    And it should recommend a model based on available hardware

  Scenario: Ollama not detected on first launch
    Given Ollama is not installed
    When the wizard reaches the "AI Engine" step
    Then it should display "Ollama not found"
    And it should show an install link for the user's platform
    And it should offer the alternative: "Or use Claude with your API key"
    And the DM should be able to skip this step and configure later

  # --- STEP 2: MODEL SELECTION ---

  Scenario: Wizard recommends model based on hardware
    Given Ollama is installed
    And the system has 16GB RAM and an RTX 3060 (12GB VRAM)
    When the wizard reaches model selection
    Then it should recommend "llama3.1:8b-instruct-q4_K_M"
    And it should explain: "Best balance of quality and speed for your hardware"
    And it should list alternatives with hardware requirements

  Scenario: Low-spec hardware gets appropriate recommendation
    Given the system has 8GB RAM and no discrete GPU
    When the wizard reaches model selection
    Then it should recommend "llama3.2:3b-instruct"
    Or suggest "Use Claude mode for the best experience on this hardware"

  Scenario: Model needs to be downloaded
    Given the recommended model is not yet pulled
    When the DM clicks "Download Model"
    Then a progress indicator should show download status
    And the download size should be displayed
    And the DM should be able to cancel the download
    And the wizard should allow proceeding to the next step during download

  # --- STEP 3: WHISPER MODEL ---

  Scenario: Whisper model download on first run
    When the wizard reaches the "Speech Recognition" step
    Then it should begin downloading ggml-small.en.bin
    And a progress bar should show download status (~466MB)
    And the estimated download time should be displayed
    And the DM should be able to select a different model size

  Scenario: Whisper model download interrupted
    Given the whisper model download is at 60%
    When the network connection drops
    Then the download should pause with a message: "Download paused — will resume when connected"
    When the connection is restored
    Then the download should resume from where it left off

  # --- STEP 4: AUDIO DEVICE SELECTION ---

  Scenario: Audio devices detected and configured
    Given the system has a built-in microphone and external speakers
    When the wizard reaches the "Audio Setup" step
    Then it should list all available input devices
    And it should list all available output devices
    And it should pre-select the default input and output devices

  Scenario: Mic test during setup
    When the DM clicks "Test Microphone"
    And speaks into the microphone
    Then a volume level indicator should respond to the audio
    And a brief transcription test should display the spoken text
    And the DM should see confirmation that the mic is working

  Scenario: Same device warning during setup
    When the DM selects the same device for both input and output
    Then a warning should appear about transcription feedback loops
    And the DM should be allowed to proceed with an acknowledgment

  # --- STEP 5: FIRST CAMPAIGN ---

  Scenario: Guided first campaign creation
    When the wizard reaches the "Create Your First Campaign" step
    Then it should show a template with labeled sections:
      | section            | placeholder text                          |
      | Campaign Name      | e.g., Curse of the Hollow King            |
      | Game System        | D&D 5e (default)                          |
      | Campaign Context   | Paste your campaign notes here...          |
      | Characters         | Add your player characters (optional now)  |
    And each section should have helper text explaining what it's for
    And the DM should be able to skip and create a campaign later

  Scenario: DM skips the wizard
    When the DM clicks "Skip Setup" at any step
    Then the wizard should close
    And the app should open with a banner: "Setup incomplete — visit Settings to finish"
    And the DM should be able to re-enter the wizard from Settings

  Scenario: Wizard does not reappear after completion
    Given the DM has completed all wizard steps
    When the app is relaunched
    Then the wizard should NOT appear
    And the app should open directly to the main interface
```

---

## 4. Transcript Manager Internals

Scenarios covering the processing pipeline between whisper.cpp output
and what the suggestion engine and UI consume.

```gherkin
Feature: Transcript Manager
  As a Dungeon Master
  I want reliable, clean transcript processing
  So that the suggestion engine gets accurate context

  Background:
    Given the DM has an active session
    And whisper.cpp is running and receiving audio

  # --- FANTASY NAME HANDLING ---

  Scenario: Campaign names improve transcription accuracy
    Given the campaign context includes NPC names:
      | name          |
      | Thalzar       |
      | Bleakwood     |
      | Oldroot       |
    When whisper.cpp is started for this session
    Then the --prompt flag should include all registered proper nouns
    And the transcription of "Let's go find Thalzar" should recognize "Thalzar"
      rather than producing "falls are" or other misinterpretations

  Scenario: New names added mid-campaign improve future sessions
    Given the DM adds a new NPC "Zyrethia" during the session
    When the next session starts
    Then "Zyrethia" should be included in the whisper prompt vocabulary

  # --- DEDUPLICATION ---

  Scenario: Duplicate transcript segments are suppressed
    Given whisper.cpp emits overlapping text windows
    When the same utterance "Roll a perception check" appears in consecutive segments
    Then the transcript should display it only once
    And the timestamp should reflect the first occurrence

  Scenario: Similar but distinct utterances are preserved
    When the transcript receives:
      | segment                                |
      | I attack the skeleton with my sword     |
      | I attack the skeleton with my axe       |
    Then both utterances should appear in the transcript
    And deduplication should not merge them

  # --- BUFFERING & STORAGE ---

  Scenario: Transcript stored as JSONL during session
    Given the session has been running for 10 minutes
    When the DM checks the session data directory
    Then a .jsonl transcript file should exist
    And each line should be valid JSON with keys: ts, text, confidence
    And entries should be in chronological order

  Scenario: Transcript window extraction for suggestion engine
    Given the session has been running for 2 hours
    When the suggestion engine requests the last 3 minutes of transcript
    Then only utterances from the last 3 minutes should be returned
    And older transcript should NOT be included
    And the full campaign context should still be available separately

  Scenario: Transcript is recoverable after unexpected app close
    Given the session has been running for 45 minutes
    When the app closes unexpectedly
    And the app is relaunched
    Then the transcript JSONL file should contain all data up to the last flush
    And no more than 5 seconds of transcript should be lost

  # --- CONFIDENCE FILTERING ---

  Scenario: Low-confidence segments are flagged
    When whisper.cpp emits a segment with confidence below 0.5
    Then the transcript should display the text with a visual indicator (e.g., italic or dimmed)
    And the suggestion engine should weight low-confidence text lower
    And the segment should still be included (not silently dropped)
```

---

## 5. Entity Cooldown and Deduplication

The cooldown tracker prevents the same entity from being surfaced
repeatedly. These scenarios specify the TTL-based suppression behavior.

```gherkin
Feature: Entity Cooldown and Deduplication
  As a Dungeon Master
  I want the suggestion engine to avoid repeating itself
  So that I trust the suggestions and don't learn to ignore them

  Background:
    Given the DM has an active session with campaign context
    And the cooldown tracker is initialized

  Scenario: Entity enters cooldown after being surfaced
    When a suggestion for "Mayor Hild" is generated and displayed
    Then "Mayor Hild" should be registered in the cooldown tracker
    And the cooldown TTL should be set to 5 minutes (default)

  Scenario: Entity suppressed during cooldown window
    Given a suggestion for "Mayor Hild" was generated 2 minutes ago
    When the transcript mentions Mayor Hild again
    And the next suggestion cycle runs
    Then no duplicate suggestion for Mayor Hild should be generated
    And the engine may generate a suggestion about a different topic

  Scenario: Cooldown expires and entity becomes eligible again
    Given a suggestion for "Mayor Hild" was generated 6 minutes ago
    And the default cooldown TTL is 5 minutes
    When the transcript mentions Mayor Hild
    And the next suggestion cycle runs
    Then a new suggestion for Mayor Hild should be allowed
    And it should contain current context (not a repeat of the previous suggestion)

  Scenario: Different entity types tracked independently
    Given a suggestion for NPC "Reva the Red" was generated 1 minute ago
    When the transcript mentions the location "The Charred Flagon"
    And the next suggestion cycle runs
    Then a suggestion for The Charred Flagon should be generated normally
    And Reva's cooldown should not block unrelated entities

  Scenario: Multiple entities mentioned simultaneously
    When the transcript mentions both "Reva" and "Captain Thane" in the same exchange
    And neither entity is in cooldown
    And the next suggestion cycle runs
    Then the engine should surface the most relevant entity
    And both entities should enter cooldown regardless of which was surfaced

  Scenario: Cooldown resets when new information emerges
    Given a suggestion for "Mayor Hild" was generated 2 minutes ago
    And Mayor Hild is in cooldown
    When the transcript includes genuinely new information about Mayor Hild
      (e.g., "Mayor Hild just drew a dagger and stabbed the guard")
    And the next suggestion cycle runs
    Then the cooldown should be overridden for urgent/novel context
    And a new suggestion should be allowed

  Scenario: Cooldown tracker remains bounded over long sessions
    Given the session has been running for 4 hours
    And hundreds of entities have been tracked
    Then expired cooldown entries should be automatically cleaned up
    And the tracker should not consume unbounded memory
    And active cooldowns should still function correctly

  Scenario: Pinned suggestion does not permanently suppress an entity
    Given a suggestion for "The Ashen Crown" was generated and pinned by the DM
    When 10 minutes have passed
    And the transcript mentions the Ashen Crown with new context
    Then a new suggestion about the Ashen Crown should be allowed
    And the pinned card should remain in the pinned section
```

---

## 6. Suggestion Response Parsing

The LLM returns structured text (TYPE/TITLE/BODY/DM_ONLY). These
scenarios specify how that response is parsed into suggestion cards.

```gherkin
Feature: Suggestion Response Parsing
  As a Dungeon Master
  I want malformed LLM responses handled gracefully
  So that the app never crashes or shows garbage during my session

  Background:
    Given the DM has an active session
    And the suggestion engine is running

  Scenario: Well-formed response parsed into suggestion card
    When the LLM returns:
      """
      TYPE: RECALL
      TITLE: Mayor Hild
      BODY: Female human, mid-50s. Quest giver who offered 500gp for the Ashen Crown. Nervous demeanor, fidgets with a silver ring.
      DM_ONLY: false
      """
    Then a suggestion card should appear with:
      | field    | value                                     |
      | type     | Recall (with recall icon)                  |
      | title    | Mayor Hild                                 |
      | body     | The description text                       |
      | dm_only  | false (no DM ONLY label)                   |

  Scenario: NONE response produces no suggestion
    When the LLM returns exactly "NONE"
    Then no suggestion card should be created
    And no error should be logged
    And the next suggestion cycle should proceed normally

  Scenario: DM_ONLY flag applies correct styling
    When the LLM returns a suggestion with "DM_ONLY: true"
    Then the suggestion card should display a visible "DM ONLY" label
    And the card should have a distinct visual treatment (e.g., different border color)

  Scenario: Malformed response — missing TYPE field
    When the LLM returns:
      """
      TITLE: Some Suggestion
      BODY: Here is some text.
      DM_ONLY: false
      """
    Then the response should be handled gracefully
    And either a default type should be assigned or the suggestion should be dropped
    And no error should be visible to the DM

  Scenario: Malformed response — completely unstructured text
    When the LLM returns:
      """
      I think the party should probably go talk to the mayor about
      the quest. She might have more information about the tomb.
      """
    Then the response should be treated as a plain suggestion
    And it should be displayed with a generic type indicator
    Or it should be silently dropped
    And the app should NOT crash or show a parsing error

  Scenario: Response exceeds maximum length
    When the LLM returns a BODY field longer than 200 words
    Then the body should be truncated to the configured maximum
    And a "..." indicator should show the text was trimmed
    And the full text should NOT overflow the suggestion card

  Scenario: Unrecognized TYPE value
    When the LLM returns "TYPE: WEATHER_REPORT"
    Then the suggestion should be displayed with a generic/default type icon
    And the title and body should still render normally

  Scenario: Response contains markdown formatting
    When the LLM returns a BODY field containing markdown:
      """
      **Grapple Rules:** Replaces one attack. Contested *Athletics* vs
      Athletics or Acrobatics. Target speed becomes **0**.
      """
    Then the markdown should be rendered in the suggestion card
    And bold and italic text should display correctly

  Scenario: Empty response from LLM
    When the LLM returns an empty string
    Then no suggestion card should be created
    And the engine should log the empty response for debugging
    And the next cycle should proceed normally
```

---

## 7. Session Lifecycle and Resilience

Scenarios covering the full session lifecycle beyond basic start/end,
including crash recovery, concurrent operations, and session history.

```gherkin
Feature: Session Lifecycle and Resilience
  As a Dungeon Master
  I want the app to handle interruptions and edge cases gracefully
  So that I never lose session data during a game

  # --- SESSION LIFECYCLE ---

  Scenario: Starting a session increments the session number
    Given the campaign "Curse of the Hollow King" has 7 completed sessions
    When the DM starts a new session
    Then the session number should be 8
    And the session should be associated with this campaign

  Scenario: Session timer tracks elapsed time accurately
    Given the DM starts a session at 7:00 PM
    When 90 minutes have elapsed
    Then the status bar timer should display "01:30:00"
    And the timer should not drift more than 5 seconds over 4 hours

  Scenario: Ending a session persists all data
    Given the session has been running with transcript and suggestions
    When the DM clicks "End Session"
    Then the session end time should be recorded
    And the transcript JSONL file should be finalized
    And all suggestions should be saved with their timestamps
    And the session should appear in the campaign's session history

  # --- CRASH RECOVERY ---

  Scenario: App crash preserves transcript data
    Given the session has been active for 2 hours
    And the transcript contains 500+ entries
    When the app crashes unexpectedly
    And the DM relaunches the app
    Then the app should detect an unfinished session
    And offer to recover: "A previous session was not properly ended. Recover data?"
    When the DM clicks "Recover"
    Then the transcript should be restored from the JSONL file
    And suggestions generated before the crash should be available

  Scenario: Recovered session can be exported
    Given the DM has recovered a crashed session
    When the DM clicks "Export Session"
    Then the export should include all recovered data
    And a note should indicate "Session recovered — some data may be incomplete"

  Scenario: DM declines recovery and starts fresh
    Given the app detects an unfinished session
    When the DM clicks "Discard and Start Fresh"
    Then the incomplete session data should be archived (not deleted)
    And a new session should begin normally

  # --- CONCURRENT OPERATIONS ---

  Scenario: Panic button pressed during active suggestion cycle
    Given a suggestion cycle is currently in progress
    When the DM clicks the "Need an NPC" panic button
    Then the panic button response should be generated immediately
    And it should NOT wait for the suggestion cycle to complete
    And both results should display without conflict
    And the panic response should appear with higher visual priority

  Scenario: Ad-hoc question submitted during suggestion cycle
    Given a suggestion cycle is currently in progress
    When the DM submits an ad-hoc question
    Then the question should be sent to the LLM immediately
    And it should NOT queue behind the suggestion cycle
    And the answer should appear in the panel marked as a Q&A response

  Scenario: Multiple panic buttons pressed in quick succession
    When the DM clicks "Phones Out" and then "Need an NPC" within 2 seconds
    Then both responses should be generated
    And both suggestion cards should appear in the panel
    And they should not overwrite each other

  # --- SESSION HISTORY ---

  Scenario: DM views session history for a campaign
    Given the campaign has 7 completed sessions
    When the DM opens the session history
    Then all 7 sessions should be listed with:
      | field          |
      | Session number |
      | Date           |
      | Duration       |
      | Summary        |
    And sessions should be ordered most recent first

  Scenario: DM views a past session's transcript
    Given session 5 has a stored transcript
    When the DM clicks on session 5 in the history
    Then the transcript should be displayed in read-only mode
    And suggestions from that session should be viewable
```

---

## 8. Security and Privacy

Scenarios ensuring API keys are protected, data stays local when
expected, and the DM's privacy choices are respected.

```gherkin
Feature: Security and Privacy
  As a Dungeon Master
  I want my API key and session data protected
  So that I can trust the app with my information

  # --- API KEY SECURITY ---

  Scenario: API key stored in OS keychain
    When the DM saves an Anthropic API key in settings
    Then the key should be stored in the OS credential manager
      (macOS Keychain, Windows Credential Manager, or Linux Secret Service)
    And the key should NOT be stored in plaintext in SQLite or config files

  Scenario: API key masked in settings UI
    Given the DM has a stored API key
    When the DM opens AI Engine Settings
    Then the API key field should display masked characters (e.g., "sk-ant-***...***")
    And a "Show" button should allow temporary reveal

  Scenario: API key excluded from logs
    Given the DM is using Claude mode
    When the app logs API interactions for debugging
    Then the API key should never appear in log files
    And request headers should be redacted in any logged output

  Scenario: API key excluded from exports
    Given the DM is using Claude mode
    When the DM exports a session as Markdown or JSON
    Then the exported file should NOT contain the API key
    And provider metadata should only show "Claude" (not the key)

  # --- DATA LOCALITY ---

  Scenario: Local mode sends no data externally
    Given the DM is using the local provider (Ollama)
    When the session is active with transcription and suggestions running
    Then no HTTP requests should be made to external servers
    And all processing should occur on localhost

  Scenario: Claude mode only sends transcript and context
    Given the DM is using Claude mode
    When a suggestion cycle runs
    Then the API request should contain only:
      | data                    |
      | Campaign context text   |
      | Character backstories   |
      | Recent transcript text  |
      | Suggestion prompt       |
    And the request should NOT contain:
      | excluded data           |
      | Raw audio               |
      | API key in the body     |
      | Other campaign data     |
      | System information      |

  Scenario: Switching to local mode stops all external calls
    Given the DM was using Claude mode
    When the DM switches to local mode
    Then all pending Anthropic API calls should be cancelled
    And no further external requests should be made
    And the change should take effect immediately

  # --- AUDIO PRIVACY ---

  Scenario: Audio never leaves the machine
    Given whisper.cpp is processing microphone input
    Then raw audio data should only exist in local memory
    And no audio file should be written to disk unless the DM explicitly enables recording
    And no audio should be transmitted to any external service
    And only the text transcript should be available to the LLM provider
```

---

## 9. Settings UI

Behavioral specification for the settings panels covering LLM,
audio, music, and suggestion engine configuration.

```gherkin
Feature: Settings UI
  As a Dungeon Master
  I want to configure the app's behavior
  So that it suits my hardware, preferences, and play style

  # --- SUGGESTION ENGINE SETTINGS ---

  Scenario: DM adjusts suggestion cycle interval
    When the DM changes the suggestion cycle interval from 45 to 60 seconds
    And clicks "Save"
    Then the suggestion engine should use the new 60-second interval
    And the change should take effect on the next cycle (not mid-cycle)

  Scenario: Suggestion cycle interval has valid range
    When the DM attempts to set the interval below 15 seconds
    Then the input should be rejected with: "Minimum interval is 15 seconds"
    When the DM attempts to set the interval above 120 seconds
    Then the input should be rejected with: "Maximum interval is 120 seconds"

  Scenario: DM adjusts max suggestion length
    When the DM changes max suggestion length from 100 to 150 words
    And clicks "Save"
    Then the prompt template should instruct the LLM to stay within 150 words

  Scenario: DM adjusts temperature / creativity
    When the DM changes temperature from 0.7 to 0.9
    And clicks "Save"
    Then the LLM provider should use temperature 0.9 for subsequent requests
    And a tooltip should explain: "Higher values produce more creative but less predictable suggestions"

  # --- SETTINGS PERSISTENCE ---

  Scenario: Settings persist across app restarts
    Given the DM has configured:
      | setting            | value         |
      | Provider           | Claude        |
      | Cycle interval     | 60 seconds    |
      | Temperature        | 0.8           |
      | Music source       | Local Folders |
    When the app is closed and relaunched
    Then all settings should retain their configured values

  Scenario: Reset to defaults
    Given the DM has customized several settings
    When the DM clicks "Reset to Defaults"
    Then a confirmation should appear
    When confirmed
    Then all settings should return to their default values
    And the API key should NOT be cleared (it's separate from defaults)

  # --- AUDIO SETTINGS ---

  Scenario: DM changes microphone input device
    Given the session is not active
    When the DM selects a different microphone in audio settings
    And clicks "Save"
    Then the next session should use the newly selected microphone

  Scenario: Audio device change during active session
    Given a session is active
    When the DM changes the audio output device
    Then a warning should appear: "Changing audio devices during an active session may cause a brief interruption"
    When confirmed
    Then the music output should switch to the new device

  # --- WHISPER MODEL SETTINGS ---

  Scenario: DM switches whisper model
    Given the DM is using ggml-small.en
    When the DM selects ggml-medium.en in settings
    And the model is not yet downloaded
    Then a download should begin for the new model
    And the current model should remain active until the download completes
    When the download finishes
    Then the new model should be used for the next session
```

---

## 10. MCP Server

Behavioral scenarios for the free companion MCP server that
connects campaign data to Claude Desktop for session prep.

```gherkin
Feature: MCP Server Companion
  As a Dungeon Master using Claude Desktop
  I want the MCP server to connect Claude to my campaign database
  So that I can prep sessions and manage my campaign with full context

  # --- DATABASE DISCOVERY ---

  Scenario: MCP server discovers app database via environment variable
    Given the DM_ASSISTANT_DB environment variable is set to "/path/to/campaigns.db"
    When the MCP server starts
    Then it should connect to the database at the specified path
    And resources should return data from that database

  Scenario: MCP server discovers app database at default platform path
    Given no DM_ASSISTANT_DB environment variable is set
    And the DM Assistant app has been used (database exists at default path)
    When the MCP server starts
    Then it should find and connect to the database at the default platform path

  Scenario: MCP server starts in standalone mode
    Given no environment variable is set
    And no database exists at the default path
    When the MCP server starts
    Then it should create a new database in standalone mode
    And a message should indicate standalone operation
    And all tools and resources should function with the new database

  # --- RESOURCES (READ OPERATIONS) ---

  Scenario: List campaigns returns all campaigns
    Given the database contains campaigns "Curse of the Hollow King" and "Sunken Isles"
    When Claude requests the campaign://list resource
    Then it should receive JSON with both campaigns
    And each entry should include id, name, system, and updated_at

  Scenario: Get campaign characters returns backstories
    Given the campaign has characters Vex, Drogan, and Sable
    When Claude requests the campaign://{id}/characters resource
    Then it should receive JSON with all three characters
    And each entry should include backstory, bonds, flaws, and goals

  Scenario: Get session transcript returns full text
    Given session 7 has a stored transcript
    When Claude requests the session://{id}/transcript resource
    Then it should receive the full JSONL transcript content

  Scenario: Request for nonexistent campaign returns error
    When Claude requests campaign://nonexistent-id/context
    Then it should receive a JSON error: "Campaign not found"
    And the server should not crash

  # --- TOOLS (WRITE OPERATIONS) ---

  Scenario: Add NPC via MCP tool
    When Claude calls add_npc with name "Ghost Knight" and description "Spectral guardian"
    Then the NPC should be inserted into the database
    And a confirmation should be returned with the new NPC's ID
    And the NPC should be visible in the app on next launch

  Scenario: Resolve plot hook via MCP tool
    Given an unresolved plot hook exists with a known ID
    When Claude calls resolve_plot_hook with a resolution description
    Then the hook status should change to "resolved"
    And the resolution text should be stored

  Scenario: Update character backstory via MCP tool
    When Claude calls update_character_backstory with new goals text
    Then the character's goals should be updated in the database
    And the change should be reflected in the app's next session

  # --- CONCURRENT ACCESS ---

  Scenario: MCP server reads while app is writing
    Given the DM Assistant app is running an active session
    And the MCP server is also connected to the same database
    When Claude requests campaign resources via MCP
    Then the read should succeed without blocking the app
    And the data should be consistent (no partial writes visible)

  Scenario: MCP server writes while app is idle
    Given the app is not running
    When Claude adds an NPC via the MCP server
    Then the write should succeed
    And the NPC should be visible when the app is next launched

  # --- PROMPTS ---

  Scenario: Session prep prompt loads correct resources
    When the DM invokes the session_prep prompt for a campaign
    Then Claude should be instructed to read:
      | resource              |
      | Campaign context      |
      | Characters            |
      | NPCs                  |
      | Plot hooks            |
      | Recent sessions       |
    And Claude should produce a structured prep sheet

  Scenario: Post-session review processes transcript
    When the DM invokes the post_session_review prompt for a session
    Then Claude should be instructed to read the session transcript
    And Claude should be able to use tools to:
      | action                     |
      | Add new NPCs               |
      | Create plot hooks           |
      | Resolve existing hooks      |
      | Save a session summary      |
```

---

## Scenario Summary

| Gap Area                      | Scenarios | Priority |
|-------------------------------|-----------|----------|
| LLM Provider Management      | 17        | Critical |
| Campaign Data Persistence     | 14        | High     |
| First-Run Wizard              | 10        | High     |
| Transcript Manager Internals  | 8         | Medium   |
| Entity Cooldown & Dedup       | 8         | Medium   |
| Suggestion Response Parsing   | 9         | Medium   |
| Session Lifecycle & Resilience| 12        | Medium   |
| Security & Privacy            | 8         | High     |
| Settings UI                   | 9         | Medium   |
| MCP Server                    | 13        | Medium   |
| **Total**                     | **108**   |          |

Combined with the existing 150+ scenarios from specs 01-06, this brings
total BDD coverage to approximately **260 scenarios** across all features.
